"""
OCR 전처리용 경량 U-Net(OcrRestoreNet) 학습 스크립트.

합성 문서(synth_document.generate_score_report)를 target(clean)으로 삼고,
degrade.random_degrade로 만든 열화 이미지를 input으로 삼아 (input -> target)
복원을 학습한다. 실제 학생 성적표 원본은 개인정보라 학습 데이터로 쓰지 않는다
(degrade.py 상단 설명 참고).

실행 예:
    PYTHONPATH=. python3 ai/train.py                      # config.py 기본값으로 전체 학습
    PYTHONPATH=. python3 ai/train.py --smoke               # 매우 짧은 스모크 테스트
    PYTHONPATH=. python3 ai/train.py --epochs 5 --steps-per-epoch 20

체크포인트:
    checkpoints/last.pt  (매 epoch)
    checkpoints/best.pt  (검증 손실 최소 시점)
"""

from __future__ import annotations

import argparse
import time

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

from ai.config import (
    BASE_CHANNELS,
    BATCH_SIZE,
    BEST_CHECKPOINT_PATH,
    CHECKPOINT_DIR,
    DEGRADE_MAX_OPS,
    DEGRADE_MIN_OPS,
    EDGE_WEIGHT,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    L1_WEIGHT,
    LAST_CHECKPOINT_PATH,
    LEARNING_RATE,
    NUM_BLOCKS,
    NUM_EPOCHS,
    NUM_WORKERS,
    RANDOM_SEED,
    SAMPLES_DIR,
    SSIM_WEIGHT,
    STEPS_PER_EPOCH,
    VAL_STEPS,
)
from ai.degrade import random_degrade
from ai.losses import OcrRestoreLoss
from ai.model import OcrRestoreNet
from ai.synth_document import generate_score_report


def _bgr_uint8_to_tensor(img_bgr: np.ndarray) -> torch.Tensor:
    """(H, W, 3) BGR uint8 -> (3, H, W) float32 [0, 1] RGB 텐서."""
    rgb = img_bgr[:, :, ::-1].astype(np.float32) / 255.0
    return torch.from_numpy(np.ascontiguousarray(np.transpose(rgb, (2, 0, 1))))


class SyntheticDocumentDataset(Dataset):
    """매 __getitem__ 호출마다 새 합성 문서를 생성하고 무작위로 열화시키는 무한 데이터셋.

    실제 파일을 디스크에 쌓아두지 않고 즉석에서 생성하므로 데이터 준비 단계가 없다.
    epoch 개념을 맞추기 위해 steps_per_epoch를 길이로 사용한다.
    """

    def __init__(self, steps_per_epoch: int, seed_offset: int = 0):
        self.steps_per_epoch = steps_per_epoch
        self.seed_offset = seed_offset

    def __len__(self) -> int:
        return self.steps_per_epoch

    def __getitem__(self, idx: int):
        # 워커/에폭에 상관없이 재현 가능하되 서로 다른 샘플이 나오도록 seed 조합.
        seed = self.seed_offset * 100_000 + idx
        clean = generate_score_report(width=IMAGE_WIDTH, height=IMAGE_HEIGHT, seed=seed)
        degraded = random_degrade(
            clean, min_ops=DEGRADE_MIN_OPS, max_ops=DEGRADE_MAX_OPS
        )
        return _bgr_uint8_to_tensor(degraded), _bgr_uint8_to_tensor(clean)


def _save_checkpoint(path, model: OcrRestoreNet, epoch: int, val_loss: float) -> None:
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model": model.state_dict(),
            "base_channels": BASE_CHANNELS,
            "num_blocks": NUM_BLOCKS,
            "epoch": epoch,
            "val_loss": val_loss,
        },
        path,
    )


def _save_sample_triplet(model: OcrRestoreNet, device: torch.device, epoch: int) -> None:
    """clean/degraded/restored 샘플 3장을 저장해 육안 확인용으로 남긴다."""
    import cv2

    clean = generate_score_report(width=IMAGE_WIDTH, height=IMAGE_HEIGHT, seed=999_999)
    degraded = random_degrade(clean, min_ops=DEGRADE_MIN_OPS, max_ops=DEGRADE_MAX_OPS)

    model.eval()
    with torch.no_grad():
        inp = _bgr_uint8_to_tensor(degraded).unsqueeze(0).to(device)
        out = model(inp)[0].clamp(0, 1).cpu().numpy()
    restored = (np.transpose(out, (1, 2, 0))[:, :, ::-1] * 255.0).astype(np.uint8)

    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(SAMPLES_DIR / "clean_sample.png"), clean)
    cv2.imwrite(str(SAMPLES_DIR / "degraded_sample.png"), degraded)
    cv2.imwrite(str(SAMPLES_DIR / "restored_sample.png"), restored)


def train(
    num_epochs: int = NUM_EPOCHS,
    steps_per_epoch: int = STEPS_PER_EPOCH,
    val_steps: int = VAL_STEPS,
    batch_size: int = BATCH_SIZE,
) -> dict:
    torch.manual_seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = OcrRestoreNet(base_channels=BASE_CHANNELS, num_blocks=NUM_BLOCKS).to(device)
    loss_fn = OcrRestoreLoss(
        l1_weight=L1_WEIGHT, ssim_weight=SSIM_WEIGHT, edge_weight=EDGE_WEIGHT
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)

    train_ds = SyntheticDocumentDataset(steps_per_epoch, seed_offset=0)
    val_ds = SyntheticDocumentDataset(val_steps, seed_offset=1)
    train_loader = DataLoader(
        train_ds, batch_size=batch_size, shuffle=False, num_workers=NUM_WORKERS
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size, shuffle=False, num_workers=NUM_WORKERS
    )

    best_val_loss = float("inf")
    history = []

    for epoch in range(1, num_epochs + 1):
        model.train()
        epoch_start = time.time()
        train_loss_sum = 0.0
        n_batches = 0

        for degraded, clean in train_loader:
            degraded, clean = degraded.to(device), clean.to(device)
            optimizer.zero_grad()
            pred = model(degraded)
            losses = loss_fn(pred, clean)
            losses["total"].backward()
            optimizer.step()
            train_loss_sum += losses["total"].item()
            n_batches += 1

        train_loss = train_loss_sum / max(1, n_batches)

        model.eval()
        val_loss_sum = 0.0
        n_val_batches = 0
        with torch.no_grad():
            for degraded, clean in val_loader:
                degraded, clean = degraded.to(device), clean.to(device)
                pred = model(degraded)
                losses = loss_fn(pred, clean)
                val_loss_sum += losses["total"].item()
                n_val_batches += 1
        val_loss = val_loss_sum / max(1, n_val_batches)

        elapsed = time.time() - epoch_start
        print(
            f"[epoch {epoch}/{num_epochs}] "
            f"train_loss={train_loss:.4f} val_loss={val_loss:.4f} ({elapsed:.1f}s)"
        )
        history.append({"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss})

        _save_checkpoint(LAST_CHECKPOINT_PATH, model, epoch, val_loss)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            _save_checkpoint(BEST_CHECKPOINT_PATH, model, epoch, val_loss)

    _save_sample_triplet(model, device, num_epochs)

    return {"history": history, "best_val_loss": best_val_loss, "device": str(device)}


def parse_args():
    p = argparse.ArgumentParser(description="OCR 복원 U-Net 학습")
    p.add_argument("--epochs", type=int, default=NUM_EPOCHS)
    p.add_argument("--steps-per-epoch", type=int, default=STEPS_PER_EPOCH)
    p.add_argument("--val-steps", type=int, default=VAL_STEPS)
    p.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    p.add_argument(
        "--smoke",
        action="store_true",
        help="1 epoch, 소수 step으로 아주 짧게 돌려 파이프라인 동작만 확인 (실전 학습용 아님)",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.smoke:
        result = train(num_epochs=1, steps_per_epoch=2, val_steps=1, batch_size=1)
    else:
        result = train(
            num_epochs=args.epochs,
            steps_per_epoch=args.steps_per_epoch,
            val_steps=args.val_steps,
            batch_size=args.batch_size,
        )
    print("학습 완료. best_val_loss =", result["best_val_loss"], "device =", result["device"])

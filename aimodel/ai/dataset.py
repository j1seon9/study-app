"""
학습용 Dataset.

두 종류의 clean 소스를 섞어서 쓴다:
1) synth_document.generate_score_report() -- 무한히 생성 가능한 합성 성적표
2) data/clean/ 폴더에 사용자가 직접 넣은 실제 스캔본/깨끗한 사진
   (실제 학생 정보가 없는, 예시/샘플/본인 성적표 등 개인정보 이슈 없는 것만 권장)

각 __getitem__ 호출마다:
  clean 이미지를 하나 얻는다 -> random crop -> degrade.random_degrade()로 input 생성
  -> (input, clean) 텐서 쌍 반환.

매 스텝마다 새로 열화하므로 사실상 무한한 데이터 증강 효과가 있다.
"""

from __future__ import annotations

import random
from pathlib import Path

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

from ai.config import CLEAN_DIR, PATCH_SIZE
from ai.degrade import random_degrade
from ai.synth_document import generate_score_report

IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}


def _list_clean_images(clean_dir: Path) -> list[Path]:
    if not clean_dir.exists():
        return []
    return [p for p in clean_dir.iterdir() if p.suffix.lower() in IMG_EXTS]


def _random_crop(img: np.ndarray, size: int) -> np.ndarray:
    h, w = img.shape[:2]
    if h < size or w < size:
        scale = size / min(h, w) * 1.05
        img = cv2.resize(img, (int(w * scale) + 1, int(h * scale) + 1))
        h, w = img.shape[:2]
    y = random.randint(0, h - size)
    x = random.randint(0, w - size)
    return img[y : y + size, x : x + size]


class OcrRestoreDataset(Dataset):
    def __init__(
        self,
        patch_size: int = PATCH_SIZE,
        length: int = 2000,
        synth_ratio: float = 0.6,
        clean_dir: Path = CLEAN_DIR,
    ):
        """
        patch_size: 학습 crop 크기
        length: 1 epoch로 취급할 샘플 수 (합성 데이터라 실제 파일 수와 무관하게 임의 설정)
        synth_ratio: 합성 문서 vs 실제 clean_dir 이미지의 사용 비율 (실제 이미지가 없으면 항상 합성 사용)
        """
        self.patch_size = patch_size
        self.length = length
        self.synth_ratio = synth_ratio
        self.real_images = _list_clean_images(clean_dir)

    def __len__(self) -> int:
        return self.length

    def _get_clean(self) -> np.ndarray:
        use_real = self.real_images and random.random() > self.synth_ratio
        if use_real:
            path = random.choice(self.real_images)
            img = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if img is not None:
                return img
        # 합성 문서 (해상도는 patch_size보다 넉넉하게)
        return generate_score_report(
            width=random.randint(self.patch_size + 200, self.patch_size + 600),
            height=random.randint(self.patch_size + 300, self.patch_size + 800),
        )

    def __getitem__(self, idx: int):
        clean_full = self._get_clean()
        clean = _random_crop(clean_full, self.patch_size)
        degraded = random_degrade(clean)

        clean_t = torch.from_numpy(clean[:, :, ::-1].copy()).permute(2, 0, 1).float() / 255.0
        degraded_t = torch.from_numpy(degraded[:, :, ::-1].copy()).permute(2, 0, 1).float() / 255.0
        return degraded_t, clean_t


if __name__ == "__main__":
    ds = OcrRestoreDataset(length=4)
    x, y = ds[0]
    print("input:", x.shape, x.dtype, x.min().item(), x.max().item())
    print("target:", y.shape, y.dtype)

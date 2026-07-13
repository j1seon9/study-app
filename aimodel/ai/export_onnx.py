"""
학습된 체크포인트를 ONNX로 변환한다.

실행 예:
    PYTHONPATH=. python3 ai/export_onnx.py --checkpoint checkpoints/best.pt

브라우저(ONNX Runtime Web)와 서버(FastAPI + onnxruntime) 양쪽에서
동일한 .onnx 파일을 그대로 쓸 수 있다.
동적 H/W를 지원하도록 dynamic_axes를 지정한다 (사진마다 해상도가 다르므로).
"""

from __future__ import annotations

import argparse

import torch

from ai.config import ONNX_DIR
from ai.model import OcrRestoreNet


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", type=str, required=True)
    p.add_argument("--output", type=str, default=str(ONNX_DIR / "ocr_restore.onnx"))
    p.add_argument("--opset", type=int, default=18)  # opset 17 이하는 Split(num_outputs) 미지원으로 로드 실패
    return p.parse_args()


def main():
    args = parse_args()
    state = torch.load(args.checkpoint, map_location="cpu")
    base_channels = state.get("base_channels", 24)

    model = OcrRestoreNet(base_channels=base_channels)
    model.load_state_dict(state["model"])
    model.eval()

    dummy = torch.rand(1, 3, 256, 256)

    ONNX_DIR.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        args.output,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {2: "height", 3: "width"},
            "output": {2: "height", 3: "width"},
        },
        opset_version=args.opset,
    )
    print(f"ONNX 저장 완료: {args.output}")


if __name__ == "__main__":
    main()

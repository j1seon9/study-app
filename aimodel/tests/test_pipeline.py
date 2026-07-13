"""
핵심 컴포넌트에 대한 스모크 테스트.
실행: PYTHONPATH=. pytest tests/ -v
"""

import numpy as np
import torch

from ai.degrade import random_degrade
from ai.losses import OcrRestoreLoss
from ai.model import OcrRestoreNet
from ai.synth_document import generate_score_report


def test_model_output_shape_and_range():
    model = OcrRestoreNet(base_channels=8)
    x = torch.rand(1, 3, 130, 90)  # 8의 배수가 아닌 크기
    out = model(x)
    assert out.shape == x.shape
    assert out.min() >= 0.0 and out.max() <= 1.0


def test_loss_zero_for_identical_images():
    loss_fn = OcrRestoreLoss()
    x = torch.rand(1, 3, 64, 64)
    losses = loss_fn(x, x)
    assert losses["total"].item() < 1e-5


def test_synth_document_generates_valid_image():
    doc = generate_score_report(width=400, height=500, seed=0)
    assert doc.shape == (500, 400, 3)
    assert doc.dtype == np.uint8


def test_degrade_preserves_shape():
    doc = generate_score_report(width=300, height=400, seed=1)
    degraded = random_degrade(doc)
    assert degraded.shape == doc.shape
    assert degraded.dtype == np.uint8


def test_api_restore_endpoint(tmp_path):
    import cv2
    from fastapi.testclient import TestClient

    from ai.api import app

    # onnx 파일이 없으면 스킵 (학습/변환 전 CI 등에서)
    from ai.config import ONNX_DIR

    onnx_path = ONNX_DIR / "ocr_restore.onnx"
    if not onnx_path.exists():
        import pytest

        pytest.skip("onnx 모델이 아직 없습니다. export_onnx.py를 먼저 실행하세요.")

    doc = generate_score_report(width=256, height=256, seed=2)
    img_path = tmp_path / "sample.png"
    cv2.imwrite(str(img_path), doc)

    client = TestClient(app)
    with open(img_path, "rb") as f:
        resp = client.post("/restore", files={"file": ("sample.png", f, "image/png")})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"

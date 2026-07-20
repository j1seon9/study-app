"""
ONNX 모델을 이용한 추론 유틸리티.

FastAPI 엔드포인트(api.py)와 CLI 양쪽에서 이 모듈의 restore_image()를 재사용한다.
onnxruntime만 있으면 되므로 서버에 PyTorch를 설치할 필요가 없다 (배포 용량 절감).
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

_SESSION_CACHE: dict[str, ort.InferenceSession] = {}

MAX_DIMENSION = 2000  # client의 imagePreprocess.js와 동일한 기준으로 맞춤


def _get_session(onnx_path: str) -> ort.InferenceSession:
    if onnx_path not in _SESSION_CACHE:
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = max(1, (ort.get_device() == "CPU") and 2 or 1)
        _SESSION_CACHE[onnx_path] = ort.InferenceSession(
            onnx_path, sess_options=sess_options, providers=["CPUExecutionProvider"]
        )
    return _SESSION_CACHE[onnx_path]


def _resize_if_needed(img_bgr: np.ndarray, max_dim: int = MAX_DIMENSION) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    if max(h, w) <= max_dim:
        return img_bgr
    scale = max_dim / max(h, w)
    return cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _pad_to_multiple(img_bgr: np.ndarray, multiple: int = 8) -> tuple[np.ndarray, int, int]:
    h, w = img_bgr.shape[:2]
    pad_h = (-h) % multiple
    pad_w = (-w) % multiple
    if pad_h or pad_w:
        img_bgr = cv2.copyMakeBorder(img_bgr, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)
    return img_bgr, h, w


def _enhance_for_ocr(img_bgr: np.ndarray) -> np.ndarray:
    """모델 출력이 연한 회색 텍스트로 나오는 경향(L1 loss의 전형적인 부작용)을
    후처리로 보정한다. 퍼센타일 기반 전역 명암 스트레칭만 사용한다 — CLAHE는
    이런 여백 많은 문서 이미지에서 구간이 과도하게 좁아져 전체가 까맣게 뭉개지는
    문제가 있어서 제외했다.

    실제 명암차가 작아도(예: 배경 250 vs 텍스트 225, 차이 25) 항상 어느 정도는
    보정을 적용하되, 구간에 최소값(RANGE_FLOOR)을 둬서 과도한 배율 증폭으로
    이미지 전체가 까맣게/하얗게 뭉개지는 걸 방지한다.
    """
    RANGE_FLOOR = 35

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    lo, hi = (float(v) for v in np.percentile(gray, (5, 99)))
    mid = (lo + hi) / 2.0
    half_range = max((hi - lo) / 2.0, RANGE_FLOOR / 2.0)
    lo, hi = mid - half_range, mid + half_range

    stretched = np.clip((gray.astype(np.float32) - lo) * (255.0 / (hi - lo)), 0, 255).astype(np.uint8)

    mean_val = float(stretched.mean())
    if mean_val < 15 or mean_val > 253:  # 정말 비정상적인 경우에만 원본으로 안전 복귀
        return img_bgr

    return cv2.cvtColor(stretched, cv2.COLOR_GRAY2BGR)


def restore_image(img_bgr: np.ndarray, onnx_path: str, enhance: bool = True) -> np.ndarray:
    """
    성적표 사진(BGR uint8) 한 장을 받아 OCR에 최적화된 이미지를 반환한다 (BGR uint8, 동일 해상도).
    enhance=True(기본값)면 모델 출력에 대비 보정 후처리를 적용한다.
    """
    session = _get_session(onnx_path)

    original = _resize_if_needed(img_bgr)
    padded, orig_h, orig_w = _pad_to_multiple(original)

    rgb = padded[:, :, ::-1].astype(np.float32) / 255.0
    tensor = np.transpose(rgb, (2, 0, 1))[None, ...].astype(np.float32)

    output = session.run(None, {"input": tensor})[0]
    output = np.clip(output[0], 0, 1)
    output_bgr = (np.transpose(output, (1, 2, 0))[:, :, ::-1] * 255.0).astype(np.uint8)
    output_bgr = output_bgr[:orig_h, :orig_w]

    if enhance:
        output_bgr = _enhance_for_ocr(output_bgr)

    return output_bgr


def restore_file(input_path: str, output_path: str, onnx_path: str, enhance: bool = True) -> None:
    img = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"이미지를 읽을 수 없습니다: {input_path}")
    result = restore_image(img, onnx_path, enhance=enhance)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(output_path, result)


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--onnx", default="onnx/ocr_restore.onnx")
    p.add_argument(
        "--no-enhance",
        action="store_true",
        help="대비 보정 후처리를 끄고 모델 원본 출력만 저장",
    )
    args = p.parse_args()

    restore_file(args.input, args.output, args.onnx, enhance=not args.no_enhance)
    print(f"저장 완료: {args.output}")

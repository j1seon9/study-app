"""OCR 이미지 복원 모델용 FastAPI 배포 서버.

aimodel/ai/api.py와 완전히 별개의 서비스다 (다른 포트, 다른 API 키 환경변수).
PyTorch는 필요 없고 onnxruntime만으로 추론하므로 requirements-serve.txt만
설치하면 된다 (torch/opencv-학습용 패키지는 학습 시에만 필요).

로컬 실행:
    PYTHONPATH=. uvicorn ai.api:app --host 0.0.0.0 --port 8100

Express에서 호출 예시:
    POST http://localhost:8100/api/restore
    Headers: X-API-Key: <OCR_RESTORE_API_KEY>
    Body: multipart/form-data, field name "file" (이미지 파일)
    Response: image/png (복원된 이미지 바이너리)
"""

from __future__ import annotations

import io

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from ai.config import (
    API_KEY,
    API_KEY_HEADER,
    CORS_ORIGINS,
    MAX_UPLOAD_BYTES,
    MODEL_VERSION,
    ONNX_MODEL_PATH,
)
from ai.infer import restore_image

app = FastAPI(
    title="OCR Restore API",
    description="스마트폰으로 찍은 성적표 사진을 OCR에 유리하게 복원하는 경량 U-Net 모델 서빙 API.",
    version=MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER)
) -> None:
    """OCR_RESTORE_API_KEY 환경변수가 설정된 경우에만 헤더 검증을 강제한다.

    비어 있으면(로컬 개발 기본값) 검증을 건너뛴다.
    """

    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API Key입니다.",
        )


class HealthResponse(BaseModel):
    status: str
    model_version: str
    onnx_model_exists: bool


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_version=MODEL_VERSION,
        onnx_model_exists=ONNX_MODEL_PATH.exists(),
    )


@app.post(
    "/api/restore",
    dependencies=[Depends(require_api_key)],
    responses={200: {"content": {"image/png": {}}}},
)
async def restore(file: UploadFile = File(...)) -> Response:
    if not ONNX_MODEL_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ONNX 모델이 없습니다. export_onnx.py로 먼저 변환하세요.",
        )

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일이 너무 큽니다 (최대 {MAX_UPLOAD_BYTES // (1024 * 1024)}MB).",
        )

    img_array = np.frombuffer(raw, dtype=np.uint8)
    img_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지를 디코딩할 수 없습니다. 지원되는 이미지 파일인지 확인하세요.",
        )

    restored_bgr = restore_image(img_bgr, str(ONNX_MODEL_PATH))

    ok, encoded = cv2.imencode(".png", restored_bgr)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="복원된 이미지 인코딩에 실패했습니다.",
        )

    return Response(content=io.BytesIO(encoded.tobytes()).getvalue(), media_type="image/png")

# OCR 복원 모델 배포용 이미지. torch 없이 onnxruntime만 포함 (경량).
FROM python:3.11-slim

WORKDIR /app

# opencv-python-headless가 필요로 하는 최소 시스템 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-serve.txt .
RUN pip install --no-cache-dir -r requirements-serve.txt

# 코드와 학습된 ONNX 모델만 포함 (checkpoints/*.pt, data/, tests/는 서빙에 불필요)
COPY ai ./ai
COPY onnx ./onnx

ENV PYTHONPATH=/app
EXPOSE 8100

CMD ["uvicorn", "ai.api:app", "--host", "0.0.0.0", "--port", "8100"]

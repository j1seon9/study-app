# OCR 성적표 사진 복원 모델 (ocr-preprocess-ai)

스마트폰으로 대충 찍은 성적표 사진(그림자·블러·원근왜곡)의 OCR 인식률을 높이기 위한
경량 U-Net 기반 이미지 복원 모델. `study-app` 클라이언트의 기존 Canvas 전처리
앞단에서 사용하도록 설계됐다. `aimodel`(추천 엔진)과는 완전히 독립된 프로젝트다.
전체 구조는 [루트 README](../README.md) 참고.

## 폴더 구조

```text
ai/
  __init__.py
  api.py             # 배포용 FastAPI 서버 (POST /api/restore)
  config.py
  degrade.py          # 열화 시뮬레이터 (블러/그림자/노이즈/원근/JPEG압축)
  export_onnx.py       # PyTorch 체크포인트 → ONNX 변환
  infer.py             # ONNX 추론 유틸 (api.py, CLI 양쪽에서 재사용)
  losses.py            # L1 + SSIM + Edge 손실함수
  model.py             # 경량 U-Net (OcrRestoreNet)
  synth_document.py    # 학평 성적표 양식을 재현한 합성 학습데이터 생성기
  train.py             # 학습 스크립트
web/
  ocrRestoreModel.js    # 브라우저(ONNX Runtime Web) 연동 예제
checkpoints/            # 학습된 .pt (best.pt, last.pt) — git에는 미포함
onnx/                   # 배포용 .onnx 모델
data/
  clean/                # (비어있음, 필요 시 캐시용)
  samples/               # 육안 확인용 clean/degraded/restored 샘플
requirements.txt         # 학습용 (torch 포함)
requirements-serve.txt   # 배포용 (torch 불필요, onnxruntime만)
Dockerfile
```

## 설계 트레이드오프

Restormer/SwinIR 대신 경량 U-Net을 채택했다 (CPU 1초 이내 추론 제약 때문).
Perceptual(VGG) Loss는 제외했다 (오프라인 리스크 + 문서 이미지엔 효과가 적어서).
학습 데이터는 실제 학생 성적표를 쓰지 않고 `synth_document.py`로 합성한다
(개인정보 보호).

## 학습

```powershell
python -m venv venv
venv\Scripts\pip install -r requirements.txt

$env:PYTHONPATH = "."
venv\Scripts\python ai\train.py --smoke     # 파이프라인 동작 확인용 (1 epoch, 2 step)
venv\Scripts\python ai\train.py             # 본 학습 (기본 30 epoch)
venv\Scripts\python ai\export_onnx.py --checkpoint checkpoints\best.pt
```

## 배포 (FastAPI 서빙)

torch 없이 onnxruntime만으로 추론하므로 배포 이미지가 가볍다.

```powershell
venv\Scripts\pip install -r requirements-serve.txt
venv\Scripts\python -m uvicorn ai.api:app --host 0.0.0.0 --port 8100
```

또는 Docker:

```bash
docker build -t ocr-restore-api .
docker run -p 8100:8100 ocr-restore-api
```

`POST /api/restore`에 이미지 파일을 multipart로 업로드하면 복원된 PNG를 반환한다.
`OCR_RESTORE_API_KEY` 환경변수를 설정하면 `X-API-Key` 헤더 검증이 활성화된다
(`aimodel`의 `AI_API_KEY`와는 별개 값).

## 테스트

```powershell
venv\Scripts\python ai\infer.py --input <사진경로> --output restored.png
```

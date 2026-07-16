"""ocr-preprocess-ai 프로젝트 전용 설정.

주의: 이 파일은 aimodel(scikit-learn 추천 엔진)의 ai/config.py와는 완전히 별개다.
두 프로젝트를 같은 폴더에 섞으면 안 되므로, 경로도 항상 이 파일 기준
(PROJECT_ROOT = ocr-preprocess-ai/)으로 계산한다.
"""

from __future__ import annotations

import os
from pathlib import Path

# ocr-preprocess-ai/ 를 프로젝트 루트로 사용 (이 파일 기준 두 단계 위: ai/config.py -> ai/ -> ocr-preprocess-ai/)
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# --- 데이터 경로 ---
DATA_DIR = Path(os.environ.get("OCR_DATA_DIR", str(PROJECT_ROOT / "data")))
CLEAN_DIR = DATA_DIR / "clean"          # synth_document.py로 만든 원본(clean) 이미지 캐시
SAMPLES_DIR = DATA_DIR / "samples"      # 육안 확인용 샘플(clean/degraded/restored)

# --- 모델 산출물 경로 ---
CHECKPOINT_DIR = Path(os.environ.get("OCR_CHECKPOINT_DIR", str(PROJECT_ROOT / "checkpoints")))
BEST_CHECKPOINT_PATH = CHECKPOINT_DIR / "best.pt"
LAST_CHECKPOINT_PATH = CHECKPOINT_DIR / "last.pt"

ONNX_DIR = Path(os.environ.get("OCR_ONNX_DIR", str(PROJECT_ROOT / "onnx")))
ONNX_MODEL_PATH = ONNX_DIR / "ocr_restore.onnx"

# --- 모델 하이퍼파라미터 (model.py의 기본값과 일치시킬 것) ---
BASE_CHANNELS = 24
NUM_BLOCKS = (1, 1, 2)

# --- 학습 설정 ---
RANDOM_SEED = 42
IMAGE_WIDTH = 768
IMAGE_HEIGHT = 1024
BATCH_SIZE = int(os.environ.get("OCR_BATCH_SIZE", "4"))
NUM_EPOCHS = int(os.environ.get("OCR_NUM_EPOCHS", "30"))
STEPS_PER_EPOCH = int(os.environ.get("OCR_STEPS_PER_EPOCH", "50"))
LEARNING_RATE = float(os.environ.get("OCR_LEARNING_RATE", "2e-4"))
VAL_STEPS = int(os.environ.get("OCR_VAL_STEPS", "10"))
NUM_WORKERS = int(os.environ.get("OCR_NUM_WORKERS", "0"))  # Windows 기본값: 0 (spawn 이슈 회피)

# --- 손실함수 가중치 (losses.OcrRestoreLoss와 일치시킬 것) ---
L1_WEIGHT = 1.0
SSIM_WEIGHT = 0.5
EDGE_WEIGHT = 0.5

# --- 열화 시뮬레이터 설정 (degrade.random_degrade와 일치시킬 것) ---
DEGRADE_MIN_OPS = 3
DEGRADE_MAX_OPS = 5

for _dir in (DATA_DIR, CLEAN_DIR, SAMPLES_DIR, CHECKPOINT_DIR, ONNX_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

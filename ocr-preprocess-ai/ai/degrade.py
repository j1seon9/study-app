"""
"깨끗한 문서 이미지" -> "스마트폰으로 대충 찍은 것 같은 이미지" 열화 시뮬레이션.

실제 학생 성적표 원본은 개인정보라 학습 데이터로 쓸 수 없으므로(프로젝트의
privacy-minimized 방침과도 일치), 이 파일은 임의의 깨끗한 문서 이미지에
아래 열화를 인위적으로 합성해 (input=열화, target=원본) 학습쌍을 만드는 데 쓴다.

포함 열화:
- Perspective distortion (기울어진 촬영)
- Motion / Gaussian blur (흔들림, 초점 안 맞음)
- Gaussian / ISO 노이즈
- Shadow (그림자)
- Low contrast / 노출 불균형
- JPEG compression artifact
- Downscale-then-upscale (저해상도 카메라 시뮬레이션)

모든 함수는 uint8 HxWx3 (BGR, OpenCV 컨벤션) numpy 배열을 입력/출력으로 한다.
"""

from __future__ import annotations

import random

import cv2
import numpy as np


def add_perspective_distortion(img: np.ndarray, strength: float = 0.06) -> np.ndarray:
    h, w = img.shape[:2]
    max_shift_x, max_shift_y = w * strength, h * strength
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32(
        [
            [random.uniform(0, max_shift_x), random.uniform(0, max_shift_y)],
            [w - random.uniform(0, max_shift_x), random.uniform(0, max_shift_y)],
            [w - random.uniform(0, max_shift_x), h - random.uniform(0, max_shift_y)],
            [random.uniform(0, max_shift_x), h - random.uniform(0, max_shift_y)],
        ]
    )
    matrix = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(
        img, matrix, (w, h), borderMode=cv2.BORDER_REPLICATE
    )


def add_blur(img: np.ndarray) -> np.ndarray:
    kind = random.choice(["gaussian", "motion", "defocus"])
    if kind == "gaussian":
        k = random.choice([3, 5, 7])
        return cv2.GaussianBlur(img, (k, k), 0)
    if kind == "defocus":
        k = random.choice([5, 7, 9])
        return cv2.blur(img, (k, k))
    # motion blur: 임의 방향 커널
    k = random.choice([7, 9, 11, 13])
    kernel = np.zeros((k, k), dtype=np.float32)
    angle = random.uniform(0, 180)
    kernel[k // 2, :] = 1.0
    m = cv2.getRotationMatrix2D((k / 2, k / 2), angle, 1)
    kernel = cv2.warpAffine(kernel, m, (k, k))
    kernel /= kernel.sum() + 1e-6
    return cv2.filter2D(img, -1, kernel)


def add_noise(img: np.ndarray) -> np.ndarray:
    img_f = img.astype(np.float32)
    sigma = random.uniform(3, 18)
    noise = np.random.normal(0, sigma, img.shape).astype(np.float32)
    out = img_f + noise
    return np.clip(out, 0, 255).astype(np.uint8)


def add_shadow(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    overlay = img.copy()
    n_points = random.randint(3, 5)
    pts = np.array(
        [[random.randint(0, w), random.randint(0, h)] for _ in range(n_points)],
        dtype=np.int32,
    )
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [pts], 255)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=w * 0.05)
    darkness = random.uniform(0.4, 0.75)
    mask_f = (mask.astype(np.float32) / 255.0)[..., None] * (1 - darkness)
    out = overlay.astype(np.float32) * (1 - mask_f)
    return np.clip(out, 0, 255).astype(np.uint8)


def adjust_contrast_brightness(img: np.ndarray) -> np.ndarray:
    alpha = random.uniform(0.55, 1.15)  # contrast
    beta = random.uniform(-40, 40)  # brightness
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)


def jpeg_compress(img: np.ndarray) -> np.ndarray:
    quality = random.randint(35, 80)
    ok, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return img
    return cv2.imdecode(enc, cv2.IMREAD_COLOR)


def downscale_upscale(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    scale = random.uniform(0.35, 0.7)
    small = cv2.resize(
        img, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA
    )
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


DEGRADATIONS = [
    add_perspective_distortion,
    add_blur,
    add_noise,
    add_shadow,
    adjust_contrast_brightness,
    jpeg_compress,
    downscale_upscale,
]


def random_degrade(
    img: np.ndarray, min_ops: int = 3, max_ops: int = 5, always_include=("adjust_contrast_brightness",)
) -> np.ndarray:
    """깨끗한 문서 이미지에 랜덤하게 여러 열화를 순차 적용한다."""
    n_ops = random.randint(min_ops, max_ops)
    ops = random.sample(DEGRADATIONS, k=min(n_ops, len(DEGRADATIONS)))
    out = img.copy()
    for op in ops:
        out = op(out)
    return out


if __name__ == "__main__":
    # 흰 배경 + 검은 텍스트 박스로 대충 만든 더미 "문서"에 열화를 걸어 확인
    dummy = np.full((400, 300, 3), 255, dtype=np.uint8)
    cv2.rectangle(dummy, (30, 30), (270, 80), (0, 0, 0), 2)
    degraded = random_degrade(dummy)
    print("shape ok:", degraded.shape == dummy.shape, degraded.dtype)

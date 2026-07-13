/**
 * 성적표 사진 OCR 인식률을 높이기 위한 전처리 파이프라인.
 * 전부 브라우저 canvas 안에서만 처리되며, 원본 이미지는 어디에도 업로드/저장되지 않는다.
 *
 * 처리 순서: 회색조 변환 → 기울기(스큐) 추정/보정 → 대비 향상(선형 스트레칭) → 이진화(Otsu)
 */

const MAX_DIMENSION = 2000; // 너무 큰 사진은 처리 속도를 위해 축소한다.

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    img.src = URL.createObjectURL(file);
  });

const toGrayscaleInPlace = (imageData) => {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
};

const enhanceContrastInPlace = (imageData) => {
  const d = imageData.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < min) min = d[i];
    if (d[i] > max) max = d[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
};

/** Otsu's method으로 최적 이진화 임계값을 계산한다. */
const computeOtsuThreshold = (imageData) => {
  const d = imageData.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) hist[Math.round(d[i])] += 1;

  const total = d.length / 4;
  let sumAll = 0;
  for (let t = 0; t < 256; t += 1) sumAll += t * hist[t];

  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t += 1) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sumAll - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
};

const binarizeInPlace = (imageData, threshold) => {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] >= threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
};

const rotateCanvas = (sourceCanvas, angleDeg) => {
  const rad = (angleDeg * Math.PI) / 180;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const rotated = document.createElement('canvas');
  rotated.width = w;
  rotated.height = h;
  const ctx = rotated.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2);

  return rotated;
};

/**
 * 표의 가로줄이 수평이 되도록 기울기를 추정한다.
 * 원리(투영 프로파일법): 여러 각도로 회전해보며, 텍스트 행이 수평에 가까울수록
 * 행별 어두운 픽셀 수의 분산이 커진다는 성질을 이용해 최적 각도를 찾는다.
 * 속도를 위해 축소된 썸네일에서만 계산한다.
 */
const estimateSkewAngle = (sourceCanvas) => {
  const testWidth = 480;
  const scale = testWidth / sourceCanvas.width;
  const testHeight = Math.max(1, Math.round(sourceCanvas.height * scale));

  const thumb = document.createElement('canvas');
  thumb.width = testWidth;
  thumb.height = testHeight;
  const tctx = thumb.getContext('2d');
  tctx.drawImage(sourceCanvas, 0, 0, testWidth, testHeight);

  let bestAngle = 0;
  let bestVariance = -Infinity;

  for (let angle = -5; angle <= 5; angle += 0.5) {
    const rotated = angle === 0 ? thumb : rotateCanvas(thumb, angle);
    const rctx = rotated.getContext('2d');
    const data = rctx.getImageData(0, 0, testWidth, testHeight).data;

    const rowSums = new Array(testHeight).fill(0);
    for (let y = 0; y < testHeight; y += 1) {
      let dark = 0;
      const rowOffset = y * testWidth * 4;
      for (let x = 0; x < testWidth; x += 1) {
        const idx = rowOffset + x * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (gray < 128) dark += 1;
      }
      rowSums[y] = dark;
    }

    const mean = rowSums.reduce((a, b) => a + b, 0) / rowSums.length;
    const variance = rowSums.reduce((a, b) => a + (b - mean) ** 2, 0) / rowSums.length;

    if (variance > bestVariance) {
      bestVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
};

/**
 * 성적표 사진을 OCR에 적합하도록 전처리한다.
 * @param {File} file
 * @returns {Promise<{ blob: Blob, dataUrl: string }>}
 */
export const preprocessForOcr = async (file) => {
  const img = await loadImageFromFile(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  let canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // 1) 회색조로 먼저 바꿔둬야 기울기 추정/이진화 계산이 정확해진다.
  let imageData = ctx.getImageData(0, 0, width, height);
  toGrayscaleInPlace(imageData);
  ctx.putImageData(imageData, 0, 0);

  // 2) 기울기 보정
  const angle = estimateSkewAngle(canvas);
  if (Math.abs(angle) > 0.2) {
    canvas = rotateCanvas(canvas, angle);
    ctx = canvas.getContext('2d');
  }

  // 3) 대비 향상 (선형 스트레칭)
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  enhanceContrastInPlace(imageData);

  // 4) 이진화 (Otsu)
  const threshold = computeOtsuThreshold(imageData);
  binarizeInPlace(imageData, threshold);
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  return { blob, dataUrl };
};

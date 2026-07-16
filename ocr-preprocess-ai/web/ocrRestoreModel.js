/**
 * ONNX Runtime Web으로 OCR 복원 모델을 브라우저에서 직접 실행하는 예제.
 *
 * 기존 client/src/utils/imagePreprocess.js 파이프라인 앞단(원본 이미지를 받은 직후,
 * grayscale/이진화 이전)에 끼워 넣는 용도로 설계했다. 이렇게 하면:
 *   - 이미지가 서버로 전송되지 않는다 (기존 "브라우저 안에서만 처리" 원칙 유지)
 *   - 기존 CPU 기반 imagePreprocess 단계는 그대로 두고, 그 앞에 복원 단계만 추가
 *
 * 설치:
 *   npm install onnxruntime-web
 *
 * 모델 파일 배치:
 *   client/public/models/ocr_restore.onnx  (export_onnx.py로 만든 파일을 복사)
 *
 * 사용 예 (imagePreprocess.js 안에서):
 *   import { restoreImageOnnx } from './ocrRestoreModel.js';
 *   const restoredCanvas = await restoreImageOnnx(originalCanvas);
 *   // 이후 restoredCanvas를 기존 grayscale/threshold 파이프라인에 전달
 */

import * as ort from 'onnxruntime-web';

const MODEL_URL = '/models/ocr_restore.onnx';
const MULTIPLE = 8; // 모델이 8의 배수 해상도를 기대함 (다운샘플 3단계)

let sessionPromise = null;

const getSession = () => {
  if (!sessionPromise) {
    // wasm 스레드/SIMD를 켜면 CPU에서 훨씬 빨라진다. (COOP/COEP 헤더 필요)
    ort.env.wasm.numThreads = navigator.hardwareConcurrency
      ? Math.min(4, navigator.hardwareConcurrency)
      : 1;
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }
  return sessionPromise;
};

const nextMultiple = (value, multiple) => Math.ceil(value / multiple) * multiple;

/**
 * canvas -> Float32Array(NCHW, 0~1 범위) 변환. 8의 배수로 패딩(edge 복제)한다.
 */
const canvasToTensor = (canvas) => {
  const { width, height } = canvas;
  const padW = nextMultiple(width, MULTIPLE);
  const padH = nextMultiple(height, MULTIPLE);

  const padCanvas = document.createElement('canvas');
  padCanvas.width = padW;
  padCanvas.height = padH;
  const ctx = padCanvas.getContext('2d');
  // 가장자리 복제 방식의 패딩: 캔버스를 늘려 그려서 근사한다.
  ctx.drawImage(canvas, 0, 0);
  if (padW > width) ctx.drawImage(canvas, width - 1, 0, 1, height, width, 0, padW - width, height);
  if (padH > height) ctx.drawImage(padCanvas, 0, height - 1, padW, 1, 0, height, padW, padH - height);

  const { data } = ctx.getImageData(0, 0, padW, padH);
  const chw = new Float32Array(3 * padW * padH);
  const plane = padW * padH;
  for (let i = 0; i < plane; i += 1) {
    chw[i] = data[i * 4] / 255; // R
    chw[plane + i] = data[i * 4 + 1] / 255; // G
    chw[plane * 2 + i] = data[i * 4 + 2] / 255; // B
  }

  return { tensor: new ort.Tensor('float32', chw, [1, 3, padH, padW]), padW, padH };
};

const tensorToCanvas = (tensor, width, height, padW, padH) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const plane = padW * padH;
  const src = tensor.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcIdx = y * padW + x;
      const dstIdx = (y * width + x) * 4;
      imageData.data[dstIdx] = Math.round(Math.min(1, Math.max(0, src[srcIdx])) * 255);
      imageData.data[dstIdx + 1] = Math.round(Math.min(1, Math.max(0, src[plane + srcIdx])) * 255);
      imageData.data[dstIdx + 2] = Math.round(Math.min(1, Math.max(0, src[plane * 2 + srcIdx])) * 255);
      imageData.data[dstIdx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * @param {HTMLCanvasElement} canvas 원본(열화된) 이미지가 그려진 canvas
 * @returns {Promise<HTMLCanvasElement>} 복원된 이미지가 그려진 새 canvas (원본과 동일 크기)
 */
export const restoreImageOnnx = async (canvas) => {
  const session = await getSession();
  const { tensor, padW, padH } = canvasToTensor(canvas);

  const feeds = { input: tensor };
  const results = await session.run(feeds);
  const output = results.output;

  return tensorToCanvas(output, canvas.width, canvas.height, padW, padH);
};

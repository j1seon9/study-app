import { createWorker } from 'tesseract.js';
import { preprocessForOcr } from './imagePreprocess.js';

/**
 * 성적표 이미지를 인식해 원문 텍스트 + 단어별 위치정보(bbox)를 반환한다.
 * 100% 브라우저 안에서 처리되며, 원본 이미지는 서버로 전송되지 않는다.
 * @param {File} imageFile
 * @param {(progress: number) => void} onProgress 0~1 진행률 콜백 (선택)
 * @returns {Promise<{ text: string, words: Array, previewDataUrl: string }>}
 */
export const recognizeScoreReport = async (imageFile, onProgress) => {
  const { blob, dataUrl } = await preprocessForOcr(imageFile);

  const worker = await createWorker('kor+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  try {
    const { data } = await worker.recognize(blob);
    return {
      text: data.text ?? '',
      // tesseract.js는 data.words에 각 단어의 bbox(x0,y0,x1,y1)를 함께 제공한다.
      words: data.words ?? [],
      previewDataUrl: dataUrl,
    };
  } finally {
    await worker.terminate();
  }
};

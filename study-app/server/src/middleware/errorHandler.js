/**
 * 404 처리 미들웨어
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `요청한 경로를 찾을 수 없습니다: ${req.originalUrl}`,
  });
};

/**
 * 전역 에러 처리 미들웨어
 * - 모든 컨트롤러의 예외는 next(error)로 이곳까지 전달되어야 한다.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

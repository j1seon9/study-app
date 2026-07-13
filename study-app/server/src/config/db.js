import mongoose from 'mongoose';

/**
 * MongoDB 연결
 * - 호스팅 환경: RAM 512MB, 하루 1회 재시작 가능
 * - 재시작 후에도 자동 재연결 되도록 mongoose 옵션 설정
 * - 커넥션 풀 크기를 작게 유지하여 메모리 사용 최소화
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI 환경변수가 설정되지 않았습니다.');
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(mongoUri, {
      maxPoolSize: 5, // 메모리 절약을 위해 풀 크기 제한
      serverSelectionTimeoutMS: 10000,
    });

    console.log('[DB] MongoDB 연결 성공');

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB 연결이 끊어졌습니다. 재연결을 시도합니다.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] MongoDB 재연결 성공');
    });
  } catch (error) {
    console.error('[DB] MongoDB 연결 실패:', error.message);
    // 서버가 하루 1회 재시작되므로, 연결 실패 시에도 프로세스를 강제 종료해
    // 재시작 스케줄러가 다시 시도하도록 함
    process.exit(1);
  }
};

export default connectDB;

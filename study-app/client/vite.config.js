import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // 저사양 서버 배포 환경을 고려해 청크를 적절히 분리
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          chart: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});

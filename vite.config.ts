
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages 배포 시 저장소 이름에 맞춰 base 경로를 설정해야 할 수 있습니다.
  // './'를 사용하면 상대 경로로 빌드되어 대부분의 환경에서 호환됩니다.
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});

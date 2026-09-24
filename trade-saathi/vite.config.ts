import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: { target: 'es2020', cssCodeSplit: false },
  server: { proxy: { '/api': 'http://127.0.0.1:8788' } },
  test: { include: ['tests/unit/**/*.test.ts'] },
} as never);

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      // EventBharat at /, Dukaan Saathi at /dukaan/, Client Khoj at /khoj/, portfolio at /work/
      input: {
        main: 'index.html',
        dukaan: 'dukaan/index.html',
        khoj: 'khoj/index.html',
        work: 'work/index.html',
      },
    },
  },
})

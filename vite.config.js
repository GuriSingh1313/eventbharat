import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      // Two pages: EventBharat at / and Dukaan Saathi at /dukaan/
      input: {
        main: 'index.html',
        dukaan: 'dukaan/index.html',
      },
    },
  },
})

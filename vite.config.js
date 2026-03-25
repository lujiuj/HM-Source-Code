import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  optimizeDeps: {
    include: ['@antv/g6']
  },
  resolve: {
    alias: {
      '@antv/g6': '@antv/g6/es/index.js'
    }
  }
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['@antv/g6']
  },
  resolve: {
    alias: {
      '@antv/g6': '@antv/g6/es/index.js'
    }
  }
})

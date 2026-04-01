import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const basePath = env.BASE_PATH || '/'
  const isDev = mode === 'development'

  return {
    base: isDev ? '/' : basePath,
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3747',
          changeOrigin: true,
          rewrite: (path) => basePath + path.replace(/^\//, ''),
        },
        '/admin': {
          target: 'http://localhost:3747',
          changeOrigin: true,
          rewrite: (path) => basePath + path.replace(/^\//, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  }
})

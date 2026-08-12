import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Third arg '' disables the VITE_ prefix filter so this also picks up
  // DASHBOARD_PORT from .env, keeping the dev proxy target in sync with
  // whatever port server.js actually listens on.
  const env = loadEnv(mode, process.cwd(), '')
  const dashboardPort = env.DASHBOARD_PORT || 3000

  return {
    plugins: [react()],
    build: {
      outDir: 'public/dist',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${dashboardPort}`,
          changeOrigin: true,
        }
      }
    }
  }
})

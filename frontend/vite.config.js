import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    base: env.VITE_BASE_PATH || '/',
    build: {
      outDir: 'build',
      target: 'baseline-widely-available'
    }
  }
})

import { defineConfig, loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import { createSiteFiles } from './site-files.js'

function siteFilesPlugin(siteUrl) {
  return {
    name: 'unirank-site-files',
    apply: 'build',
    generateBundle() {
      const universities = JSON.parse(readFileSync(new URL('./public/data/enhanced-aggregated-rankings.json', import.meta.url), 'utf8'))
      const { sitemap, robots } = createSiteFiles(siteUrl, universities)
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const siteUrl = env.VITE_SITE_URL || 'http://localhost/'

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [siteFilesPlugin(siteUrl)],
    build: {
      outDir: 'build',
      target: 'baseline-widely-available'
    }
  }
})

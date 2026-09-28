import { toLegacySlug } from './src/ranking-engine.js'

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function createSiteFiles(siteUrl, universities) {
  const root = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
  const paths = ['', 'compare', ...universities.map(university => `university/${toLegacySlug(university.name)}`)]
  const locations = paths.map(path => new URL(path, root).href)
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map(location => `  <url><loc>${xmlEscape(location)}</loc></url>`),
    '</urlset>',
    ''
  ].join('\n')
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', root).href}\n`
  return { sitemap, robots, locations }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('the manifest supplies branded browser chrome colors for both schemes', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'))
  assert.equal(manifest.theme_color, '#f8fafc')
  assert.equal(manifest.background_color, '#f8fafc')
  assert.deepEqual(manifest.color_scheme_dark, {
    theme_color: '#101114',
    background_color: '#101114'
  })
})

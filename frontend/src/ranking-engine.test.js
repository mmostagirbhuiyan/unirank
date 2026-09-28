import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { calculateScore, findUniversityBySlug, rankUniversities, calculateSpread, scaleRank, toLegacySlug, toSlug } from './ranking-engine.js'
import { createSiteFiles } from '../site-files.js'

const complete = {
  name: 'Example University',
  originalRankings: {
    qs: { rank: 1 },
    the: { rank: 2 },
    arwu: { rank: 3 },
    usnews: { rank: 2 }
  }
}

test('full-source score follows the published Borda calculation', () => {
  assert.equal(calculateScore(complete), 993.75)
})

test('active sources are reweighted and missing sources retain the absence penalty', () => {
  assert.equal(calculateScore(complete, ['qs']), 1000)
  const missing = { name: 'Missing', originalRankings: { qs: { rank: 1 } } }
  assert.equal(calculateScore(missing, ['qs', 'the']), 337.5375)
})

test('recalculation sorts all rows and assigns sequential live ranks', () => {
  const second = { name: 'Second', originalRankings: { qs: { rank: 20 }, the: { rank: 1 } } }
  const ranked = rankUniversities([second, complete], ['qs'])
  assert.deepEqual(ranked.map(item => item.name), ['Example University', 'Second'])
  assert.deepEqual(ranked.map(item => item.liveRank), [1, 2])
})

test('spread, log scale, and slugs are derived without fixtures', () => {
  assert.equal(calculateSpread(complete), 2)
  assert.equal(scaleRank(1), 0)
  assert.ok(Math.abs(scaleRank(10) - (100 / 3)) < 1e-10)
  assert.equal(scaleRank(1000), 100)
  assert.equal(toSlug('Université Alpha & Beta'), 'universite-alpha-beta')
  assert.equal(toLegacySlug("King's College London"), 'kings-college-london')
  assert.equal(toLegacySlug('Texas A&M University--College Station'), 'texas-am-university-college-station')
})

test('the browser calculation reproduces every published score and rank', async () => {
  const file = new URL('../public/data/enhanced-aggregated-rankings.json', import.meta.url)
  const universities = JSON.parse(await readFile(file, 'utf8'))
  const ranked = rankUniversities(universities)

  assert.equal(ranked.length, universities.length)
  for (const university of ranked) {
    assert.equal(university.liveScore, university.aggregatedScore, university.name)
    assert.equal(university.liveRank, university.aggregatedRank, university.name)
  }
})

test('every published university retains a unique previous-site profile URL', async () => {
  const file = new URL('../public/data/enhanced-aggregated-rankings.json', import.meta.url)
  const universities = JSON.parse(await readFile(file, 'utf8'))
  const slugs = universities.map(university => toLegacySlug(university.name))

  assert.ok(slugs.length > 0)
  assert.equal(new Set(slugs).size, universities.length)
  for (const university of universities) {
    for (const slug of [toSlug(university.name), toLegacySlug(university.name)]) {
      assert.equal(findUniversityBySlug(universities, slug)?.name, university.name)
    }
  }
})

test('site discovery files list the root, compare page, and every legacy profile URL', async () => {
  const file = new URL('../public/data/enhanced-aggregated-rankings.json', import.meta.url)
  const universities = JSON.parse(await readFile(file, 'utf8'))
  const siteUrl = 'https://rankings.example.org/catalog/'
  const { sitemap, robots, locations } = createSiteFiles(siteUrl, universities)

  assert.equal(locations.length, universities.length + 2)
  assert.equal(locations[0], siteUrl)
  assert.equal(locations[1], `${siteUrl}compare`)
  for (const university of universities) {
    assert.ok(locations.includes(`${siteUrl}university/${toLegacySlug(university.name)}`))
  }
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl}sitemap\\.xml`))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { rankUniversities, SOURCE_ORDER } from './ranking-engine.js'
import { rankValues, reversals, decidingRankers, searchKey, searchUniversities } from './compare-engine.js'

const university = (name, ranks) => ({ name, originalRankings: Object.fromEntries(SOURCE_ORDER.map((s, i) => [s, ranks[i] == null ? null : { rank: ranks[i] }])) })
test('strict crossings exclude ties and absent readings', () => {
  const selected = rankUniversities([university('A', [2, 8, null, 14]), university('B', [27, 3, 7, 14])])
  assert.equal(reversals(selected).length, 1)
  assert.equal(reversals(selected)[0].column, 0)
  assert.equal(rankValues(selected.find(u => u.name === 'A'))[2], null)
})
test('leave-one-out uses full population, coverage and strict score reversals', () => {
  const all = [university('A', [1, 100, 100, 100]), university('B', [500, 2, 2, 2]), university('C', [3, 3, 3, 3]), university('D', [null, 1, null, 1])]
  const selected = rankUniversities(all).filter(u => ['A', 'B'].includes(u.name))
  const qs = decidingRankers(all, selected)[0]
  assert.equal(qs.flips.length, 1)
  assert.equal(qs.flips[0].after.name, 'B')
  assert.equal(qs.flips[0].after.liveRank, rankUniversities(all, ['the', 'arwu', 'usnews']).find(u => u.name === 'B').liveRank)
  const tied = rankUniversities([university('E', [1, 2, 3, 4]), university('F', [1, 2, 3, 4])])
  assert.ok(decidingRankers(tied, tied).every(item => !item.flips.length))
})
test('university search ignores case, accents and punctuation and matches every typed word', () => {
  const names = ['Universidade de São Paulo', "King's College London", 'Texas A&M University--College Station', 'Pennsylvania State University--University Park', 'University of Pennsylvania']
  const universities = names.map(name => ({ name }))
  const find = query => searchUniversities(universities, query).map(item => item.name)
  assert.deepEqual(find('sao paulo'), ['Universidade de São Paulo'])
  assert.deepEqual(find('KINGS college'), ["King's College London"])
  assert.deepEqual(find('texas a&m'), ['Texas A&M University--College Station'])
  assert.deepEqual(find('university park'), ['Pennsylvania State University--University Park'])
  assert.deepEqual(find('penn state'), ['Pennsylvania State University--University Park'])
  assert.deepEqual(find('   '), [])
  assert.deepEqual(find('no such place'), [])
  assert.equal(searchKey('  Zürich–ETH '), 'zurich eth')
})
test('university search puts exact names, initials and prefixes ahead of looser matches, then keeps list order', () => {
  const universities = ['Harvard Medical School', 'Summit College', 'Massachusetts Institute of Technology', 'Harvard University', 'Mitchell University'].map(name => ({ name }))
  const find = (query, limit) => searchUniversities(universities, query, limit).map(item => item.name)
  assert.deepEqual(find('harvard university'), ['Harvard University'])
  assert.deepEqual(find('mit'), ['Massachusetts Institute of Technology', 'Mitchell University', 'Summit College'])
  assert.deepEqual(find('harv'), ['Harvard Medical School', 'Harvard University'])
  assert.equal(find('u', 2).length, 2)
})

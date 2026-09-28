import test from 'node:test'
import assert from 'node:assert/strict'
import { rankUniversities, SOURCE_ORDER } from './ranking-engine.js'
import { rankValues, reversals, decidingRankers } from './compare-engine.js'

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

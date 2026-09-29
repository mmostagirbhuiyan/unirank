import { SOURCE_ORDER, rankUniversities } from './ranking-engine.js'

export function rankValues(university) {
  return [...SOURCE_ORDER.map(source => university.originalRankings[source]?.rank ?? null), university.liveRank]
}

export function reversals(selected) {
  const result = []
  selected.forEach((a, i) => selected.slice(i + 1).forEach(b => {
    const av = rankValues(a)
    const bv = rankValues(b)
    for (let column = 0; column < 4; column += 1) {
      if (![av[column], av[column + 1], bv[column], bv[column + 1]].every(Number.isFinite)) continue
      if ((av[column] - bv[column]) * (av[column + 1] - bv[column + 1]) < 0) {
        result.push({ a, b, column })
      }
    }
  }))
  return result
}

export function decidingRankers(universities, selected) {
  return SOURCE_ORDER.map(source => {
    const without = new Map(rankUniversities(universities, SOURCE_ORDER.filter(item => item !== source)).map(item => [item.name, item]))
    const flips = []
    selected.forEach((a, i) => selected.slice(i + 1).forEach(b => {
      const nextA = without.get(a.name)
      const nextB = without.get(b.name)
      // Scores, rather than tie-break positions, establish a strict reversal.
      if ((a.liveScore - b.liveScore) * (nextA.liveScore - nextB.liveScore) < 0) {
        flips.push({ before: a.liveScore > b.liveScore ? a : b, after: nextA.liveScore > nextB.liveScore ? nextA : nextB })
      }
    }))
    return { source, flips }
  })
}

const CONNECTING_WORDS = new Set(['of', 'and', 'the', 'at', 'in', 'for', 'de', 'da', 'do', 'di', 'del', 'der', 'des', 'la', 'le', 'y', 'e', 'et', 'und'])

export function searchKey(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/['’‘`]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function initials(words) {
  return words.filter(word => !CONNECTING_WORDS.has(word)).map(word => word[0]).join('')
}

export function searchUniversities(universities, query, limit = 8) {
  const key = searchKey(query)
  if (!key) return []
  const tokens = key.split(' ')
  const matches = []
  universities.forEach((university, order) => {
    const name = searchKey(university.name)
    const words = name.split(' ')
    const acronym = tokens.length === 1 && key.length > 1 && initials(words) === key
    if (!acronym && !tokens.every(token => name.includes(token))) return
    const tier = name === key ? 0
      : acronym ? 1
        : name.startsWith(key) ? 2
          : tokens.every(token => words.some(word => word.startsWith(token))) ? 3
            : 4
    matches.push({ university, tier, order })
  })
  return matches
    .sort((a, b) => a.tier - b.tier || a.order - b.order)
    .slice(0, limit)
    .map(match => match.university)
}

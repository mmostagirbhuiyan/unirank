export const SOURCE_ORDER = ['qs', 'the', 'arwu', 'usnews']

export const SOURCE_META = {
  qs: { label: 'QS', maxRank: 1000, shape: 'circle' },
  the: { label: 'THE', maxRank: 999, shape: 'square' },
  arwu: { label: 'ARWU', maxRank: 1000, shape: 'triangle' },
  usnews: { label: 'US News', maxRank: 980, shape: 'diamond' }
}

export function calculateScore(university, activeSources = SOURCE_ORDER) {
  if (!activeSources.length) return Number.NEGATIVE_INFINITY

  const weight = 1 / activeSources.length
  let weightedSum = 0
  let appearances = 0

  for (const source of activeSources) {
    const maxRank = SOURCE_META[source].maxRank
    const rank = university.originalRankings[source]?.rank

    if (Number.isFinite(rank)) {
      weightedSum += Math.max(0, maxRank - rank + 1) * weight
      appearances += 1
    } else {
      weightedSum -= maxRank * 0.1 * weight
    }
  }

  const coverageMultiplier = 0.5 + 0.5 * (appearances / activeSources.length)
  return weightedSum * coverageMultiplier
}

export function rankUniversities(universities, activeSources = SOURCE_ORDER) {
  return universities
    .map((university, sourceIndex) => ({
      ...university,
      sourceIndex,
      liveScore: calculateScore(university, activeSources)
    }))
    .sort((a, b) => b.liveScore - a.liveScore || a.sourceIndex - b.sourceIndex)
    .map((university, index) => ({ ...university, liveRank: index + 1 }))
}

export function observedRanks(university, activeSources = SOURCE_ORDER) {
  return activeSources
    .map(source => university.originalRankings[source]?.rank)
    .filter(Number.isFinite)
}

export function calculateSpread(university, activeSources = SOURCE_ORDER) {
  const ranks = observedRanks(university, activeSources)
  return ranks.length > 1 ? Math.max(...ranks) - Math.min(...ranks) : 0
}

export function scaleRank(rank) {
  const bounded = Math.max(1, Math.min(1000, Number(rank)))
  return (Math.log10(bounded) / 3) * 100
}

export function toSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Preserve the URL format emitted by the previous application. Its slugger
// removed punctuation before collapsing whitespace, rather than replacing all
// punctuation runs with a separator.
export function toLegacySlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function findUniversityBySlug(universities, slug) {
  return universities.find(university => (
    toLegacySlug(university.name) === slug || toSlug(university.name) === slug
  )) || null
}

export function formatMonthYear(value) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return 'date unavailable'
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function calculationParts(university, activeSources = SOURCE_ORDER) {
  const parts = activeSources.map(source => {
    const rank = university.originalRankings[source]?.rank
    const maxRank = SOURCE_META[source].maxRank
    return Number.isFinite(rank)
      ? { source, rank, points: Math.max(0, maxRank - rank + 1), absent: false }
      : { source, rank: null, points: -(maxRank * 0.1), absent: true }
  })
  const appearances = parts.filter(part => !part.absent).length
  const coverage = 0.5 + 0.5 * (appearances / activeSources.length)
  return { parts, appearances, coverage }
}

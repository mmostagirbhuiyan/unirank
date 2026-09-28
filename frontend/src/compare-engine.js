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

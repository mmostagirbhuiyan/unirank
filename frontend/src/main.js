import './styles.css'
import { rankValues, reversals, decidingRankers } from './compare-engine.js'
import {
  SOURCE_META,
  SOURCE_ORDER,
  calculateSpread,
  calculationParts,
  findUniversityBySlug,
  formatMonthYear,
  observedRanks,
  rankUniversities,
  scaleRank,
  toLegacySlug
} from './ranking-engine.js'

const app = document.querySelector('#app')
const basePath = import.meta.env.BASE_URL
const PAGE_SIZE = 50

const state = {
  universities: [],
  stats: null,
  activeSources: [...SOURCE_ORDER],
  ranked: [],
  previousRanks: new Map(),
  movementsVisible: false,
  search: '',
  sort: 'consensus',
  expanded: null,
  visibleLimit: PAGE_SIZE
}

function withBase(path = '') {
  return `${basePath}${path.replace(/^\//, '')}`
}

function cleanPath() {
  const base = basePath.replace(/\/$/, '')
  const path = window.location.pathname
  return base && path.startsWith(base) ? path.slice(base.length) || '/' : path
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function sourceGlyph(source, extraClass = '') {
  const meta = SOURCE_META[source]
  return `<span class="source-glyph source-${source} shape-${meta.shape} ${extraClass}" aria-hidden="true"></span>`
}

function brand() {
  return `
    <a class="brand" href="${withBase()}" aria-label="unirank home">
      <span class="brand-name">unirank</span>
      <span class="brand-glyphs" aria-hidden="true">
        ${SOURCE_ORDER.map(source => sourceGlyph(source)).join('')}
      </span>
    </a>`
}

function themeButton() {
  const dark = document.documentElement.dataset.theme === 'dark'
  return `
    <button class="theme-toggle" type="button" data-action="theme" aria-label="Switch to ${dark ? 'light' : 'dark'} mode">
      <span class="theme-icon ${dark ? 'is-sun' : 'is-moon'}" aria-hidden="true"></span>
    </button>`
}

function siteSearch() {
  return `
    <form class="header-search" data-action="site-search">
      <span class="search-icon" aria-hidden="true"></span>
      <input name="university" type="search" placeholder="Search universities or countries…" autocomplete="off" aria-label="Search universities or countries" />
    </form>`
}

function header({ search = false, profileSearch = false } = {}) {
  return `
    <header class="site-header">
      ${brand()}
      ${profileSearch ? siteSearch() : search ? `
        <label class="header-search">
          <span class="visually-hidden">Search universities or countries</span>
          <span class="search-icon" aria-hidden="true"></span>
          <input type="search" value="${escapeHtml(state.search)}" placeholder="Search universities or countries…" autocomplete="off" data-action="search" />
        </label>` : '<span></span>'}
      <nav class="main-nav" aria-label="Primary navigation">
        <a href="${withBase('#method')}">Method</a>
        <a href="${withBase('compare')}">Compare</a>
        ${themeButton()}
      </nav>
    </header>`
}

function loadingView() {
  app.innerHTML = `
    <main class="status-page">
      ${brand()}
      <p class="eyebrow">Loading the rankings</p>
      <div class="loading-rule" aria-hidden="true"></div>
    </main>`
}

function errorView(error) {
  app.innerHTML = `
    <main class="status-page">
      ${brand()}
      <h1>Rankings unavailable</h1>
      <p>${escapeHtml(error.message || 'The data could not be loaded.')}</p>
      <button class="plain-button" type="button" data-action="retry">Try again</button>
    </main>`
}

async function loadData() {
  loadingView()
  try {
    const [universitiesResponse, statsResponse] = await Promise.all([
      fetch(`${basePath}data/enhanced-aggregated-rankings.json`),
      fetch(`${basePath}data/global-stats.json`)
    ])
    if (!universitiesResponse.ok || !statsResponse.ok) throw new Error('The ranking files did not load.')
    state.universities = await universitiesResponse.json()
    state.stats = await statsResponse.json()
    for (const source of SOURCE_ORDER) {
      const publishedMaxRank = Number(state.stats.sourceConfig?.[source]?.maxRank)
      if (Number.isFinite(publishedMaxRank)) SOURCE_META[source].maxRank = publishedMaxRank
    }
    state.ranked = rankUniversities(state.universities, state.activeSources)
    route()
  } catch (error) {
    errorView(error)
  }
}

function sourceControls() {
  return SOURCE_ORDER.map(source => {
    const active = state.activeSources.includes(source)
    const onlyActive = active && state.activeSources.length === 1
    return `
      <button class="source-toggle ${active ? 'is-active' : ''}" type="button" data-source="${source}" aria-pressed="${active}" ${onlyActive ? 'aria-disabled="true"' : ''}>
        ${sourceGlyph(source)}
        <span>${SOURCE_META[source].label}</span>
        <span class="switch" aria-hidden="true"><span></span></span>
      </button>`
  }).join('')
}

function sortControls() {
  const options = [
    ['consensus', 'Consensus'],
    ['contested', 'Most contested'],
    ['country', 'Country']
  ]
  return `
    <div class="sort-control" role="group" aria-label="Sort rankings">
      ${options.map(([value, label]) => `
        <button type="button" data-sort="${value}" class="${state.sort === value ? 'is-active' : ''}" aria-pressed="${state.sort === value}">${label}</button>
      `).join('')}
    </div>`
}

function movementFor(university) {
  if (!state.movementsVisible) return ''
  const previous = state.previousRanks.get(university.name)
  if (!previous || previous === university.liveRank) return '<span class="movement movement-same">no move</span>'
  const difference = previous - university.liveRank
  return `<span class="movement ${difference > 0 ? 'movement-up' : 'movement-down'}">${difference > 0 ? '↑' : '↓'} ${Math.abs(difference).toLocaleString()}</span>`
}

function rowMarkers(university) {
  const ranks = observedRanks(university, state.activeSources)
  const minimum = ranks.length ? Math.min(...ranks) : null
  const maximum = ranks.length ? Math.max(...ranks) : null
  const left = minimum === null ? 0 : scaleRank(minimum)
  const width = minimum === null ? 0 : scaleRank(maximum) - left

  return `
    <div class="fray-plot">
      <span class="observed-span" style="left:${left}%;width:${width}%" aria-hidden="true"></span>
      ${state.activeSources.map(source => {
        const rank = university.originalRankings[source]?.rank
        if (!Number.isFinite(rank)) {
          return `<span class="source-marker absent-marker marker-${source}" title="${SOURCE_META[source].label}: absent" aria-hidden="true">${sourceGlyph(source)}</span>`
        }
        return `<span class="source-marker marker-${source}" style="left:${scaleRank(rank)}%" title="${SOURCE_META[source].label}: ${rank.toLocaleString()}" aria-hidden="true">${sourceGlyph(source)}</span>`
      }).join('')}
      <span class="consensus-marker" style="left:${scaleRank(university.liveRank)}%" title="Consensus: ${university.liveRank.toLocaleString()}" aria-hidden="true"></span>
    </div>`
}

function detailPanel(university) {
  const { parts, appearances, coverage } = calculationParts(university, state.activeSources)
  const weight = 1 / state.activeSources.length
  const equation = parts
    .map(part => part.absent
      ? `(${SOURCE_META[part.source].maxRank} × −0.1)`
      : `(${SOURCE_META[part.source].maxRank} − ${part.rank} + 1)`)
    .join(' + ')
  const sources = parts.map(part => `
    <div class="evidence-source">
      <span>${sourceGlyph(part.source)} ${SOURCE_META[part.source].label}</span>
      <strong>${part.absent ? 'Absent' : `#${part.rank.toLocaleString()}`}</strong>
      <small>${part.absent ? 'absence penalty' : `${part.points.toLocaleString()} Borda points`}</small>
    </div>`).join('')

  return `
    <section class="row-detail" id="detail-${university.sourceIndex}" aria-label="How ${escapeHtml(university.name)} is ranked">
      <div class="evidence-grid">${sources}</div>
      <div class="equation-line">
        <span>How this becomes #${university.liveRank.toLocaleString()}</span>
        <code>(${equation}) × ${weight.toFixed(2)} × ${coverage.toFixed(3)} = ${university.liveScore.toFixed(2)}</code>
      </div>
      <p class="coverage-note">Ranked by ${appearances} of ${state.activeSources.length} active sources. An absent source is penalized, not placed last.</p>
    </section>`
}

function universityRow(university) {
  const spread = calculateSpread(university, state.activeSources)
  const available = SOURCE_ORDER
    .filter(source => Number.isFinite(university.originalRankings[source]?.rank))
    .map(source => `${SOURCE_META[source].label} ${university.originalRankings[source].rank}`)
  const absent = SOURCE_ORDER
    .filter(source => !Number.isFinite(university.originalRankings[source]?.rank))
    .map(source => `${SOURCE_META[source].label} absent`)
  const summary = [...available, ...absent, `consensus ${university.liveRank}`, `spread ${spread}`].join(', ')
  const expanded = state.expanded === university.sourceIndex

  return `
    <article class="ranking-entry" data-university-index="${university.sourceIndex}">
      <div class="ranking-row">
        <div class="rank-cell">
          <span class="consensus-rank">${university.liveRank.toLocaleString()}</span>
          ${movementFor(university)}
        </div>
        <div class="university-cell">
          <a href="${withBase(`university/${toLegacySlug(university.name)}`)}">${escapeHtml(university.name)}</a>
          <span>${escapeHtml(university.country || 'Country unavailable')}</span>
        </div>
        <div class="plot-cell" role="img" aria-label="${escapeHtml(summary)}">
          ${rowMarkers(university)}
        </div>
        <span class="visually-hidden">${escapeHtml(summary)}</span>
        <div class="spread-cell"><span>${spread.toLocaleString()}</span></div>
        <button class="open-row" type="button" data-expand="${university.sourceIndex}" aria-expanded="${expanded}" aria-controls="detail-${university.sourceIndex}" aria-label="${expanded ? 'Close' : 'Open'} rank calculation for ${escapeHtml(university.name)}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"></path></svg>
        </button>
      </div>
      ${expanded ? detailPanel(university) : ''}
    </article>`
}

function visibleUniversities() {
  const query = state.search.trim().toLocaleLowerCase()
  let result = query
    ? state.ranked.filter(university => `${university.name} ${university.country}`.toLocaleLowerCase().includes(query))
    : [...state.ranked]

  if (state.sort === 'contested') {
    result.sort((a, b) => calculateSpread(b, state.activeSources) - calculateSpread(a, state.activeSources) || a.liveRank - b.liveRank)
  } else if (state.sort === 'country') {
    result.sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.liveRank - b.liveRank)
  }
  return result
}

function ledger(universities, total) {
  return `
    <section class="ledger" id="rankings" aria-labelledby="ranking-heading">
      <h2 id="ranking-heading" class="visually-hidden">University consensus rankings</h2>
      <div class="ledger-head" aria-hidden="true">
        <span>#</span>
        <span>University</span>
        <div class="axis-labels"><span>1</span><span>10</span><span>100</span><span>1000</span><i>Absent</i></div>
        <span>Spread</span>
        <span></span>
      </div>
      <div class="ranking-list">
        ${universities.length
          ? universities.map(universityRow).join('')
          : '<div class="empty-result"><h2>No universities found</h2><p>Try another university or country.</p></div>'}
      </div>
      ${universities.length < total ? `<div class="load-more-wrap"><button class="plain-button" type="button" data-action="load-more">Show ${Math.min(PAGE_SIZE, total - universities.length)} more universities</button></div>` : ''}
    </section>`
}

function renderLanding(focusSelector = '') {
  const matchingUniversities = visibleUniversities()
  const universities = matchingUniversities.slice(0, state.visibleLimit)
  document.title = 'unirank | Four rankers. One consensus.'
  app.innerHTML = `
    <div class="page-shell">
      ${header({ search: true })}
      <main id="main-content">
        <section class="hero">
          <h1>Four rankers. One consensus. See where they disagree.</h1>
          <p class="dataset-line">${state.universities.length.toLocaleString()} universities <span>·</span> ${SOURCE_ORDER.length} sources <span>·</span> updated ${formatMonthYear(state.stats.lastUpdated)}</p>
        </section>
        <section class="controls" aria-label="Ranking controls">
          <div class="source-controls">${sourceControls()}</div>
          ${sortControls()}
        </section>
        <p class="result-count" aria-live="polite">Showing ${universities.length.toLocaleString()} of ${matchingUniversities.length.toLocaleString()} ${matchingUniversities.length === 1 ? 'university' : 'universities'}</p>
        ${ledger(universities, matchingUniversities.length)}
      </main>
      <footer class="site-footer" id="method">
        <div>
          <h2>One readable consensus</h2>
          <p>Each active source contributes an equal-weight Borda score. An absent rank receives a ten percent penalty, then source coverage adjusts the result. Open any row to inspect its real inputs.</p>
        </div>
        <p>Data updated ${formatMonthYear(state.stats.lastUpdated)}. ${state.universities.length.toLocaleString()} universities.</p>
      </footer>
    </div>`
  if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll: true })
}

function ordinal(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  const remainder = number % 100
  if (remainder >= 11 && remainder <= 13) return `${number}th`
  return `${number}${({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th'}`
}

function profileScaleRank(rank) {
  const maximum = Math.max(1000, state.universities.length)
  const bounded = Math.max(1, Math.min(maximum, Number(rank)))
  return (Math.log10(bounded) / Math.log10(maximum)) * 100
}

function profileMarkerLayout(university) {
  const minimumSeparation = window.innerWidth <= 700 ? 24 : 13
  const markers = SOURCE_ORDER.map(source => {
    const rank = university.originalRankings[source]?.rank
    return {
      source,
      rank,
      position: Number.isFinite(rank) ? profileScaleRank(rank) : 104,
      absent: !Number.isFinite(rank),
      consensus: false
    }
  })
  markers.push({
    source: 'consensus',
    rank: university.liveRank,
    position: profileScaleRank(university.liveRank),
    absent: false,
    consensus: true
  })

  const lastPositionByLane = []
  for (const marker of [...markers].sort((a, b) => a.position - b.position || Number(a.consensus) - Number(b.consensus))) {
    let lane = lastPositionByLane.findIndex(position => marker.position - position >= minimumSeparation)
    if (lane === -1) lane = lastPositionByLane.length
    lastPositionByLane[lane] = marker.position
    marker.lane = lane
  }
  return { markers, laneCount: lastPositionByLane.length }
}

function profilePlot(university) {
  const observed = observedRanks(university)
  const minimum = Math.min(...observed)
  const maximum = Math.max(...observed)
  const start = profileScaleRank(minimum)
  const width = profileScaleRank(maximum) - start
  const { markers, laneCount } = profileMarkerLayout(university)
  const summary = markers.map(marker => marker.consensus
    ? `Consensus ${marker.rank}`
    : `${SOURCE_META[marker.source].label} ${marker.absent ? 'absent' : marker.rank}`
  ).join(', ')

  return `
    <section class="profile-plot" aria-labelledby="source-position-heading">
      <h2 id="source-position-heading" class="visually-hidden">Ranker positions on a shared scale</h2>
      <div class="profile-axis" role="img" aria-label="${escapeHtml(summary)}" style="--marker-lanes:${laneCount}">
        <div class="profile-axis-labels" aria-hidden="true">
          <span style="left:${profileScaleRank(1)}%">1</span><span style="left:${profileScaleRank(10)}%">10</span><span style="left:${profileScaleRank(100)}%">100</span><span style="left:${profileScaleRank(1000)}%">1000</span><i>Not ranked</i>
        </div>
        <div class="profile-axis-track" aria-hidden="true">
          <span class="profile-observed-span" style="left:${start}%;width:${width}%"></span>
          ${markers.map(marker => `
            <span class="profile-axis-marker ${marker.consensus ? 'is-consensus' : `source-${marker.source} shape-${SOURCE_META[marker.source].shape}`} ${marker.absent ? 'is-absent' : marker.position < 8 ? 'is-start' : marker.position > 92 ? 'is-end' : ''}" style="${marker.absent ? '' : `left:${marker.position}%`};--marker-lane:${marker.lane}">
              <span class="profile-marker-label">
                <small>${marker.consensus ? 'Consensus' : SOURCE_META[marker.source].label}</small>
                <strong>${marker.absent ? 'Absent' : `#${formatNumber(Number(marker.rank))}`}</strong>
              </span>
            </span>`).join('')}
        </div>
      </div>
    </section>`
}

function profileCalculation(university) {
  const { parts, appearances, coverage } = calculationParts(university)
  const weight = 1 / SOURCE_ORDER.length
  const totalInputMagnitude = parts.reduce((total, part) => total + Math.abs(part.points * weight), 0)
  const equation = parts.map(part => part.absent
    ? `(${SOURCE_META[part.source].maxRank} × −0.1)`
    : `(${SOURCE_META[part.source].maxRank} − ${part.rank} + 1)`
  ).join(' + ')

  return `
    <section class="profile-calculation" aria-labelledby="calculation-heading">
      <div class="profile-equation">
        <h2 id="calculation-heading">How the consensus rank is calculated</h2>
        <code>[${equation}] × ${weight.toFixed(2)} × ${coverage.toFixed(3)} = ${university.liveScore.toFixed(2)} points → #${formatNumber(university.liveRank)}</code>
      </div>
      <p class="profile-calculation-note">Each source has equal weight. The ${coverage.toFixed(3)} coverage adjustment reflects ${appearances} of ${SOURCE_ORDER.length} sources. An absent source receives its stated penalty and is never treated as a last-place rank. Signed shares compare each source input with the total magnitude of all four inputs.</p>
      <div class="profile-table-wrap">
        <table class="profile-table">
          <caption class="visually-hidden">Source ranks and their contribution to the consensus score</caption>
          <thead><tr><th scope="col">Source</th><th scope="col">Rank</th><th scope="col">Borda points</th><th scope="col">Weight</th><th scope="col">Share of inputs</th></tr></thead>
          <tbody>${parts.map(part => {
            const weightedPoints = part.points * weight
            const share = totalInputMagnitude ? (weightedPoints / totalInputMagnitude) * 100 : 0
            return `<tr>
              <th scope="row"><span class="table-source">${sourceGlyph(part.source)}<span>${SOURCE_META[part.source].name}</span></span></th>
              <td>${part.absent ? '<span class="absent-text">Absent</span>' : `#${part.rank.toLocaleString()}`}</td>
              <td>${part.points.toLocaleString()}</td>
              <td>${(weight * 100).toFixed(0)}%</td>
              <td>${share.toFixed(1)}%</td>
            </tr>`
          }).join('')}</tbody>
        </table>
      </div>
    </section>`
}

function profilePeers(university, ranked) {
  const spread = calculateSpread(university)
  const peers = ranked
    .filter(candidate => candidate.name !== university.name && Math.abs(candidate.liveRank - university.liveRank) <= 25)
    .sort((a, b) => Math.abs(calculateSpread(b) - spread) - Math.abs(calculateSpread(a) - spread) || Math.abs(a.liveRank - university.liveRank) - Math.abs(b.liveRank - university.liveRank))
    .slice(0, 3)
  if (!peers.length) return ''

  return `
    <section class="profile-peers" aria-labelledby="peers-heading">
      <div><h2 id="peers-heading">Similar consensus, different spread</h2><p>Nearby positions with a different pattern of source agreement.</p></div>
      <div class="peer-links">${peers.map(peer => `<a href="${withBase(`university/${toLegacySlug(peer.name)}`)}"><span>${escapeHtml(peer.name)}</span><small>#${peer.liveRank.toLocaleString()} · ${calculateSpread(peer).toLocaleString()}-place spread</small></a>`).join('')}</div>
    </section>`
}

function renderProfile(slug) {
  const university = findUniversityBySlug(state.universities, slug)
  if (!university) {
    renderNotFound()
    return
  }
  const ranked = rankUniversities(state.universities)
  const live = ranked.find(item => item.name === university.name)
  document.title = `${university.name} | unirank`
  app.innerHTML = `
    <div class="page-shell secondary-page">
      ${header({ profileSearch: true })}
      <main class="profile-surface" id="main-content">
        <a class="back-link" href="${withBase()}">← Back to rankings</a>
        <div class="profile-heading">
          <div><h1>${escapeHtml(university.name)}</h1><p>${escapeHtml(university.country)} · ${ordinal(university.countryRank)} of ${Number(university.countryTotal).toLocaleString()} in the country</p></div>
          <div class="profile-rank"><span>Consensus rank</span><strong>#${formatNumber(live.liveRank)}</strong><div class="coverage-ticks" aria-label="Ranked by ${university.appearances} of ${SOURCE_ORDER.length} sources">${SOURCE_ORDER.map((_, index) => `<i class="${index < university.appearances ? 'is-filled' : ''}"></i>`).join('')}</div><small>${university.appearances} of ${SOURCE_ORDER.length} sources</small></div>
        </div>
        ${profilePlot(live)}
        ${profileCalculation(live)}
        ${profilePeers(live, ranked)}
      </main>
    </div>`
}

function compareSelection() {
  const params = new URLSearchParams(location.search)
  return (params.get('universities') || '')
    .split(',')
    .filter(Boolean)
    .map(slug => findUniversityBySlug(state.universities, slug))
    .filter((university, index, items) => university && items.indexOf(university) === index)
    .slice(0, 4)
}

const compareDashes = ['', '9 5', '2 5', '12 4 2 4']

function compareChart(selected) {
  const maximum = Math.max(1000, ...selected.flatMap(rankValues).filter(Number.isFinite))
  const y = rank => 70 + Math.log10(rank) / Math.log10(maximum) * 310
  const x = column => 100 + column * 220
  const crossings = reversals(selected)
  const columns = [...SOURCE_ORDER.map(source => SOURCE_META[source].label), 'Consensus']
  return `<div class="compare-chart-scroll" tabindex="0" role="region" aria-label="Rank comparison chart, scroll horizontally on small screens">
    <svg class="compare-chart" viewBox="0 0 1100 465" role="img" aria-labelledby="compare-chart-title compare-chart-desc">
      <title id="compare-chart-title">Where the rankers reverse the order</title>
      <desc id="compare-chart-desc">Five columns share a logarithmic rank scale. Numbered ink lines identify universities. Dots mark strict order reversals between adjacent columns. Missing ranks break a line. Exact values are in the table below.</desc>
      ${[1, 10, 100, 1000].map(rank => `<text x="55" y="${y(rank) + 5}" text-anchor="end" class="chart-axis">${formatNumber(rank)}</text><line x1="70" x2="1030" y1="${y(rank)}" y2="${y(rank)}" class="chart-rule"/>`).join('')}
      ${columns.map((label, column) => `<text x="${x(column)}" y="30" text-anchor="middle" class="chart-column ${column === 4 ? 'chart-consensus' : `source-${SOURCE_ORDER[column]}`}">${column < 4 ? ['●', '■', '▲', '◆'][column] : '│'} ${label}</text>`).join('')}
      ${selected.map((university, index) => {
        const values = rankValues(university)
        return `<g class="university-line">${values.map((rank, column) => {
          if (!Number.isFinite(rank)) return `<text x="${x(column)}" y="${410 + index * 15}" text-anchor="middle" class="chart-value">${index + 1}: absent</text>`
          const next = values[column + 1]
          return `${Number.isFinite(next) ? `<line x1="${x(column)}" y1="${y(rank)}" x2="${x(column + 1)}" y2="${y(next)}" stroke-dasharray="${compareDashes[index]}"/>` : ''}<circle cx="${x(column)}" cy="${y(rank)}" r="4"><title>${escapeHtml(university.name)}: ${columns[column]} ${rank}</title></circle>`
        }).join('')}</g>`
      }).join('')}
      ${crossings.map(({a, b, column}) => {
        const av = rankValues(a), bv = rankValues(b)
        const d0 = y(av[column]) - y(bv[column])
        const d1 = y(av[column + 1]) - y(bv[column + 1])
        const fraction = d0 / (d0 - d1)
        return `<circle class="crossing-dot" cx="${x(column) + 220 * fraction}" cy="${y(av[column]) + fraction * (y(av[column + 1]) - y(av[column]))}" r="5"><title>${escapeHtml(a.name)} and ${escapeHtml(b.name)} reverse order</title></circle>`
      }).join('')}
      ${columns.map((_, column) => {
        let last = 45
        return selected.map((u, index) => ({u, index, rank: rankValues(u)[column]})).filter(item => Number.isFinite(item.rank)).sort((a,b) => a.rank - b.rank).map(({index, rank}) => {
          const labelY = Math.max(y(rank), last + 19)
          last = labelY
          return `<path class="chart-label-leader" d="M${x(column) + 5} ${y(rank)} L${x(column) + 17} ${labelY}"/><text class="chart-value" x="${x(column) + 20}" y="${labelY + 4}">${index + 1}: ${rank}</text>`
        }).join('')
      }).join('')}
    </svg></div>`
}

function renderCompare() {
  const ranked = new Map(rankUniversities(state.universities).map(item => [item.name, item]))
  const selected = compareSelection().map(item => ranked.get(item.name))
  const columns = [...SOURCE_ORDER.map(source => SOURCE_META[source].label), 'Consensus']
  const changes = reversals(selected).filter(item => item.column < 3)
  document.title = 'Compare universities | unirank'
  app.innerHTML = `
    <div class="page-shell secondary-page">
      ${header({ profileSearch: true })}
      <main class="compare-surface" id="main-content">
        <p class="eyebrow">Compare universities</p>
        <h1>Four global rankings. One view.</h1>
        <p class="compare-deck">See where rankings agree, and where they reverse the order.</p>
        <div class="compare-pills">${selected.map((u, i) => `<button type="button" data-compare-remove="${toLegacySlug(u.name)}" aria-label="Remove ${escapeHtml(u.name)}"><span class="compare-number">${i + 1}</span>${escapeHtml(u.name)}<span aria-hidden="true">×</span></button>`).join('')}</div>
        <form class="compare-form" data-action="compare-add">
          <label><span class="visually-hidden">Add a university</span><input name="university" list="university-options" placeholder="Search for a university" required ${selected.length >= 4 ? 'disabled' : ''} aria-describedby="compare-help" /></label>
          <datalist id="university-options">${state.universities.filter(u => !selected.some(item => item.name === u.name)).map(u => `<option value="${escapeHtml(u.name)}"></option>`).join('')}</datalist>
          <button type="submit" ${selected.length >= 4 ? 'disabled' : ''}>Add university</button>
        </form>
        <p id="compare-help" class="compare-note">${selected.length} of 4 selected. Share this comparison by copying the page URL.</p>
        <p id="compare-feedback" role="status"></p>
        ${selected.length ? `${compareChart(selected)}
          <div class="compare-legend">${selected.map((u, i) => `<span><svg width="38" height="12" aria-hidden="true"><line x1="0" x2="38" y1="6" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="${compareDashes[i]}"/></svg>${i + 1}. ${escapeHtml(u.name)}</span>`).join('')}</div>
          <p class="compare-note">Rank, logarithmic scale. Lower is better. Dots mark reversals, not ties. Missing ranks are not plotted. Labels show university number: rank.</p>
          <section class="compare-takeaways"><h2>Key takeaways</h2><div>${changes.length ? changes.map(({a,b,column}) => {
            const av = rankValues(a), bv = rankValues(b)
            const first = av[column] < bv[column] ? a : b
            const second = first === a ? b : a
            return `<p>${columns[column]} puts ${escapeHtml(first.name)} ${Math.abs(av[column] - bv[column])} places above ${escapeHtml(second.name)}. ${columns[column + 1]} reverses their order by ${Math.abs(av[column + 1] - bv[column + 1])}.</p>`
          }).join('') : `<p>${selected.length < 2 ? 'Add another university to reveal order reversals.' : 'No strict order reversals between adjacent source columns for these universities.'}</p>`}</div></section>
          ${selected.length > 1 ? `<section class="compare-deciding"><h2>Deciding ranker</h2><p class="compare-note">Remove one source, then recompute equal-weight Borda scores and coverage across all ${formatNumber(state.universities.length)} universities. Tied scores do not count as flips.</p><div>${decidingRankers(state.universities, selected).map(({source, flips}) => `<article><h3>${sourceGlyph(source)} ${SOURCE_META[source].label}</h3>${flips.length ? flips.map(({before, after}) => `<p>Without ${SOURCE_META[source].label}, ${escapeHtml(after.name)} overtakes ${escapeHtml(before.name)} in consensus (now #${after.liveRank}).</p>`).join('') : '<p>No strict consensus order flips among these universities.</p>'}</article>`).join('')}</div></section>` : ''}
          <div class="compare-table-wrap" tabindex="0" role="region" aria-label="Exact comparison ranks"><table class="compare-table"><caption>Exact ranks used in this comparison</caption>
            <thead><tr><th scope="col">University</th>${columns.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
            <tbody>${selected.map((u, i) => `<tr><th scope="row">${i + 1}. <a href="${withBase(`university/${toLegacySlug(u.name)}`)}">${escapeHtml(u.name)}</a></th>${rankValues(u).map(rank => `<td>${Number.isFinite(rank) ? `#${rank}` : 'Absent'}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>` : '<p class="empty-compare">Choose up to four universities to trace their ranks on one shared scale.</p>'}
      </main>
    </div>`
}

function renderNotFound() {
  document.title = 'Page not found | unirank'
  app.innerHTML = `<main class="status-page">${brand()}<h1>Page not found</h1><a class="plain-button" href="${withBase()}">Back to rankings</a></main>`
}

function route() {
  const path = cleanPath()
  if (path === '/' || path === '') renderLanding()
  else if (path === '/compare' || path === '/compare/') renderCompare()
  else if (path.startsWith('/university/')) renderProfile(decodeURIComponent(path.split('/')[2] || ''))
  else renderNotFound()
}

function syncThemeUi() {
  const dark = document.documentElement.dataset.theme === 'dark'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = dark ? '#101114' : '#f8fafc'
  const button = document.querySelector('[data-action="theme"]')
  if (!button) return
  button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`)
  const icon = button.querySelector('.theme-icon')
  icon?.classList.toggle('is-sun', dark)
  icon?.classList.toggle('is-moon', !dark)
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('unirank-theme', next)
  syncThemeUi()
}

function toggleSource(source) {
  const active = state.activeSources.includes(source)
  if (active && state.activeSources.length === 1) return

  state.previousRanks = new Map(state.ranked.map(university => [university.name, university.liveRank]))
  state.activeSources = active
    ? state.activeSources.filter(item => item !== source)
    : SOURCE_ORDER.filter(item => item === source || state.activeSources.includes(item))
  state.ranked = rankUniversities(state.universities, state.activeSources)
  state.movementsVisible = true
  state.visibleLimit = PAGE_SIZE
  renderLanding(`[data-source="${source}"]`)
}

function updateCompare(mutator) {
  const selected = compareSelection().map(university => toLegacySlug(university.name))
  const next = mutator(selected).slice(0, 4)
  const url = new URL(location.href)
  if (next.length) url.searchParams.set('universities', next.join(','))
  else url.searchParams.delete('universities')
  history.replaceState(null, '', url)
  renderCompare()
  document.querySelector('[name="university"]:not(:disabled), [data-compare-remove]')?.focus()
  document.querySelector('#compare-feedback').textContent = 'Comparison updated.'
}

app.addEventListener('click', event => {
  const theme = event.target.closest('[data-action="theme"]')
  if (theme) {
    toggleTheme()
    return
  }
  const retry = event.target.closest('[data-action="retry"]')
  if (retry) {
    loadData()
    return
  }
  const source = event.target.closest('[data-source]')
  if (source) {
    toggleSource(source.dataset.source)
    return
  }
  const sort = event.target.closest('[data-sort]')
  if (sort) {
    state.sort = sort.dataset.sort
    state.expanded = null
    state.visibleLimit = PAGE_SIZE
    renderLanding(`[data-sort="${sort.dataset.sort}"]`)
    return
  }
  const expand = event.target.closest('[data-expand]')
  if (expand) {
    const index = Number(expand.dataset.expand)
    state.expanded = state.expanded === index ? null : index
    renderLanding(`[data-expand="${index}"]`)
    if (state.expanded === index) document.querySelector(`[data-university-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
    return
  }
  const loadMore = event.target.closest('[data-action="load-more"]')
  if (loadMore) {
    const matchingUniversities = visibleUniversities()
    const start = state.visibleLimit
    const firstNewUniversity = matchingUniversities[start]
    state.visibleLimit += PAGE_SIZE
    const shownCount = Math.min(state.visibleLimit, matchingUniversities.length)
    const hasMore = shownCount < matchingUniversities.length
    document.querySelector('.ranking-list')
      ?.insertAdjacentHTML('beforeend', matchingUniversities.slice(start, shownCount).map(universityRow).join(''))
    const count = document.querySelector('.result-count')
    if (count) count.textContent = `Showing ${shownCount.toLocaleString()} of ${matchingUniversities.length.toLocaleString()} ${matchingUniversities.length === 1 ? 'university' : 'universities'}`
    if (hasMore) {
      loadMore.textContent = `Show ${Math.min(PAGE_SIZE, matchingUniversities.length - shownCount)} more universities`
      loadMore.focus()
    } else {
      loadMore.closest('.load-more-wrap')?.remove()
      document.querySelector(`[data-university-index="${firstNewUniversity.sourceIndex}"] .university-cell a`)?.focus()
    }
    return
  }
  const remove = event.target.closest('[data-compare-remove]')
  if (remove) updateCompare(selected => selected.filter(slug => slug !== remove.dataset.compareRemove))
})

app.addEventListener('input', event => {
  if (!event.target.matches('[data-action="search"]')) return
  state.search = event.target.value
  state.visibleLimit = PAGE_SIZE
  const position = event.target.selectionStart
  renderLanding()
  const input = document.querySelector('[data-action="search"]')
  input?.focus()
  input?.setSelectionRange(position, position)
})

app.addEventListener('submit', event => {
  if (event.target.matches('[data-action="site-search"]')) {
    event.preventDefault()
    const formData = new FormData(event.target)
    const query = String(formData.get('university') || '').trim()
    const university = state.universities.find(item => item.name.toLocaleLowerCase() === query.toLocaleLowerCase())
    if (university) {
      location.href = withBase(`university/${toLegacySlug(university.name)}`)
    } else {
      state.search = query
      history.pushState(null, '', withBase())
      renderLanding('[data-action="search"]')
    }
    return
  }
  if (!event.target.matches('[data-action="compare-add"]')) return
  event.preventDefault()
  const formData = new FormData(event.target)
  const name = String(formData.get('university') || '')
  const university = state.universities.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (!university) {
    document.querySelector('#compare-feedback').textContent = 'Choose a university from the suggestions.'
    return
  }
  updateCompare(selected => selected.includes(toLegacySlug(university.name)) ? selected : [...selected, toLegacySlug(university.name)])
})

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (localStorage.getItem('unirank-theme')) return
  document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
  syncThemeUi()
})

window.addEventListener('popstate', route)

loadData()

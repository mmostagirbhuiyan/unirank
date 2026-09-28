import './styles.css'
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

function header({ search = false } = {}) {
  return `
    <header class="site-header">
      ${brand()}
      ${search ? `
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
      <main>
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

function renderProfile(slug) {
  const university = findUniversityBySlug(state.universities, slug)
  if (!university) {
    renderNotFound()
    return
  }
  const ranked = rankUniversities(state.universities)
  const live = ranked.find(item => item.name === university.name)
  const ranks = SOURCE_ORDER.map(source => ({ source, rank: university.originalRankings[source]?.rank }))
  document.title = `${university.name} | unirank`
  app.innerHTML = `
    <div class="page-shell secondary-page">
      ${header()}
      <main class="legacy-surface">
        <a class="back-link" href="${withBase()}">← Back to rankings</a>
        <div class="profile-heading">
          <div><p class="eyebrow">University profile</p><h1>${escapeHtml(university.name)}</h1><p>${escapeHtml(university.country)} · #${university.countryRank} of ${university.countryTotal} in the country</p></div>
          <div class="profile-rank"><span>Consensus rank</span><strong>#${live.liveRank}</strong></div>
        </div>
        <section class="profile-fray" aria-label="Source rankings for ${escapeHtml(university.name)}">
          <div class="profile-track">${rowMarkers(live)}</div>
          <div class="profile-sources">${ranks.map(({ source, rank }) => `<div>${sourceGlyph(source)}<span>${SOURCE_META[source].label}</span><strong>${Number.isFinite(rank) ? `#${rank}` : 'Absent'}</strong></div>`).join('')}</div>
        </section>
        ${detailPanel(live)}
      </main>
    </div>`
}

function compareSelection() {
  const params = new URLSearchParams(location.search)
  return (params.get('universities') || '')
    .split(',')
    .filter(Boolean)
    .map(slug => findUniversityBySlug(state.universities, slug))
    .filter(Boolean)
    .slice(0, 4)
}

function renderCompare() {
  const selected = compareSelection()
  document.title = 'Compare universities | unirank'
  app.innerHTML = `
    <div class="page-shell secondary-page">
      ${header()}
      <main class="legacy-surface compare-surface">
        <p class="eyebrow">Compare universities</p>
        <h1>Compare source ranks side by side.</h1>
        <form class="compare-form" data-action="compare-add">
          <label><span class="visually-hidden">Add a university</span><input name="university" list="university-options" placeholder="Search for a university" required /></label>
          <datalist id="university-options">${state.universities.map(university => `<option value="${escapeHtml(university.name)}"></option>`).join('')}</datalist>
          <button type="submit" ${selected.length >= 4 ? 'disabled' : ''}>Add university</button>
        </form>
        ${selected.length ? `
          <div class="compare-table-wrap"><table class="compare-table">
            <thead><tr><th>University</th>${SOURCE_ORDER.map(source => `<th>${SOURCE_META[source].label}</th>`).join('')}<th>Consensus</th><th></th></tr></thead>
            <tbody>${selected.map(university => `<tr><th>${escapeHtml(university.name)}</th>${SOURCE_ORDER.map(source => `<td>${university.originalRankings[source]?.rank ? `#${university.originalRankings[source].rank}` : 'Absent'}</td>`).join('')}<td>#${university.aggregatedRank}</td><td><button type="button" data-compare-remove="${toLegacySlug(university.name)}">Remove</button></td></tr>`).join('')}</tbody>
          </table></div>`
          : '<p class="empty-compare">Add up to four universities to compare their current source ranks.</p>'}
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
  if (meta) meta.content = dark ? '#101114' : '#f5f2ea'
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
    const firstNewUniversity = visibleUniversities()[state.visibleLimit]
    state.visibleLimit += PAGE_SIZE
    const hasMore = state.visibleLimit < visibleUniversities().length
    const focusSelector = hasMore
      ? '[data-action="load-more"]'
      : `[data-university-index="${firstNewUniversity.sourceIndex}"] .university-cell a`
    renderLanding(focusSelector)
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
  if (!event.target.matches('[data-action="compare-add"]')) return
  event.preventDefault()
  const formData = new FormData(event.target)
  const name = String(formData.get('university') || '')
  const university = state.universities.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (!university) return
  updateCompare(selected => selected.includes(toLegacySlug(university.name)) ? selected : [...selected, toLegacySlug(university.name)])
})

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (localStorage.getItem('unirank-theme')) return
  document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
  syncThemeUi()
})

loadData()

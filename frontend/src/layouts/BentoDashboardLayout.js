import React, { useState, lazy, Suspense, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Award, TrendingUp, MapPin,
  GitMerge, Sparkles, ChevronDown, ChevronUp,
  Link2, Check, ExternalLink, Trophy, Medal, Crown,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import ThemeToggle from '../components/shared/ThemeToggle';
import Badge from '../components/shared/Badge';
import UniversityCard from '../components/shared/UniversityCard';
import SearchBar from '../components/shared/SearchBar';
import FilterControls from '../components/shared/FilterControls';
import Pagination from '../components/shared/Pagination';
import EmptyState from '../components/shared/EmptyState';
import Footer from '../components/shared/Footer';
import ComparisonTray from '../components/shared/ComparisonTray';
import ComparisonPanel from '../components/ComparisonPanel';
import { SOURCE_COLORS } from '../hooks/useUniversityData';
import { toSlug } from '../utils/slug';

const LazyEnhancedCardTabs = lazy(() => import('../components/EnhancedCardTabs'));

const CardTabsSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-9 w-20 rounded-lg bg-muted/40" />
      ))}
    </div>
    <div className="h-48 rounded-xl bg-muted/30" />
  </div>
);

const TopCardShareBar = ({ university }) => {
  const [copied, setCopied] = useState(false);
  const slug = toSlug(university.name);
  const profileUrl = `${window.location.origin}/university/${slug}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <Link
        to={`/university/${slug}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-primary/5 text-primary border border-primary/15
          hover:bg-primary/10 hover:border-primary/25
          transition-all duration-200"
      >
        <ExternalLink size={12} />
        Full Profile
      </Link>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-primary/5 text-primary border border-primary/15
          hover:bg-primary/10 hover:border-primary/25
          transition-all duration-200 cursor-pointer"
      >
        {copied ? <Check size={12} /> : <Link2 size={12} />}
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  );
};

const BentoDashboardLayout = ({ data, actions }) => {
  const { metrics, globalStats, filteredData, paginatedData, searchTerm, sortBy, selectedCountry, selectedGroup, currentPage, totalPages, expandedId, uniqueCountries, searchSuggestions, compareIds, compareUniversities, showComparePanel } = data;
  const { setSearchTerm, setSortBy, setSelectedCountry, setSelectedGroup, setCurrentPage, setExpandedId, toggleCompare, removeFromCompare, clearCompare, setShowComparePanel } = actions;

  const top3 = filteredData.slice(0, 3);
  const restData = paginatedData.filter(u => !top3.includes(u));

  const handleExportCSV = useCallback(() => {
    const headers = ['Rank', 'Name', 'Country', 'Score', 'QS', 'THE', 'ARWU', 'US News', 'Appearances', 'Consensus'];
    const rows = filteredData.map(uni => {
      const r = uni.originalRankings;
      const appearances = Object.keys(r).length;
      const disagreement = uni.insights?.disagreement?.category || '';
      return [
        uni.aggregatedRank,
        `"${uni.name.replace(/"/g, '""')}"`,
        `"${uni.country}"`,
        uni.aggregatedScore.toFixed(1),
        r.qs?.rank ?? '',
        r.the?.rank ?? '',
        r.arwu?.rank ?? '',
        r.usnews?.rank ?? '',
        appearances,
        disagreement
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unirank-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-bg" />

      {/* Nav */}
      <header className="relative z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl sticky top-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold font-space tracking-tight">
              <span className="text-foreground">Uni</span>
              <span className="text-gradient">Rank</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} suggestions={searchSuggestions} className="hidden md:block w-64" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile search */}
        <div className="md:hidden pt-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} suggestions={searchSuggestions} />
        </div>

        {/* Hero Value Proposition */}
        <section className="pt-10 pb-2 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-space tracking-tight leading-tight mb-3">
            Every major university ranking.{' '}
            <span className="text-gradient">One unified score.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-5">
            QS, Times Higher Education, ARWU, and US News disagree on who is best.
            UniRank applies a Borda Count consensus method to merge all four into a
            single, bias-resistant ranking you can actually compare.
          </p>
          <button
            onClick={() => {
              const el = document.getElementById('rankings-start') || document.getElementById('university-list');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
              bg-primary/10 text-primary border border-primary/20
              hover:bg-primary/20 hover:border-primary/30
              transition-all duration-200 cursor-pointer"
          >
            Explore Rankings
            <ChevronDown size={16} />
          </button>
        </section>

        {/* Bento Hero Grid */}
        <section className="py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-4">
            {/* Big stat - spans 2 cols */}
            <div className="col-span-2 row-span-2 relative bg-card rounded-2xl border border-border/60 p-8 overflow-hidden card-hover">
              <div className="gradient-mesh absolute inset-0 pointer-events-none" />
              <div className="dot-grid absolute inset-0 pointer-events-none opacity-50" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-6">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">Dashboard</span>
                </div>
                <div className="text-5xl sm:text-6xl font-black font-space tracking-tighter mb-2 text-gradient">
                  {metrics.total.toLocaleString()}
                </div>
                <p className="text-lg text-muted-foreground">universities ranked globally</p>
                <div className="mt-8 flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold font-space">{metrics.countries}</div>
                    <div className="text-xs text-muted-foreground">countries</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <div className="text-2xl font-bold font-space">4</div>
                    <div className="text-xs text-muted-foreground">sources</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <div className="text-2xl font-bold font-space">{metrics.avgScore}</div>
                    <div className="text-xs text-muted-foreground">avg score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top performer */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <Award size={16} className="text-primary" />
                <Badge variant="primary">#1</Badge>
              </div>
              <div className="text-sm font-bold leading-snug mb-1">{metrics.topUni.name}</div>
              <div className="text-xs text-muted-foreground">Top performer</div>
            </div>

            {/* Top region */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover flex items-center gap-4">
              <div className="w-16 h-16 flex-shrink-0">
                <PieChart width={64} height={64}>
                  <Pie
                    data={metrics.chartData.labels.map((label, i) => ({
                      name: label,
                      value: metrics.chartData.datasets[0].data[i]
                    }))}
                    cx={32}
                    cy={32}
                    innerRadius={22}
                    outerRadius={32}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {metrics.chartData.datasets[0].backgroundColor.map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div>
                <div className="text-sm font-bold">{metrics.topCountries[0][0]}</div>
                <div className="text-xs text-muted-foreground">{metrics.topCountries[0][1]} unis</div>
              </div>
            </div>

            {/* Trend */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover">
              <TrendingUp size={16} className="text-primary mb-3" />
              <div className="text-2xl font-bold font-space">{metrics.avgScore}</div>
              <div className="text-xs text-muted-foreground">Global average</div>
            </div>

            {/* Pipeline */}
            {globalStats && (
              <div className="bg-card rounded-2xl border border-border/60 p-5 card-hover">
                <GitMerge size={16} className="text-primary mb-3" />
                <div className="text-2xl font-bold font-space">{(globalStats.manualMappingsCount + globalStats.autoMappingsCount).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Names resolved</div>
              </div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/80 backdrop-blur-2xl border-y border-border/40">
          <FilterControls
            sortBy={sortBy} onSortChange={setSortBy}
            selectedCountry={selectedCountry} onCountryChange={setSelectedCountry}
            selectedGroup={selectedGroup} onGroupChange={setSelectedGroup}
            uniqueCountries={uniqueCountries}
          />
        </section>

        {/* Top 3 Podium */}
        {currentPage === 1 && top3.length > 0 && !searchTerm && !selectedCountry && !selectedGroup && (
          <section id="rankings-start" className="py-10 scroll-mt-6">
            {/* Section header with decorative gradient */}
            <div className="relative mb-8">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-amber-400 via-slate-300 to-amber-700" />
              <h2 className="text-xl sm:text-2xl font-black font-space tracking-tight">
                Top Performers
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Consensus leaders across all four ranking sources</p>
            </div>

            {/* Stat comparison row: how #1 dominates */}
            {top3.length >= 2 && (() => {
              const leader = top3[0];
              const runner = top3[1];
              const scoreDelta = (leader.aggregatedScore - runner.aggregatedScore).toFixed(1);
              const leaderSources = Object.keys(leader.originalRankings).length;
              return (
                <div className="flex flex-wrap items-center gap-3 mb-6 text-xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                    <Crown size={12} />
                    {leader.name.split(' ').slice(0, 3).join(' ')} leads by +{scoreDelta} pts
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-primary font-semibold">
                    Ranked in {leaderSources}/4 sources
                  </div>
                  {Object.entries(leader.originalRankings).filter(([, d]) => d.rank === 1).length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <Trophy size={12} />
                      #1 in {Object.entries(leader.originalRankings).filter(([, d]) => d.rank === 1).map(([s]) => s === 'usnews' ? 'US News' : s.toUpperCase()).join(', ')}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Podium grid: #1 is featured, #2 and #3 are smaller */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {top3.map((uni, i) => {
                const medalConfig = [
                  {
                    gradient: 'from-amber-400 to-amber-600',
                    glow: 'podium-gold',
                    glowBorder: 'border-amber-400/30 dark:border-amber-400/20',
                    bgTint: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06]',
                    Icon: Trophy,
                    label: 'Gold',
                    colSpan: 'md:col-span-2',
                  },
                  {
                    gradient: 'from-slate-300 to-slate-500',
                    glow: 'podium-silver',
                    glowBorder: 'border-slate-400/25 dark:border-slate-400/15',
                    bgTint: 'bg-slate-500/[0.03] dark:bg-slate-500/[0.06]',
                    Icon: Medal,
                    label: 'Silver',
                    colSpan: '',
                  },
                  {
                    gradient: 'from-amber-600 to-amber-800',
                    glow: 'podium-bronze',
                    glowBorder: 'border-amber-700/25 dark:border-amber-700/15',
                    bgTint: 'bg-amber-700/[0.03] dark:bg-amber-700/[0.06]',
                    Icon: Medal,
                    label: 'Bronze',
                    colSpan: '',
                  },
                ];
                const medal = medalConfig[i];
                const MedalIcon = medal.Icon;
                const isExpanded = expandedId === `top-${uni.name}`;
                const isChampion = i === 0;

                return (
                  <div
                    key={uni.name}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${medal.label} medal: ${uni.name}, rank ${uni.aggregatedRank}, score ${uni.aggregatedScore.toFixed(1)}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : `top-${uni.name}`);
                      }
                    }}
                    className={`relative rounded-2xl border overflow-hidden transition-all duration-300 outline-none focus-ring ${medal.colSpan} ${medal.bgTint} ${
                      isExpanded
                        ? `${medal.glowBorder} shadow-lg ring-1 ring-primary/10 ${isChampion ? 'md:col-span-2' : ''}`
                        : `${medal.glowBorder} hover:shadow-md ${medal.glow}`
                    }`}
                  >
                    {/* Glassmorphism card body */}
                    <div
                      className={`relative backdrop-blur-sm cursor-pointer select-none ${isChampion ? 'p-7 sm:p-8' : 'p-6'}`}
                      onClick={() => setExpandedId(isExpanded ? null : `top-${uni.name}`)}
                    >
                      {/* Top gradient stripe */}
                      <div className={`absolute top-0 left-0 w-full ${isChampion ? 'h-1.5' : 'h-1'} bg-gradient-to-r ${medal.gradient}`} />

                      {/* Decorative glow orb for champion */}
                      {isChampion && (
                        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-400/[0.06] dark:bg-amber-400/[0.08] blur-3xl pointer-events-none" />
                      )}

                      <div className="relative z-10">
                        {/* Medal icon + rank badge row */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`${isChampion ? 'w-14 h-14' : 'w-12 h-12'} rounded-xl bg-gradient-to-br ${medal.gradient} text-white flex items-center justify-center shadow-lg flex-shrink-0 relative`}>
                            <MedalIcon size={isChampion ? 24 : 18} strokeWidth={2} />
                            <span className={`absolute -bottom-1.5 -right-1.5 ${isChampion ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-[10px]'} rounded-full bg-card border-2 border-background flex items-center justify-center font-space font-bold text-foreground shadow`}>
                              {uni.aggregatedRank}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-bold leading-snug ${isChampion ? 'text-lg sm:text-xl' : 'text-base'}`}>{uni.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                              <MapPin size={11} />
                              <span>{uni.country}</span>
                              {uni.countryRank && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/5 border border-primary/10 text-[10px] font-semibold text-primary/80">
                                  #{uni.countryRank}{uni.countryTotal ? ` of ${uni.countryTotal}` : ''} nationally
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Source ranking pills - always visible */}
                        <div className={`flex items-center gap-1.5 mb-3 ${isChampion ? 'flex-wrap' : ''}`}>
                          {Object.entries(uni.originalRankings).map(([source, d]) => (
                            <div key={source} className={`text-center flex-1 px-2 ${isChampion ? 'py-2' : 'py-1.5'} rounded-lg ${SOURCE_COLORS[source].bg} min-w-0`}>
                              <div className={`${isChampion ? 'text-[10px]' : 'text-[9px]'} uppercase font-bold ${SOURCE_COLORS[source].text}`}>
                                {source === 'usnews' ? 'USN' : source.toUpperCase()}
                              </div>
                              <div className={`font-mono font-semibold ${isChampion ? 'text-sm' : 'text-xs'}`}>#{d.rank}</div>
                            </div>
                          ))}
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Consensus Score </span>
                          <span className={`font-mono font-bold text-gradient ${isChampion ? 'text-xl' : 'text-lg'}`}>{uni.aggregatedScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border/50 bg-muted/20 p-6 animate-fade-in">
                        <TopCardShareBar university={uni} />
                        {uni.insights ? (
                          <Suspense fallback={<CardTabsSkeleton />}>
                            <LazyEnhancedCardTabs university={uni} globalStats={globalStats} />
                          </Suspense>
                        ) : (
                          <div className="text-sm text-muted-foreground">No detailed insights available.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* University Cards Grid */}
        <section id="university-list" className="py-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredData.length}</span> universities
                {(selectedCountry || selectedGroup || searchTerm) && ' matched'}
              </p>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-primary/5 text-primary border border-primary/15
                  hover:bg-primary/10 hover:border-primary/25
                  transition-all duration-200 cursor-pointer focus-ring"
                aria-label="Export filtered universities as CSV"
              >
                <Download size={12} />
                Export CSV
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(currentPage === 1 && !searchTerm && !selectedCountry && !selectedGroup ? restData : paginatedData).map((uni, i) => (
              <UniversityCard
                key={uni.name}
                university={uni}
                expanded={expandedId === uni.name}
                onToggle={() => setExpandedId(expandedId === uni.name ? null : uni.name)}
                globalStats={globalStats}
                index={i}
                isComparing={compareIds.includes(uni.name)}
                onToggleCompare={toggleCompare}
                compareCount={compareIds.length}
              />
            ))}
          </div>

          {paginatedData.length === 0 && <EmptyState />}
        </section>

        {/* Pagination */}
        <div className={compareIds.length > 0 ? 'pb-28' : 'pb-16'}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </main>

      <Footer lastUpdated={globalStats?.lastUpdated} />

      {/* Comparison Tray - sticky bottom bar */}
      {compareIds.length > 0 && (
        <ComparisonTray
          compareUniversities={compareUniversities}
          onRemove={removeFromCompare}
          onClear={clearCompare}
          onCompare={() => setShowComparePanel(true)}
        />
      )}

      {/* Comparison Panel - modal overlay */}
      {showComparePanel && compareUniversities.length >= 2 && (
        <ComparisonPanel
          universities={compareUniversities}
          onClose={() => setShowComparePanel(false)}
          onRemove={(name) => {
            removeFromCompare(name);
            if (compareUniversities.length <= 2) setShowComparePanel(false);
          }}
        />
      )}
    </div>
  );
};

export default BentoDashboardLayout;

import React from 'react';
import {
  BarChart3, Award, TrendingUp, MapPin,
  GitMerge, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import ThemeToggle from '../components/shared/ThemeToggle';
import Badge from '../components/shared/Badge';
import UniversityCard from '../components/shared/UniversityCard';
import SearchBar from '../components/shared/SearchBar';
import FilterControls from '../components/shared/FilterControls';
import Pagination from '../components/shared/Pagination';
import EmptyState from '../components/shared/EmptyState';
import Footer from '../components/shared/Footer';
import EnhancedCardTabs from '../components/EnhancedCardTabs';
import { SOURCE_COLORS } from '../hooks/useUniversityData';

const BentoDashboardLayout = ({ data, actions }) => {
  const { metrics, globalStats, filteredData, paginatedData, searchTerm, sortBy, selectedCountry, selectedGroup, currentPage, totalPages, expandedId, uniqueCountries } = data;
  const { setSearchTerm, setSortBy, setSelectedCountry, setSelectedGroup, setCurrentPage, setExpandedId } = actions;

  const top3 = filteredData.slice(0, 3);
  const restData = paginatedData.filter(u => !top3.includes(u));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-bg" />

      {/* Nav */}
      <header className="relative z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl sticky top-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold font-space tracking-tight">
              <span className="text-foreground">Uni</span>
              <span className="text-gradient">Rank</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} className="hidden md:block w-64" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile search */}
        <div className="md:hidden pt-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>

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
                <Doughnut
                  data={metrics.chartData}
                  options={{
                    cutout: '68%',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    elements: { arc: { borderWidth: 0 } }
                  }}
                />
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

        {/* Top 3 Featured */}
        {currentPage === 1 && top3.length > 0 && !searchTerm && !selectedCountry && !selectedGroup && (
          <section className="py-8">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Top Performers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((uni, i) => {
                const rankStyles = [
                  'from-amber-400 to-amber-600',
                  'from-slate-300 to-slate-500',
                  'from-amber-600 to-amber-800',
                ];
                const isExpanded = expandedId === `top-${uni.name}`;
                return (
                  <div
                    key={uni.name}
                    className={`relative bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? 'border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10 md:col-span-3'
                        : 'border-border/60 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5'
                    }`}
                  >
                    <div
                      className="p-6 cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : `top-${uni.name}`)}
                    >
                      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${rankStyles[i]}`} />
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rankStyles[i]} text-white flex items-center justify-center font-space font-bold text-lg shadow-lg flex-shrink-0`}>
                          {uni.aggregatedRank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base leading-snug">{uni.name}</h3>
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
                      <div className="flex items-center gap-1.5 mb-3">
                        {Object.entries(uni.originalRankings).map(([source, d]) => (
                          <div key={source} className={`text-center flex-1 px-2 py-1.5 rounded-lg ${SOURCE_COLORS[source].bg}`}>
                            <div className={`text-[9px] uppercase font-bold ${SOURCE_COLORS[source].text}`}>
                              {source === 'usnews' ? 'USN' : source.toUpperCase()}
                            </div>
                            <div className="font-mono text-xs font-semibold">#{d.rank}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Score </span>
                        <span className="font-mono font-bold text-lg text-gradient">{uni.aggregatedScore.toFixed(1)}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/50 bg-muted/20 p-6 animate-fade-in">
                        {uni.insights ? (
                          <EnhancedCardTabs university={uni} globalStats={globalStats} />
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
        <section className="py-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredData.length}</span> universities
              {(selectedCountry || selectedGroup || searchTerm) && ' matched'}
            </p>
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
              />
            ))}
          </div>

          {paginatedData.length === 0 && <EmptyState />}
        </section>

        {/* Pagination */}
        <div className="pb-16">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BentoDashboardLayout;

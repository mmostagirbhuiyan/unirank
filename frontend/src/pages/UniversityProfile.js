import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Link2, Check, BarChart3 } from 'lucide-react';
import { findBySlug } from '../utils/slug';
import { SOURCE_COLORS } from '../hooks/useUniversityData';
import EnhancedCardTabs from '../components/EnhancedCardTabs';
import Badge from '../components/shared/Badge';
import ThemeToggle from '../components/shared/ThemeToggle';
import Footer from '../components/shared/Footer';

const UniversityProfile = () => {
  const { slug } = useParams();
  const [universities, setUniversities] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(process.env.PUBLIC_URL + '/data/enhanced-aggregated-rankings.json').then(r => r.json()),
      fetch(process.env.PUBLIC_URL + '/data/global-stats.json').then(r => r.json())
    ])
      .then(([data, stats]) => {
        setUniversities(data);
        setGlobalStats(stats);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json')
          .then(r => r.json())
          .then(data => { setUniversities(data); setIsLoading(false); })
          .catch(e => console.error(e));
      });
  }, []);

  const university = useMemo(() => findBySlug(universities, slug), [universities, slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
              <BarChart3 className="text-white w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading university profile...</p>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-space mb-3">University not found</h1>
          <p className="text-muted-foreground mb-6">No university matches this URL.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
          >
            <ArrowLeft size={16} />
            Back to Rankings
          </Link>
        </div>
      </div>
    );
  }

  const bestRank = Math.min(...Object.values(university.originalRankings).map(r => r.rank));
  const hasInsights = !!university.insights;

  const getRankStyle = () => {
    const rank = university.aggregatedRank;
    if (rank === 1) return 'from-amber-400 to-amber-600 text-white';
    if (rank === 2) return 'from-slate-300 to-slate-500 text-white';
    if (rank === 3) return 'from-amber-600 to-amber-800 text-white';
    if (rank <= 10) return 'from-primary to-secondary text-white';
    return 'from-muted to-muted text-foreground';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-bg" />

      {/* Nav */}
      <header className="relative z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold font-space tracking-tight">
                <span className="text-foreground">Uni</span>
                <span className="text-gradient">Rank</span>
              </span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Rankings
        </Link>

        {/* Header card */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Rank badge */}
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${getRankStyle()} flex items-center justify-center font-space font-bold text-2xl sm:text-3xl shadow-lg flex-shrink-0`}>
              {university.aggregatedRank}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black font-space tracking-tight leading-tight mb-2">
                {university.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-muted-foreground/70" />
                  {university.country}
                </span>
                {university.countryRank && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10 text-xs font-semibold text-primary/80">
                    #{university.countryRank}{university.countryTotal ? ` of ${university.countryTotal}` : ''} nationally
                  </span>
                )}
              </div>

              {/* Source ranking pills */}
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(university.originalRankings).map(([source, data]) => {
                  const colors = SOURCE_COLORS[source];
                  return (
                    <div key={source} className={`text-center px-4 py-2 rounded-xl ${colors.bg}`}>
                      <div className={`text-[10px] uppercase font-bold ${colors.text} mb-0.5`}>
                        {source === 'usnews' ? 'US News' : source === 'the' ? 'THE' : source === 'qs' ? 'QS' : 'ARWU'}
                      </div>
                      <div className="font-mono text-base font-bold">#{data.rank}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats + share */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Aggregated Score</div>
                <div className="text-3xl font-black font-space text-gradient">{university.aggregatedScore.toFixed(1)}</div>
              </div>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                  bg-primary/5 text-primary border border-primary/15
                  hover:bg-primary/10 hover:border-primary/25
                  transition-all duration-200 cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>
        </div>

        {/* Detailed content */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8">
          {hasInsights ? (
            <EnhancedCardTabs university={university} globalStats={globalStats} />
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Rankings Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(university.originalRankings).map(([source, data]) => {
                    const colors = SOURCE_COLORS[source];
                    return (
                      <div key={source} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          <span className="font-medium text-sm">
                            {source === 'usnews' ? 'US News & World Report' :
                              source === 'the' ? 'Times Higher Education' :
                                source === 'qs' ? 'QS World University' : 'ARWU (Shanghai)'}
                          </span>
                        </div>
                        <div className="font-mono text-base font-bold">#{data.rank}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Performance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-background border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">National</div>
                    <div className="text-2xl font-bold font-space">#{university.countryRank || 'N/A'}</div>
                    {university.countryTotal && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">of {university.countryTotal} in {university.country}</div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Best Rank</div>
                    <div className="text-2xl font-bold font-space text-emerald-600 dark:text-emerald-400">#{bestRank}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border/50 col-span-2">
                    <div className="text-xs text-muted-foreground mb-2">Sources</div>
                    <div className="flex gap-1.5">
                      {Object.keys(university.originalRankings).map(source => (
                        <Badge key={source} variant="neutral" className="uppercase text-[10px]">{source}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer lastUpdated={globalStats?.lastUpdated} />
    </div>
  );
};

export default UniversityProfile;

import React, { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Link2, Check, ExternalLink, GitCompareArrows } from 'lucide-react';
import { SOURCE_COLORS } from '../../hooks/useUniversityData';
import { toSlug } from '../../utils/slug';
import Badge from './Badge';

const LazyEnhancedCardTabs = lazy(() => import('../EnhancedCardTabs'));

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

const UniversityCard = ({ university, expanded, onToggle, globalStats, index, isComparing, onToggleCompare, compareCount }) => {
  const [copied, setCopied] = useState(false);
  const bestRank = Math.min(...Object.values(university.originalRankings).map(r => r.rank));
  const hasInsights = !!university.insights;
  const slug = toSlug(university.name);
  const profileUrl = `${window.location.origin}/university/${slug}`;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getConsensusBadge = () => {
    if (!hasInsights || !university.insights.disagreement) return null;
    const category = university.insights.disagreement.category;
    if (category === 'high-consensus') return { label: 'Consensus', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' };
    if (category === 'high-disagreement') return { label: 'Disputed', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' };
    return null;
  };
  const consensusBadge = getConsensusBadge();

  const getRankStyle = () => {
    const rank = university.aggregatedRank;
    if (rank === 1) return 'from-amber-400 to-amber-600 text-white shadow-amber-500/30';
    if (rank === 2) return 'from-slate-300 to-slate-500 text-white shadow-slate-400/30';
    if (rank === 3) return 'from-amber-600 to-amber-800 text-white shadow-amber-700/30';
    if (rank <= 10) return 'from-primary to-secondary text-white shadow-primary/30';
    return 'from-muted to-muted text-foreground shadow-none';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: 'easeOut' }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${university.name}, rank ${university.aggregatedRank}, score ${university.aggregatedScore.toFixed(1)}. ${university.country}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group bg-card text-card-foreground rounded-2xl border overflow-hidden transition-all duration-300 outline-none focus-ring ${
        expanded
          ? 'border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10'
          : 'border-border/60 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5'
      }`}
    >
      <div
        className="px-5 py-4 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Rank Badge */}
        <div className="flex-shrink-0 flex items-center gap-4 md:gap-0 md:flex-col md:items-center md:min-w-[72px]">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${getRankStyle()} flex items-center justify-center font-space font-bold text-lg md:text-xl shadow-lg`}>
            {university.aggregatedRank}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mt-0 md:mt-1.5">Rank</span>
        </div>

        {/* University Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-base md:text-lg font-bold break-words leading-snug">
              {university.name}
            </h3>
            {consensusBadge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${consensusBadge.color}`}>
                {consensusBadge.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-muted-foreground/70" />
              {university.country}
            </span>
            {university.countryRank && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/5 border border-primary/10 text-[10px] font-semibold text-primary/80">
                #{university.countryRank}{university.countryTotal ? ` of ${university.countryTotal}` : ''} nationally
              </span>
            )}
            <span className="hidden sm:inline-flex w-1 h-1 rounded-full bg-border" />
            <span className="font-mono text-xs">
              Score: <span className="text-foreground font-semibold">{university.aggregatedScore.toFixed(1)}</span>
            </span>
            <span className="hidden sm:inline-flex w-1 h-1 rounded-full bg-border" />
            <span className="text-xs">
              Best: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">#{bestRank}</span>
            </span>
          </div>
        </div>

        {/* Source Rankings Mini Grid */}
        <div className="hidden lg:flex items-center gap-1.5">
          {Object.entries(university.originalRankings).map(([source, data]) => {
            const colors = SOURCE_COLORS[source];
            return (
              <div key={source} className={`text-center px-3 py-1.5 rounded-lg ${colors.bg} transition-colors`}>
                <div className={`text-[10px] uppercase font-bold ${colors.text} mb-0.5`}>
                  {source === 'usnews' ? 'USN' : source.toUpperCase()}
                </div>
                <div className="font-mono text-xs font-semibold text-foreground">#{data.rank}</div>
              </div>
            );
          })}
        </div>

        {/* Source Rankings Compact - Mobile/Tablet */}
        <div className="flex lg:hidden items-center gap-1 flex-wrap">
          {Object.entries(university.originalRankings).map(([source, data], i) => {
            const colors = SOURCE_COLORS[source];
            const abbr = source === 'usnews' ? 'USN' : source.toUpperCase();
            return (
              <React.Fragment key={source}>
                {i > 0 && <span className="text-muted-foreground/40 text-[10px] font-light select-none">|</span>}
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${colors.bg} ${colors.text} whitespace-nowrap`}>
                  {abbr}<span className="font-mono opacity-80">#{data.rank}</span>
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Compare Button */}
        {onToggleCompare && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(university.name); }}
            disabled={!isComparing && compareCount >= 3}
            className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 cursor-pointer
              ${isComparing
                ? 'bg-primary/15 text-primary border border-primary/25'
                : compareCount >= 3
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/15'
              }`}
            aria-label={isComparing ? `Remove ${university.name} from comparison` : `Add ${university.name} to comparison`}
            title={isComparing ? 'Remove from comparison' : compareCount >= 3 ? 'Max 3 universities' : 'Add to comparison'}
          >
            <GitCompareArrows size={16} />
          </button>
        )}

        {/* Expand Toggle */}
        <div className={`ml-auto p-2 rounded-lg transition-all duration-200 ${expanded ? 'bg-primary/10 text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 p-6 animate-fade-in">
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
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-primary/5 text-primary border border-primary/15
                hover:bg-primary/10 hover:border-primary/25
                transition-all duration-200 cursor-pointer"
            >
              {copied ? <Check size={12} /> : <Link2 size={12} />}
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
          {hasInsights ? (
            <Suspense fallback={<CardTabsSkeleton />}>
              <LazyEnhancedCardTabs university={university} globalStats={globalStats} />
            </Suspense>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Rankings Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(university.originalRankings).map(([source, data]) => {
                    const colors = SOURCE_COLORS[source];
                    return (
                      <div key={source} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
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
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">National</div>
                    <div className="text-2xl font-bold font-space">#{university.countryRank}</div>
                    {university.countryTotal && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">of {university.countryTotal} in {university.country}</div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Consistency</div>
                    <div className="text-2xl font-bold font-space">{(university.aggregatedScore / 100).toFixed(1)}/10</div>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50 col-span-2">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Sources</div>
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
      )}
    </motion.div>
  );
};

export default UniversityCard;

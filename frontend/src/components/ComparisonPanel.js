import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Trophy, ArrowUp, ArrowDown, Minus, Share2, Check } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { SOURCE_COLORS } from '../hooks/useUniversityData';

const SOURCE_LABELS = {
  qs: 'QS',
  the: 'THE',
  arwu: 'ARWU',
  usnews: 'US News'
};

const SOURCE_MAX_RANKS = {
  qs: 1000,
  the: 999,
  arwu: 1000,
  usnews: 980
};

const CHART_COLORS = ['#6366f1', '#ec4899', '#14b8a6'];
const CHART_FILLS = ['rgba(99,102,241,0.15)', 'rgba(236,72,153,0.15)', 'rgba(20,184,166,0.15)'];

const ComparisonPanel = ({ universities, onClose, onRemove }) => {
  const [copied, setCopied] = React.useState(false);

  // Build radar data: each axis is a source, each university is a separate radar
  const radarData = useMemo(() => {
    return Object.entries(SOURCE_LABELS).map(([key, label]) => {
      const row = { source: label };
      universities.forEach((uni, i) => {
        const rank = uni.originalRankings[key]?.rank;
        const maxRank = SOURCE_MAX_RANKS[key];
        row[`uni${i}`] = rank ? Math.max(0, maxRank - rank + 1) : 0;
        row[`rank${i}`] = rank || null;
      });
      return row;
    });
  }, [universities]);

  // Compute score deltas between universities
  const deltas = useMemo(() => {
    if (universities.length < 2) return [];
    const pairs = [];
    for (let i = 0; i < universities.length; i++) {
      for (let j = i + 1; j < universities.length; j++) {
        const a = universities[i];
        const b = universities[j];
        pairs.push({
          a: a.name,
          b: b.name,
          scoreDelta: (a.aggregatedScore - b.aggregatedScore).toFixed(1),
          rankDelta: b.aggregatedRank - a.aggregatedRank,
        });
      }
    }
    return pairs;
  }, [universities]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/60 rounded-xl p-3 shadow-lg text-sm backdrop-blur-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry, i) => {
          const uniIndex = parseInt(entry.dataKey.replace('uni', ''), 10);
          const rankKey = `rank${uniIndex}`;
          const rank = entry.payload[rankKey];
          return (
            <p key={i} className="text-xs text-muted-foreground" style={{ color: entry.color }}>
              {universities[uniIndex]?.name?.split(' ').slice(0, 3).join(' ')}:{' '}
              {rank ? `#${rank}` : 'Not ranked'}
            </p>
          );
        })}
      </div>
    );
  };

  const getBestInCategory = (key) => {
    let bestIdx = -1;
    let bestRank = Infinity;
    universities.forEach((uni, i) => {
      const rank = uni.originalRankings[key]?.rank;
      if (rank && rank < bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-5xl mx-4 my-8 bg-background rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-space tracking-tight">University Comparison</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Side-by-side analysis of {universities.length} universities
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-primary/5 text-primary border border-primary/15
                  hover:bg-primary/10 hover:border-primary/25
                  transition-all duration-200 cursor-pointer"
              >
                {copied ? <Check size={12} /> : <Share2 size={12} />}
                {copied ? 'Copied' : 'Share'}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close comparison"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* University Header Cards */}
            <div className={`grid gap-4 ${universities.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {universities.map((uni, i) => (
                <div
                  key={uni.name}
                  className="relative p-4 rounded-xl border border-border/60 bg-card"
                >
                  <button
                    onClick={() => onRemove(uni.name)}
                    className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={`Remove ${uni.name}`}
                  >
                    <X size={14} />
                  </button>
                  <div
                    className="w-3 h-3 rounded-full mb-3"
                    style={{ backgroundColor: CHART_COLORS[i] }}
                  />
                  <h3 className="font-bold text-sm leading-snug pr-6">{uni.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <MapPin size={11} />
                    <span>{uni.country}</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-space text-gradient">
                      #{uni.aggregatedRank}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Score: {uni.aggregatedScore.toFixed(1)}
                    </span>
                  </div>
                  {uni.countryRank && (
                    <div className="mt-1.5 text-[10px] text-muted-foreground">
                      #{uni.countryRank}{uni.countryTotal ? ` of ${uni.countryTotal}` : ''} in {uni.country}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overlaid Radar Chart */}
            <div className="p-6 rounded-xl border border-border/60 bg-card">
              <h3 className="text-sm font-bold mb-1">Ranking Profile Overlay</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Higher values indicate better rankings. Unranked sources show as zero.
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid
                      stroke="currentColor"
                      className="text-border"
                      strokeOpacity={0.3}
                    />
                    <PolarAngleAxis
                      dataKey="source"
                      tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                      className="text-muted-foreground"
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 1000]}
                      tick={false}
                      axisLine={false}
                    />
                    {universities.map((uni, i) => (
                      <Radar
                        key={uni.name}
                        name={uni.name.length > 30 ? uni.name.slice(0, 28) + '...' : uni.name}
                        dataKey={`uni${i}`}
                        stroke={CHART_COLORS[i]}
                        fill={CHART_FILLS[i]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: CHART_COLORS[i], strokeWidth: 0 }}
                      />
                    ))}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source-by-Source Rank Columns */}
            <div className="p-6 rounded-xl border border-border/60 bg-card">
              <h3 className="text-sm font-bold mb-4">Source-by-Source Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                      {universities.map((uni, i) => (
                        <th key={uni.name} className="text-center py-2 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: CHART_COLORS[i] }}>
                          {uni.name.split(' ').slice(0, 2).join(' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => {
                      const bestIdx = getBestInCategory(key);
                      const colors = SOURCE_COLORS[key];
                      return (
                        <tr key={key} className="border-b border-border/30">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                              <span className="font-medium">{label}</span>
                            </div>
                          </td>
                          {universities.map((uni, i) => {
                            const rank = uni.originalRankings[key]?.rank;
                            const isBest = i === bestIdx;
                            return (
                              <td key={uni.name} className="text-center py-3 px-3">
                                {rank ? (
                                  <span className={`font-mono font-bold ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                    #{rank}
                                    {isBest && <Trophy size={10} className="inline ml-1 -mt-0.5" />}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50 italic text-xs">N/R</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Aggregated row */}
                    <tr className="border-t-2 border-border/60">
                      <td className="py-3 pr-4 font-bold text-xs uppercase tracking-wider text-foreground">Consensus</td>
                      {universities.map((uni, i) => {
                        const isBest = universities.every((other, j) => j === i || uni.aggregatedRank <= other.aggregatedRank);
                        return (
                          <td key={uni.name} className="text-center py-3 px-3">
                            <span className={`font-mono font-black text-base ${isBest ? 'text-gradient' : 'text-foreground'}`}>
                              #{uni.aggregatedRank}
                            </span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {uni.aggregatedScore.toFixed(1)} pts
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Score Deltas */}
            {deltas.length > 0 && (
              <div className="p-6 rounded-xl border border-border/60 bg-card">
                <h3 className="text-sm font-bold mb-4">Head-to-Head Deltas</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {deltas.map((d, i) => {
                    const scoreDiff = parseFloat(d.scoreDelta);
                    const isPositive = scoreDiff > 0;
                    const isNeutral = scoreDiff === 0;
                    return (
                      <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-foreground truncate">{d.a.split(' ').slice(0, 3).join(' ')}</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-xs font-bold text-foreground truncate">{d.b.split(' ').slice(0, 3).join(' ')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {isNeutral ? (
                              <Minus size={14} className="text-muted-foreground" />
                            ) : isPositive ? (
                              <ArrowUp size={14} className="text-emerald-500" />
                            ) : (
                              <ArrowDown size={14} className="text-red-500" />
                            )}
                            <span className={`font-mono font-bold text-sm ${
                              isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isPositive ? '+' : ''}{d.scoreDelta} pts
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {Math.abs(d.rankDelta)} rank{Math.abs(d.rankDelta) !== 1 ? 's' : ''} apart
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Consensus Category */}
            <div className="p-6 rounded-xl border border-border/60 bg-card">
              <h3 className="text-sm font-bold mb-4">Consensus Analysis</h3>
              <div className={`grid gap-4 ${universities.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {universities.map((uni, i) => {
                  const category = uni.insights?.disagreement?.category || 'unknown';
                  const spread = uni.insights?.disagreement?.spread;
                  const pct = uni.insights?.disagreement?.consistencyPercentile;
                  const catStyles = {
                    'high-consensus': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    'moderate-consensus': 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20',
                    'moderate-disagreement': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    'high-disagreement': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                    'unknown': 'bg-muted text-muted-foreground border-border/50',
                  };
                  const catLabels = {
                    'high-consensus': 'High Consensus',
                    'moderate-consensus': 'Moderate Consensus',
                    'moderate-disagreement': 'Moderate Disagreement',
                    'high-disagreement': 'High Disagreement',
                    'unknown': 'Unknown',
                  };
                  return (
                    <div key={uni.name} className="text-center">
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: CHART_COLORS[i] }}
                      />
                      <div className="text-xs font-bold truncate mb-2">{uni.name.split(' ').slice(0, 3).join(' ')}</div>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${catStyles[category]}`}>
                        {catLabels[category]}
                      </span>
                      {spread !== null && spread !== undefined && (
                        <div className="text-[10px] text-muted-foreground mt-2">
                          Spread: {spread} ranks
                        </div>
                      )}
                      {pct !== undefined && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          More consistent than {pct}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ComparisonPanel;

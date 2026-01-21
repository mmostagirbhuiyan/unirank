import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

const SOURCE_COLORS = {
  qs: '#f97316',      // orange
  the: '#eab308',     // yellow
  arwu: '#ef4444',    // red
  usnews: '#3b82f6'   // blue
};

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

const RankRadar = ({ university }) => {
  const { originalRankings, insights } = university;
  const { disagreement } = insights || {};

  // Transform data for radar chart
  // Invert ranks so that #1 appears at the outer edge (higher is better)
  const radarData = Object.entries(SOURCE_LABELS).map(([key, label]) => {
    const ranking = originalRankings[key];
    const rank = ranking?.rank;
    const maxRank = SOURCE_MAX_RANKS[key];

    // Convert rank to a score where lower rank = higher score
    // If rank is 1, score approaches maxRank. If rank is maxRank, score is ~0
    const score = rank ? Math.max(0, maxRank - rank + 1) : 0;

    return {
      source: label,
      score: score,
      rank: rank,
      maxScore: maxRank,
      fullMark: maxRank
    };
  });

  // Determine color based on disagreement category
  const getCategoryColor = () => {
    if (!disagreement) return 'rgba(59, 130, 246, 0.3)'; // blue default
    switch (disagreement.category) {
      case 'high-consensus':
        return 'rgba(34, 197, 94, 0.4)'; // green
      case 'moderate-consensus':
        return 'rgba(132, 204, 22, 0.4)'; // lime
      case 'moderate-disagreement':
        return 'rgba(234, 179, 8, 0.4)'; // yellow
      case 'high-disagreement':
        return 'rgba(239, 68, 68, 0.4)'; // red
      default:
        return 'rgba(107, 114, 128, 0.3)'; // gray
    }
  };

  const getStrokeColor = () => {
    if (!disagreement) return '#3b82f6';
    switch (disagreement.category) {
      case 'high-consensus':
        return '#22c55e';
      case 'moderate-consensus':
        return '#84cc16';
      case 'moderate-disagreement':
        return '#eab308';
      case 'high-disagreement':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-sm">
          <p className="font-medium text-foreground">{data.source}</p>
          {data.rank ? (
            <p className="text-muted-foreground">Rank #{data.rank}</p>
          ) : (
            <p className="text-muted-foreground italic">Not ranked</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Get spread badge color
  const getSpreadBadgeStyle = () => {
    if (!disagreement || disagreement.spread === null) {
      return 'bg-muted text-muted-foreground';
    }
    if (disagreement.spread <= 10) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (disagreement.spread <= 50) return 'bg-lime-500/10 text-lime-600 dark:text-lime-400';
    if (disagreement.spread <= 200) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    return 'bg-red-500/10 text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Spread Badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Source Agreement</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSpreadBadgeStyle()}`}>
          {disagreement?.spread !== null && disagreement?.spread !== undefined
            ? `Spread: ${disagreement.spread} ranks`
            : 'Limited data'}
        </span>
      </div>

      {/* Radar Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid
              stroke="currentColor"
              className="text-border"
              strokeOpacity={0.3}
            />
            <PolarAngleAxis
              dataKey="source"
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1000]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Rank Score"
              dataKey="score"
              stroke={getStrokeColor()}
              fill={getCategoryColor()}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: getStrokeColor(),
                strokeWidth: 0
              }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(SOURCE_LABELS).map(([key, label]) => {
          const ranking = originalRankings[key];
          const rank = ranking?.rank;
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SOURCE_COLORS[key] }}
              />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium text-foreground">
                {rank ? `#${rank}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Consistency Percentile */}
      {disagreement?.consistencyPercentile !== undefined && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            More consistent than <span className="font-semibold text-foreground">{disagreement.consistencyPercentile}%</span> of universities
          </p>
        </div>
      )}
    </div>
  );
};

export default RankRadar;

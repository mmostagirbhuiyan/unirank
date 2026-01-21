import React from 'react';
import { CheckCircle, AlertTriangle, HelpCircle, Users } from 'lucide-react';

const CATEGORY_CONFIG = {
  'high-consensus': {
    icon: CheckCircle,
    label: 'High Consensus',
    description: 'All ranking sources agree closely',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  'moderate-consensus': {
    icon: CheckCircle,
    label: 'Moderate Consensus',
    description: 'Sources generally agree',
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20'
  },
  'moderate-disagreement': {
    icon: AlertTriangle,
    label: 'Some Disagreement',
    description: 'Sources have varying opinions',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },
  'high-disagreement': {
    icon: AlertTriangle,
    label: 'High Disagreement',
    description: 'Sources significantly disagree',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  'insufficient-data': {
    icon: HelpCircle,
    label: 'Limited Data',
    description: 'Only one source available',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20'
  }
};

const ConsensusIndicator = ({ university }) => {
  const { insights } = university;
  const { disagreement, similarUniversities } = insights || {};

  const category = disagreement?.category || 'insufficient-data';
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Main Status Badge */}
      <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <Icon className={`${config.color} flex-shrink-0 mt-0.5`} size={24} />
          <div className="space-y-1">
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {disagreement && disagreement.spread !== null && (
        <div className="grid grid-cols-2 gap-3">
          {/* Spread */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Rank Spread</div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {disagreement.spread}
            </div>
            <div className="text-xs text-muted-foreground">
              #{disagreement.minRank} to #{disagreement.maxRank}
            </div>
          </div>

          {/* Consistency Percentile */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Consistency</div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {disagreement.consistencyPercentile ?? '—'}%
            </div>
            <div className="text-xs text-muted-foreground">
              percentile
            </div>
          </div>
        </div>
      )}

      {/* Standard Deviation */}
      {disagreement && disagreement.stdDev !== null && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Standard Deviation</span>
            <span className="font-mono font-medium text-foreground">
              ±{disagreement.stdDev} ranks
            </span>
          </div>
        </div>
      )}

      {/* Similar Universities */}
      {similarUniversities && similarUniversities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} />
            <span>Similar profiles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {similarUniversities.map((name, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="pt-3 border-t border-border">
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            What does this mean?
          </summary>
          <div className="mt-2 text-xs text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">High Consensus (≤10 spread):</strong> All ranking
              agencies agree this university performs at a similar level.
            </p>
            <p>
              <strong className="text-foreground">High Disagreement (&gt;200 spread):</strong> This
              university excels in some areas (e.g., research) but ranks lower in others
              (e.g., international reputation). Consider what matters most to you.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ConsensusIndicator;

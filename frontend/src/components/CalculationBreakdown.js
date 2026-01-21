import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calculator, Info } from 'lucide-react';

const SOURCE_CONFIG = {
  qs: { label: 'QS', color: '#f97316', maxRank: 1000 },
  the: { label: 'THE', color: '#eab308', maxRank: 999 },
  arwu: { label: 'ARWU', color: '#ef4444', maxRank: 1000 },
  usnews: { label: 'US News', color: '#3b82f6', maxRank: 980 }
};

const CalculationBreakdown = ({ university }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { insights, aggregatedScore } = university;
  const { calculation } = insights || {};

  if (!calculation) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Calculation data not available
      </div>
    );
  }

  const { rawRanks, bordaScores, weightedScores, weightedSum, confidenceMultiplier, appearances } = calculation;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Borda Count Method</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Info size={14} />
          {showDetails ? 'Hide details' : 'Show formula'}
        </button>
      </div>

      {/* Formula Explanation (collapsible) */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 border border-border">
              <p className="font-mono text-muted-foreground">
                Borda Score = MaxRank - Rank + 1
              </p>
              <p className="font-mono text-muted-foreground">
                Final = (ΣWeighted Scores) × Confidence
              </p>
              <p className="font-mono text-muted-foreground">
                Confidence = 0.5 + 0.5 × (appearances / 4)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step-by-step breakdown */}
      <div className="space-y-3">
        {/* Step 1: Raw Ranks */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            <span className="text-sm font-medium text-foreground">Source Rankings</span>
          </div>
          <div className="ml-7 grid grid-cols-2 gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
              const rank = rawRanks[key];
              return (
                <div key={key} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
                  <span className="text-xs font-medium" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-xs text-foreground font-mono">
                    {rank !== null ? `#${rank}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground rotate-90" size={16} />
        </div>

        {/* Step 2: Borda Scores */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            <span className="text-sm font-medium text-foreground">Borda Transformation</span>
          </div>
          <div className="ml-7 grid grid-cols-2 gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
              const borda = bordaScores[key];
              const isNegative = borda < 0;
              return (
                <div key={key} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
                  <span className="text-xs text-muted-foreground">
                    {config.maxRank} - {rawRanks[key] ?? 'N/A'} + 1
                  </span>
                  <span className={`text-xs font-mono font-medium ${isNegative ? 'text-red-500' : 'text-foreground'}`}>
                    {borda !== undefined ? (isNegative ? borda.toFixed(0) : borda) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground rotate-90" size={16} />
        </div>

        {/* Step 3: Weighted Sum */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            <span className="text-sm font-medium text-foreground">Weighted (×0.25 each)</span>
          </div>
          <div className="ml-7 bg-muted/30 rounded px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Object.values(weightedScores).map(s => s?.toFixed(1) || '0').join(' + ')}
              </span>
              <span className="text-sm font-mono font-medium text-foreground">
                = {weightedSum}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground rotate-90" size={16} />
        </div>

        {/* Step 4: Confidence Multiplier */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
            <span className="text-sm font-medium text-foreground">Confidence Multiplier</span>
          </div>
          <div className="ml-7 bg-muted/30 rounded px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                0.5 + 0.5 × ({appearances}/4)
              </span>
              <span className="text-sm font-mono font-medium text-foreground">
                = {confidenceMultiplier}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground rotate-90" size={16} />
        </div>

        {/* Final Result */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="text-primary" size={20} />
            <span className="text-sm font-bold text-foreground">Final Score</span>
          </div>
          <div className="ml-7 bg-primary/10 rounded-lg px-4 py-3 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {weightedSum} × {confidenceMultiplier}
              </span>
              <span className="text-xl font-bold font-mono text-primary">
                {aggregatedScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculationBreakdown;

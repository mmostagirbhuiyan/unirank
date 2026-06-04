import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calculator, Info } from 'lucide-react';
import { SOURCE_CONFIG } from '../constants';

const CalculationBreakdown = ({ university }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { insights, aggregatedScore } = university;
  const { calculation } = insights || {};

  if (!calculation) {
    return (
      <div className="text-sm text-muted-foreground italic p-4 text-center">
        Calculation data not available
      </div>
    );
  }

  const { rawRanks, bordaScores, weightedScores, weightedSum, confidenceMultiplier, appearances } = calculation;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Borda Count Method</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Info size={13} />
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
            <div className="bg-muted/40 rounded-xl p-4 text-xs space-y-2 border border-border/30">
              <p className="font-mono text-muted-foreground">
                Borda Score = MaxRank - Rank + 1
              </p>
              <p className="font-mono text-muted-foreground">
                Final = (&Sigma;Weighted Scores) &times; Confidence
              </p>
              <p className="font-mono text-muted-foreground">
                Confidence = 0.5 + 0.5 &times; (appearances / 4)
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
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">1</span>
            <span className="text-sm font-semibold text-foreground">Source Rankings</span>
          </div>
          <div className="ml-8 grid grid-cols-2 gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
              const rank = rawRanks[key];
              return (
                <div key={key} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-xs text-foreground font-mono font-medium">
                    {rank !== null ? `#${rank}` : '\u2014'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground/50 rotate-90" size={16} />
        </div>

        {/* Step 2: Borda Scores */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">2</span>
            <span className="text-sm font-semibold text-foreground">Borda Transformation</span>
          </div>
          <div className="ml-8 grid grid-cols-2 gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
              const borda = bordaScores[key];
              const isNegative = borda < 0;
              return (
                <div key={key} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {config.maxRank} - {rawRanks[key] ?? 'N/A'} + 1
                  </span>
                  <span className={`text-xs font-mono font-semibold ${isNegative ? 'text-red-500' : 'text-foreground'}`}>
                    {borda !== undefined ? (isNegative ? borda.toFixed(0) : borda) : '\u2014'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground/50 rotate-90" size={16} />
        </div>

        {/* Step 3: Weighted Sum */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">3</span>
            <span className="text-sm font-semibold text-foreground">Weighted (&times;0.25 each)</span>
          </div>
          <div className="ml-8 bg-muted/30 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {Object.values(weightedScores).map(s => s?.toFixed(1) || '0').join(' + ')}
              </span>
              <span className="text-sm font-mono font-bold text-foreground">
                = {weightedSum}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground/50 rotate-90" size={16} />
        </div>

        {/* Step 4: Confidence Multiplier */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">4</span>
            <span className="text-sm font-semibold text-foreground">Confidence Multiplier</span>
          </div>
          <div className="ml-8 bg-muted/30 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                0.5 + 0.5 &times; ({appearances}/4)
              </span>
              <span className="text-sm font-mono font-bold text-foreground">
                = {confidenceMultiplier}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ChevronRight className="text-muted-foreground/50 rotate-90" size={16} />
        </div>

        {/* Final Result */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calculator className="text-primary" size={16} />
            </div>
            <span className="text-sm font-bold text-foreground">Final Score</span>
          </div>
          <div className="ml-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl px-4 py-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-mono">
                {weightedSum} &times; {confidenceMultiplier}
              </span>
              <span className="text-2xl font-black font-mono text-gradient">
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

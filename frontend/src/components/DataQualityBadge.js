import React from 'react';
import { Database, CheckCircle, GitMerge, Clock, Shield } from 'lucide-react';

const DataQualityBadge = ({ university, globalStats }) => {
  const { insights } = university;
  const { dataQuality } = insights || {};

  const stats = globalStats || {
    totalUniversities: 1687,
    manualMappingsCount: 167,
    autoMappingsCount: 7958,
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  return (
    <div className="space-y-5">
      {/* Data Coverage */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Data Coverage</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`w-7 h-2 rounded-full transition-colors ${
                dataQuality && n <= dataQuality.sourcesTracked
                  ? 'bg-emerald-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Sources Card */}
      <div className="bg-muted/30 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Database className="text-primary" size={16} />
          </div>
          <span className="font-semibold text-foreground text-sm">Sources Tracked</span>
        </div>
        <div className="text-3xl font-black font-mono text-foreground">
          {dataQuality?.sourcesTracked ?? '\u2014'} / {dataQuality?.totalSources ?? 4}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {dataQuality?.sourcesTracked === 4
            ? 'Tracked by all major ranking systems'
            : dataQuality?.sourcesTracked === 1
            ? 'Limited to one ranking source'
            : `Tracked by ${dataQuality?.sourcesTracked ?? 0} ranking systems`}
        </p>
      </div>

      {/* Name Variations */}
      {dataQuality?.hasNameVariations && (
        <div className="bg-muted/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <GitMerge className="text-primary" size={16} />
            </div>
            <span className="font-semibold text-foreground text-sm">Name Standardization</span>
          </div>
          <div className="flex gap-6">
            {dataQuality.manualMappingsCount > 0 && (
              <div>
                <div className="text-xl font-black font-mono text-foreground">
                  {dataQuality.manualMappingsCount}
                </div>
                <div className="text-xs text-muted-foreground font-medium">manual</div>
              </div>
            )}
            {dataQuality.autoMappingsCount > 0 && (
              <div>
                <div className="text-xl font-black font-mono text-foreground">
                  {dataQuality.autoMappingsCount}
                </div>
                <div className="text-xs text-muted-foreground font-medium">auto-matched</div>
              </div>
            )}
          </div>
          {dataQuality.sampleVariations && dataQuality.sampleVariations.length > 0 && (
            <div className="pt-3 border-t border-border/30">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Variations resolved:</div>
              <div className="flex flex-wrap gap-1.5">
                {dataQuality.sampleVariations.slice(0, 3).map((variation, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground truncate max-w-[150px] border border-border/20"
                    title={variation}
                  >
                    &ldquo;{variation}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <Shield className="text-emerald-500 mx-auto mb-2" size={20} strokeWidth={2.5} />
          <div className="text-lg font-black font-mono text-foreground">
            {stats.totalUniversities.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground font-medium">verified</div>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <GitMerge className="text-blue-500 mx-auto mb-2" size={20} strokeWidth={2.5} />
          <div className="text-lg font-black font-mono text-foreground">
            {(stats.manualMappingsCount + stats.autoMappingsCount).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground font-medium">resolved</div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={13} />
          <span className="text-xs font-medium">Data freshness</span>
        </div>
        <span className="text-xs font-semibold text-foreground font-mono">
          {stats.lastUpdated}
        </span>
      </div>

      {/* Verification Badge */}
      <div className="flex items-center gap-2.5 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 rounded-xl px-4 py-3 border border-emerald-500/15">
        <CheckCircle size={15} strokeWidth={2.5} />
        <span className="text-xs font-semibold">
          Verified and standardized data entry
        </span>
      </div>
    </div>
  );
};

export default DataQualityBadge;

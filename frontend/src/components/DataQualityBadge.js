import React from 'react';
import { Database, CheckCircle, GitMerge, Clock, Shield } from 'lucide-react';

const DataQualityBadge = ({ university, globalStats }) => {
  const { insights } = university;
  const { dataQuality } = insights || {};

  // Default global stats if not provided
  const stats = globalStats || {
    totalUniversities: 1687,
    manualMappingsCount: 167,
    autoMappingsCount: 7958,
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  return (
    <div className="space-y-4">
      {/* Data Coverage */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Data Coverage</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`w-6 h-2 rounded-full ${
                dataQuality && n <= dataQuality.sourcesTracked
                  ? 'bg-emerald-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Sources Card */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="text-primary" size={18} />
          <span className="font-medium text-foreground">Sources Tracked</span>
        </div>
        <div className="text-3xl font-bold font-mono text-foreground">
          {dataQuality?.sourcesTracked ?? '—'} / {dataQuality?.totalSources ?? 4}
        </div>
        <p className="text-xs text-muted-foreground">
          {dataQuality?.sourcesTracked === 4
            ? 'Tracked by all major ranking systems'
            : dataQuality?.sourcesTracked === 1
            ? 'Limited to one ranking source'
            : `Tracked by ${dataQuality?.sourcesTracked ?? 0} ranking systems`}
        </p>
      </div>

      {/* Name Variations */}
      {dataQuality?.hasNameVariations && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitMerge className="text-primary" size={18} />
            <span className="font-medium text-foreground">Name Standardization</span>
          </div>
          <div className="flex gap-4">
            {dataQuality.manualMappingsCount > 0 && (
              <div>
                <div className="text-lg font-bold font-mono text-foreground">
                  {dataQuality.manualMappingsCount}
                </div>
                <div className="text-xs text-muted-foreground">manual</div>
              </div>
            )}
            {dataQuality.autoMappingsCount > 0 && (
              <div>
                <div className="text-lg font-bold font-mono text-foreground">
                  {dataQuality.autoMappingsCount}
                </div>
                <div className="text-xs text-muted-foreground">auto-matched</div>
              </div>
            )}
          </div>
          {dataQuality.sampleVariations && dataQuality.sampleVariations.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Variations resolved:</div>
              <div className="flex flex-wrap gap-1">
                {dataQuality.sampleVariations.slice(0, 3).map((variation, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground truncate max-w-[150px]"
                    title={variation}
                  >
                    "{variation}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <Shield className="text-emerald-500 mx-auto mb-1" size={20} />
          <div className="text-lg font-bold font-mono text-foreground">
            {stats.totalUniversities.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">verified universities</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <GitMerge className="text-blue-500 mx-auto mb-1" size={20} />
          <div className="text-lg font-bold font-mono text-foreground">
            {(stats.manualMappingsCount + stats.autoMappingsCount).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">name variations resolved</div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={14} />
          <span className="text-xs">Data freshness</span>
        </div>
        <span className="text-xs font-medium text-foreground">
          {stats.lastUpdated}
        </span>
      </div>

      {/* Verification Badge */}
      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-2 border border-emerald-500/20">
        <CheckCircle size={16} />
        <span className="text-xs font-medium">
          Verified and standardized data entry
        </span>
      </div>
    </div>
  );
};

export default DataQualityBadge;

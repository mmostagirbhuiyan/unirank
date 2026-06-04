import React from 'react';
import { SlidersHorizontal, Globe, Hash, X } from 'lucide-react';

const SORT_LABELS = {
  aggregatedRank: 'Rank (Aggregated)',
  qs: 'Rank (QS)',
  the: 'Rank (THE)',
  arwu: 'Rank (ARWU)',
  usnews: 'Rank (US News)',
  name: 'Name (A-Z)',
};

const FilterControls = ({ sortBy, onSortChange, selectedCountry, onCountryChange, selectedGroup, onGroupChange, uniqueCountries }) => {
  const hasActiveFilters = sortBy !== 'aggregatedRank' || selectedCountry !== '' || selectedGroup !== '';

  const chips = [];
  if (sortBy !== 'aggregatedRank') {
    chips.push({ key: 'sort', label: SORT_LABELS[sortBy] || sortBy, onClear: () => onSortChange('aggregatedRank') });
  }
  if (selectedCountry) {
    chips.push({ key: 'country', label: selectedCountry, onClear: () => onCountryChange('') });
  }
  if (selectedGroup) {
    chips.push({ key: 'group', label: selectedGroup, onClear: () => onGroupChange('') });
  }

  const clearAll = () => {
    onSortChange('aggregatedRank');
    onCountryChange('');
    onGroupChange('');
  };

  return (
    <div className="space-y-2">
      {/* Scrollable filter bar with fade hint */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pr-6">
          <div className="relative flex-shrink-0">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5 pointer-events-none" />
            <select
              className="bg-card text-foreground pl-9 pr-8 py-2.5 rounded-xl border border-border/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 appearance-none text-sm font-medium cursor-pointer transition-all min-w-[170px]"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="aggregatedRank">Rank (Aggregated)</option>
              <option value="qs">Rank (QS)</option>
              <option value="the">Rank (THE)</option>
              <option value="arwu">Rank (ARWU)</option>
              <option value="usnews">Rank (US News)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div className="relative flex-shrink-0">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5 pointer-events-none" />
            <select
              className="bg-card text-foreground pl-9 pr-8 py-2.5 rounded-xl border border-border/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 appearance-none text-sm font-medium cursor-pointer transition-all min-w-[150px]"
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
            >
              <option value="">All Countries</option>
              {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative flex-shrink-0">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5 pointer-events-none" />
            <select
              className="bg-card text-foreground pl-9 pr-8 py-2.5 rounded-xl border border-border/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 appearance-none text-sm font-medium cursor-pointer transition-all min-w-[150px]"
              value={selectedGroup}
              onChange={(e) => onGroupChange(e.target.value)}
            >
              <option value="">All Groups</option>
              <option value="Ivy League">Ivy League</option>
              <option value="Russell Group">Russell Group</option>
              <option value="Big Ten">Big Ten</option>
            </select>
          </div>
        </div>

        {/* Right fade gradient to hint scrollability on mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent md:hidden" />
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map(chip => (
            <button
              key={chip.key}
              onClick={chip.onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
                bg-primary/10 text-primary border border-primary/20
                hover:bg-primary/15 hover:border-primary/30
                transition-all duration-150 cursor-pointer group"
            >
              {chip.label}
              <X size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
          {chips.length > 1 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                text-muted-foreground hover:text-foreground
                hover:bg-muted/50
                transition-all duration-150 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterControls;

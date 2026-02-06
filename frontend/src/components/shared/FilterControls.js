import React from 'react';
import { SlidersHorizontal, Globe, Hash } from 'lucide-react';

const FilterControls = ({ sortBy, onSortChange, selectedCountry, onCountryChange, selectedGroup, onGroupChange, uniqueCountries }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar">
    <div className="relative">
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

    <div className="relative">
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

    <div className="relative">
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
);

export default FilterControls;

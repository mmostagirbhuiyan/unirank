import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, className = '' }) => (
  <div className={`relative flex-grow ${className}`}>
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
    <input
      type="text"
      placeholder="Search universities..."
      className="w-full bg-card text-foreground pl-11 pr-4 py-2.5 rounded-xl border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default SearchBar;

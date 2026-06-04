import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, suggestions = [], onSelectSuggestion, className = '' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const visibleSuggestions = suggestions.slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show dropdown when suggestions change and input is focused
  useEffect(() => {
    if (visibleSuggestions.length > 0 && document.activeElement === inputRef.current) {
      setShowDropdown(true);
    }
    setActiveIndex(-1);
  }, [visibleSuggestions.length, value]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const selectItem = useCallback((university) => {
    onChange(university.name);
    if (onSelectSuggestion) onSelectSuggestion(university);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [onChange, onSelectSuggestion]);

  const handleKeyDown = (e) => {
    if (!showDropdown || visibleSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < visibleSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : visibleSuggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectItem(visibleSuggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleInputChange = (e) => {
    onChange(e.target.value);
    if (!e.target.value) {
      setShowDropdown(false);
    }
  };

  const getRankDisplay = (uni) => {
    const rank = uni.aggregatedRank;
    if (!rank || rank > 9998) return null;
    return `#${rank}`;
  };

  return (
    <div ref={wrapperRef} className={`relative flex-grow ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4 z-10" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search universities... (try MIT, UCLA, ETH)"
        aria-label="Search universities by name, country, or keyword"
        className="w-full bg-card text-foreground pl-11 pr-4 py-2.5 rounded-xl border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (visibleSuggestions.length > 0 && value) setShowDropdown(true); }}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="search-suggestions-list"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
        autoComplete="off"
      />
      {showDropdown && visibleSuggestions.length > 0 && (
        <ul
          ref={listRef}
          id="search-suggestions-list"
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden max-h-[360px] overflow-y-auto"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {visibleSuggestions.map((uni, idx) => {
            const rankStr = getRankDisplay(uni);
            return (
              <li
                key={uni.name}
                id={`search-suggestion-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm border-b border-border/30 last:border-b-0 ${
                  idx === activeIndex
                    ? 'bg-primary/10 dark:bg-primary/15'
                    : 'hover:bg-muted/50 dark:hover:bg-muted/30'
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(uni);
                }}
              >
                {rankStr && (
                  <span className="flex-shrink-0 w-10 text-xs font-semibold text-primary/80 dark:text-primary/70 tabular-nums text-right">
                    {rankStr}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{uni.name}</div>
                  {uni.country && (
                    <div className="text-xs text-muted-foreground/70 mt-0.5">{uni.country}</div>
                  )}
                </div>
                {uni.aggregatedScore > 0 && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground/50 tabular-nums">
                    {uni.aggregatedScore.toFixed(1)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { SOURCE_COLORS } from '../constants';

// Common abbreviation/alias lookup: maps shorthand to full canonical name
const ABBREVIATION_MAP = {
  'mit': 'Massachusetts Institute of Technology',
  'ucla': 'University of California Los Angeles',
  'ucsd': 'University of California San Diego',
  'ucsb': 'University of California Santa Barbara',
  'ucb': 'University of California Berkeley',
  'ucf': 'University of Central Florida',
  'uci': 'University of California Irvine',
  'ucd': 'University of California Davis',
  'ucsc': 'University of California Santa Cruz',
  'eth': 'ETH Zurich',
  'epfl': 'Ecole Polytechnique Federale de Lausanne',
  'lse': 'London School Economics & Political Science',
  'nus': 'National University of Singapore',
  'ntu': 'Nanyang Technological University',
  'nyu': 'New York University',
  'usc': 'University of Southern California',
  'upenn': 'University of Pennsylvania',
  'caltech': 'California Institute of Technology',
  'gatech': 'Georgia Institute of Technology',
  'cmu': 'Carnegie Mellon University',
  'uiuc': 'University of Illinois Urbana-Champaign',
  'umich': 'University of Michigan',
  'unc': 'University of North Carolina Chapel Hill',
  'ucl': 'University College London',
  'ic': 'Imperial College London',
  'imperial': 'Imperial College London',
  'kcl': "King's College London",
  'hku': 'University of Hong Kong',
  'kaist': 'Korea Advanced Institute of Science & Technology',
  'anu': 'Australian National University',
  'ubc': 'University of British Columbia',
  'utoronto': 'University of Toronto',
  'washu': 'Washington University in St. Louis',
  'wustl': 'Washington University in St. Louis',
  'bu': 'Boston University',
  'bc': 'Boston College',
  'uva': 'University of Virginia',
  'osu': 'Ohio State University',
  'psu': 'Pennsylvania State University',
  'tamu': 'Texas A&M University',
  'ut': 'University of Texas Austin',
  'uwash': 'University of Washington Seattle',
  'stanford': 'Stanford University',
  'harvard': 'Harvard University',
  'yale': 'Yale University',
  'princeton': 'Princeton University',
  'columbia': 'Columbia University',
  'cornell': 'Cornell University',
  'brown': 'Brown University',
  'dartmouth': 'Dartmouth College',
  'oxford': 'University of Oxford',
  'cambridge': 'University of Cambridge',
  'edinburgh': 'University of Edinburgh',
  'manchester': 'University of Manchester',
  'berkeley': 'University of California Berkeley',
  'penn': 'University of Pennsylvania',
  'purdue': 'Purdue University',
  'rutgers': 'Rutgers University New Brunswick',
  'duke': 'Duke University',
  'rice': 'Rice University',
  'vanderbilt': 'Vanderbilt University',
  'emory': 'Emory University',
  'georgetown': 'Georgetown University',
  'northwestern': 'Northwestern University',
  'notredame': 'University of Notre Dame',
};

const IVY_LEAGUE = ["Brown University", "Columbia University", "Cornell University", "Dartmouth College", "Harvard University", "University of Pennsylvania", "Princeton University", "Yale University"];
const BIG_TEN = ["University of Illinois Urbana-Champaign", "Indiana University Bloomington", "University of Iowa", "University of Maryland College Park", "University of Michigan", "Michigan State University", "University of Minnesota Twin Cities", "University of Nebraska Lincoln", "Northwestern University", "Ohio State University", "University of Oregon", "Pennsylvania State University", "Purdue University", "Rutgers University New Brunswick", "University of California Los Angeles", "University of Southern California", "University of Washington Seattle", "University of Wisconsin Madison"];
const RUSSELL_GROUP = ["University of Birmingham", "University of Bristol", "University of Cambridge", "Cardiff University", "Durham University", "University of Edinburgh", "University of Exeter", "University of Glasgow", "Imperial College London", "King's College London", "University of Leeds", "University of Liverpool", "London School Economics & Political Science", "University of Manchester", "Newcastle University - UK", "University of Nottingham", "University of Oxford", "Queen Mary University London", "Queens University Belfast", "University of Sheffield", "University of Southampton", "University College London", "University of Warwick", "University of York - UK"];

const ITEMS_PER_PAGE = 50;

// Local slug helper (mirrors utils/slug.js to avoid circular deps)
function toSlugLocal(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export { IVY_LEAGUE, BIG_TEN, RUSSELL_GROUP, SOURCE_COLORS, ITEMS_PER_PAGE };

export default function useUniversityData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [universities, setUniversities] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [compareIds, setCompareIdsRaw] = useState([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  // Read initial filter state from URL query params
  const searchTerm = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'aggregatedRank';
  const selectedCountry = searchParams.get('country') || '';
  const selectedGroup = searchParams.get('group') || '';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;
  const expandedId = searchParams.get('expanded') || null;
  const compareParam = searchParams.get('compare') || '';

  // Stable updater: sets a single query param while preserving the rest
  const setParam = useCallback((key, value, defaults = {}) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const defaultVal = defaults[key] ?? '';
      if (!value || value === defaultVal) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearchTerm = useCallback((v) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!v) { next.delete('q'); } else { next.set('q', v); }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSortBy = useCallback((v) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (v === 'aggregatedRank') { next.delete('sort'); } else { next.set('sort', v); }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSelectedCountry = useCallback((v) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!v) { next.delete('country'); } else { next.set('country', v); }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSelectedGroup = useCallback((v) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!v) { next.delete('group'); } else { next.set('group', v); }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setCurrentPage = useCallback((v) => {
    setParam('page', v === 1 ? '' : String(v));
  }, [setParam]);

  const setExpandedId = useCallback((v) => {
    setParam('expanded', v || '');
  }, [setParam]);

  // Comparison: sync URL param -> state on load and when universities change
  const compareInitRef = useRef(false);
  useEffect(() => {
    if (!compareParam || !universities.length) {
      if (compareParam && !universities.length) return; // wait for data
      setCompareIdsRaw([]);
      return;
    }
    const slugs = compareParam.split(',').filter(Boolean).slice(0, 3);
    const matched = slugs
      .map(slug => universities.find(u => toSlugLocal(u.name) === slug))
      .filter(Boolean)
      .map(u => u.name);
    setCompareIdsRaw(matched);
    // Auto-open panel on first load if URL has 2+ compare params
    if (!compareInitRef.current && matched.length >= 2) {
      compareInitRef.current = true;
      setShowComparePanel(true);
    }
  }, [compareParam, universities]);

  const setCompareIds = useCallback((names) => {
    const capped = names.slice(0, 3);
    setCompareIdsRaw(capped);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (capped.length === 0) {
        next.delete('compare');
      } else {
        next.set('compare', capped.map(n => toSlugLocal(n)).join(','));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleCompare = useCallback((universityName) => {
    setCompareIdsRaw(prev => {
      const already = prev.includes(universityName);
      let next;
      if (already) {
        next = prev.filter(n => n !== universityName);
      } else if (prev.length >= 3) {
        return prev; // max 3
      } else {
        next = [...prev, universityName];
      }
      // sync to URL
      setSearchParams(sp => {
        const params = new URLSearchParams(sp);
        if (next.length === 0) {
          params.delete('compare');
        } else {
          params.set('compare', next.map(n => toSlugLocal(n)).join(','));
        }
        return params;
      }, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const removeFromCompare = useCallback((universityName) => {
    setCompareIdsRaw(prev => {
      const next = prev.filter(n => n !== universityName);
      setSearchParams(sp => {
        const params = new URLSearchParams(sp);
        if (next.length === 0) {
          params.delete('compare');
        } else {
          params.set('compare', next.map(n => toSlugLocal(n)).join(','));
        }
        return params;
      }, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const clearCompare = useCallback(() => {
    setCompareIdsRaw([]);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('compare');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Resolve compareIds to full university objects
  const compareUniversities = useMemo(() => {
    if (!compareIds.length || !universities.length) return [];
    return compareIds.map(name => universities.find(u => u.name === name)).filter(Boolean);
  }, [compareIds, universities]);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetch(process.env.PUBLIC_URL + '/data/enhanced-aggregated-rankings.json').then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetch(process.env.PUBLIC_URL + '/data/global-stats.json').then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
    ])
      .then(([data, stats]) => {
        setUniversities(data);
        setGlobalStats(stats);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading enhanced data, falling back to basic:', err);
        fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json')
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(data => { setUniversities(data); setIsLoading(false); })
          .catch(fallbackErr => {
            console.error('Fallback fetch also failed:', fallbackErr);
            setError('Unable to load university rankings. Please check your connection and try again.');
            setIsLoading(false);
          });
      });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uniqueCountries = useMemo(() => [...new Set(universities.map(u => u.country).filter(Boolean))].sort(), [universities]);

  // Build Fuse index with search aliases from abbreviation map
  const fuseRef = useRef(null);
  const fuseData = useMemo(() => {
    if (!universities.length) return [];
    const abbrevReverse = {};
    for (const [abbr, fullName] of Object.entries(ABBREVIATION_MAP)) {
      const lower = fullName.toLowerCase();
      if (!abbrevReverse[lower]) abbrevReverse[lower] = [];
      abbrevReverse[lower].push(abbr);
    }
    return universities.map(u => {
      const aliases = abbrevReverse[u.name.toLowerCase()] || [];
      return { ...u, searchAliases: aliases.join(' ') };
    });
  }, [universities]);

  useMemo(() => {
    if (!fuseData.length) { fuseRef.current = null; return; }
    fuseRef.current = new Fuse(fuseData, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'country', weight: 0.2 },
        { name: 'searchAliases', weight: 0.2 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1,
    });
  }, [fuseData]);

  // Autocomplete suggestions: top 8 fuzzy matches for current search term
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || !fuseRef.current) return [];
    // Check if the search term matches an abbreviation directly
    const abbrevMatch = ABBREVIATION_MAP[searchTerm.toLowerCase().trim()];
    if (abbrevMatch) {
      // Search for the expanded name instead
      const results = fuseRef.current.search(abbrevMatch, { limit: 8 });
      return results.map(r => r.item);
    }
    const results = fuseRef.current.search(searchTerm, { limit: 8 });
    return results.map(r => r.item);
  }, [searchTerm]);

  const metrics = useMemo(() => {
    if (!universities.length) return null;
    const avgScore = universities.reduce((a, b) => a + b.aggregatedScore, 0) / universities.length;
    const topUni = universities.reduce((a, b) => a.aggregatedRank < b.aggregatedRank ? a : b);

    const counts = {};
    universities.forEach(u => counts[u.country] = (counts[u.country] || 0) + 1);
    const sortedCountries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      total: universities.length,
      countries: uniqueCountries.length,
      avgScore: avgScore.toFixed(1),
      topUni,
      topCountries: sortedCountries,
      chartData: {
        labels: sortedCountries.map(c => c[0]),
        datasets: [{
          data: sortedCountries.map(c => c[1]),
          backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      }
    };
  }, [universities, uniqueCountries]);

  const filteredData = useMemo(() => {
    let result = universities;

    if (selectedCountry) result = result.filter(u => u.country === selectedCountry);
    if (selectedGroup === "Ivy League") result = result.filter(u => IVY_LEAGUE.includes(u.name));
    if (selectedGroup === "Big Ten") result = result.filter(u => BIG_TEN.includes(u.name));
    if (selectedGroup === "Russell Group") result = result.filter(u => RUSSELL_GROUP.includes(u.name));

    if (searchTerm && fuseRef.current) {
      // Resolve abbreviation to full name for filtering
      const abbrevMatch = ABBREVIATION_MAP[searchTerm.toLowerCase().trim()];
      const query = abbrevMatch || searchTerm;
      const fuseResults = fuseRef.current.search(query);
      const matchIds = new Set(fuseResults.map(r => r.item.name));
      result = result.filter(u => matchIds.has(u.name));
    }

    return result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'aggregatedScore') return b.aggregatedScore - a.aggregatedScore;
      if (sortBy === 'aggregatedRank') return a.aggregatedRank - b.aggregatedRank;
      if (['qs', 'the', 'arwu', 'usnews'].includes(sortBy)) {
        const rankA = a.originalRankings[sortBy]?.rank ?? 9999;
        const rankB = b.originalRankings[sortBy]?.rank ?? 9999;
        return rankA - rankB;
      }
      return 0;
    });
  }, [universities, selectedCountry, selectedGroup, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return {
    data: {
      universities,
      globalStats,
      metrics,
      filteredData,
      paginatedData,
      searchTerm,
      sortBy,
      selectedCountry,
      selectedGroup,
      currentPage,
      totalPages,
      expandedId,
      selectedUniversity,
      isLoading,
      error,
      uniqueCountries,
      searchSuggestions,
      compareIds,
      compareUniversities,
      showComparePanel,
    },
    actions: {
      setSearchTerm,
      setSortBy,
      setSelectedCountry,
      setSelectedGroup,
      setCurrentPage,
      setExpandedId,
      setSelectedUniversity,
      toggleCompare,
      removeFromCompare,
      clearCompare,
      setCompareIds,
      setShowComparePanel,
      retry: fetchData,
    },
    constants: {
      IVY_LEAGUE,
      BIG_TEN,
      RUSSELL_GROUP,
      SOURCE_COLORS,
      ITEMS_PER_PAGE,
    },
  };
}

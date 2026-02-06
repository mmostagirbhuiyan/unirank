import { useState, useEffect, useMemo } from 'react';

const IVY_LEAGUE = ["Brown University", "Columbia University", "Cornell University", "Dartmouth College", "Harvard University", "University of Pennsylvania", "Princeton University", "Yale University"];
const BIG_TEN = ["University of Illinois Urbana-Champaign", "Indiana University Bloomington", "University of Iowa", "University of Maryland College Park", "University of Michigan", "Michigan State University", "University of Minnesota Twin Cities", "University of Nebraska Lincoln", "Northwestern University", "Ohio State University", "University of Oregon", "Pennsylvania State University", "Purdue University", "Rutgers University New Brunswick", "University of California Los Angeles", "University of Southern California", "University of Washington Seattle", "University of Wisconsin Madison"];
const RUSSELL_GROUP = ["University of Birmingham", "University of Bristol", "University of Cambridge", "Cardiff University", "Durham University", "University of Edinburgh", "University of Exeter", "University of Glasgow", "Imperial College London", "King's College London", "University of Leeds", "University of Liverpool", "London School Economics & Political Science", "University of Manchester", "Newcastle University - UK", "University of Nottingham", "University of Oxford", "Queen Mary University London", "Queens University Belfast", "University of Sheffield", "University of Southampton", "University College London", "University of Warwick", "University of York - UK"];

const SOURCE_COLORS = {
  qs: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  the: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  arwu: { bg: 'bg-rose-500/10 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  usnews: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
};

const ITEMS_PER_PAGE = 50;

export { IVY_LEAGUE, BIG_TEN, RUSSELL_GROUP, SOURCE_COLORS, ITEMS_PER_PAGE };

export default function useUniversityData() {
  const [universities, setUniversities] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('aggregatedRank');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(process.env.PUBLIC_URL + '/data/enhanced-aggregated-rankings.json').then(res => res.json()),
      fetch(process.env.PUBLIC_URL + '/data/global-stats.json').then(res => res.json())
    ])
      .then(([data, stats]) => {
        setUniversities(data);
        setGlobalStats(stats);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading enhanced data, falling back to basic:', err);
        fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json')
          .then(res => res.json())
          .then(data => { setUniversities(data); setIsLoading(false); })
          .catch(e => console.error(e));
      });
  }, []);

  const uniqueCountries = useMemo(() => [...new Set(universities.map(u => u.country).filter(Boolean))].sort(), [universities]);

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

    if (searchTerm) {
      const token = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
      result = result.filter(u => u.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(token));
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCountry, selectedGroup, sortBy]);

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
      uniqueCountries,
    },
    actions: {
      setSearchTerm,
      setSortBy,
      setSelectedCountry,
      setSelectedGroup,
      setCurrentPage,
      setExpandedId,
      setSelectedUniversity,
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

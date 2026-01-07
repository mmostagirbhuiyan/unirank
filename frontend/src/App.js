import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  TrendingUp,
  Globe,
  Award,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Filter,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';

ChartJS.register(
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

// --- Constants ---
const IVY_LEAGUE = ["Brown University", "Columbia University", "Cornell University", "Dartmouth College", "Harvard University", "University of Pennsylvania", "Princeton University", "Yale University"];
const BIG_TEN = ["University of Illinois Urbana-Champaign", "Indiana University Bloomington", "University of Iowa", "University of Maryland College Park", "University of Michigan", "Michigan State University", "University of Minnesota Twin Cities", "University of Nebraska Lincoln", "Northwestern University", "Ohio State University", "University of Oregon", "Pennsylvania State University", "Purdue University", "Rutgers University New Brunswick", "University of California Los Angeles", "University of Southern California", "University of Washington Seattle", "University of Wisconsin Madison"];
const RUSSELL_GROUP = ["University of Birmingham", "University of Bristol", "University of Cambridge", "Cardiff University", "Durham University", "University of Edinburgh", "University of Exeter", "University of Glasgow", "Imperial College London", "King's College London", "University of Leeds", "University of Liverpool", "London School Economics & Political Science", "University of Manchester", "Newcastle University - UK", "University of Nottingham", "University of Oxford", "Queen Mary University London", "Queens University Belfast", "University of Sheffield", "University of Southampton", "University College London", "University of Warwick", "University of York - UK"];

// --- Components ---

const StatCard = ({ label, value, sub, icon: Icon, trend }) => (
  <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-violet-500/30">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={48} className="text-white" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className="text-3xl font-bold text-white mb-1 font-space tracking-tight">
        {value}
      </div>
      {sub && (
        <div className="text-sm text-zinc-500 flex items-center gap-2">
          {trend && <span className="text-emerald-400 flex items-center"><ArrowUpRight size={12} className="mr-1" />{trend}</span>}
          {sub}
        </div>
      )}
    </div>
  </div>
);

const Badge = ({ children, className = "", variant = "neutral" }) => {
  const variants = {
    neutral: "bg-zinc-800 text-zinc-300 border-zinc-700",
    primary: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/20"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const UniversityCard = ({ university, expanded, onToggle }) => {
  const bestRank = Math.min(...Object.values(university.originalRankings).map(r => r.rank));

  return (
    <div className={`glass-card rounded-xl border-white/5 overflow-hidden hover:border-white/10 ${expanded ? 'bg-zinc-800/40' : ''}`}>
      <div
        className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer"
        onClick={onToggle}
      >
        {/* Rank Box */}
        <div className="flex-shrink-0 flex flex-row md:flex-col items-center gap-3 md:gap-1 min-w-[80px]">
          <div className="text-3xl md:text-4xl font-bold text-white font-space">
            #{university.aggregatedRank}
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Rank</div>
        </div>

        {/* Info */}
        <div className="flex-grow min-w-0">
          <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-violet-300 transition-colors">
            {university.name}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-zinc-500" />
              {university.country}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
            <span className="font-mono text-zinc-500">Score: <span className="text-zinc-300">{university.aggregatedScore.toFixed(1)}</span></span>
            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
            <span className="text-zinc-500">Best: <span className="text-emerald-400">#{bestRank}</span></span>
          </div>
        </div>

        {/* Mini Grid */}
        <div className="hidden md:grid grid-cols-4 gap-2 w-full md:w-auto">
          {Object.entries(university.originalRankings).map(([source, data]) => (
            <div key={source} className="text-center px-3 py-2 bg-black/20 rounded-lg border border-white/5">
              <div className="text-xs text-zinc-500 uppercase mb-0.5">{source === 'usnews' ? 'USN' : source.toUpperCase()}</div>
              <div className="font-mono text-sm text-zinc-300">#{data.rank}</div>
            </div>
          ))}
        </div>

        <div className="ml-auto text-zinc-600">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/5 bg-black/20 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Rankings Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(university.originalRankings).map(([source, data]) => (
                  <div key={source} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${source === 'qs' ? 'bg-orange-500' : source === 'the' ? 'bg-yellow-500' : source === 'arwu' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                      <span className="capitalize text-zinc-300 font-medium">
                        {source === 'usnews' ? 'US News & World Report' :
                          source === 'the' ? 'Times Higher Education' :
                            source === 'qs' ? 'QS World University' : 'ARWU (Shanghai)'}
                      </span>
                    </div>
                    <div className="font-mono text-white text-lg">#{data.rank}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-1">National Rank</div>
                  <div className="text-2xl font-bold text-white">#{university.countryRank}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-1">Consistency Score</div>
                  <div className="text-2xl font-bold text-white">{(university.aggregatedScore / 100).toFixed(1)}/20</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 col-span-2">
                  <div className="text-xs text-zinc-500 mb-1">Ranking Sources</div>
                  <div className="flex gap-2 mt-2">
                    {Object.keys(university.originalRankings).map(source => (
                      <Badge key={source} variant="neutral" className="uppercase">{source}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

function App() {
  const [universities, setUniversities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('aggregatedRank');
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json')
      .then(res => res.json())
      .then(data => { setUniversities(data); setIsLoading(false); })
      .catch(err => console.error(err));
  }, []);

  // --- Derived State ---
  const uniqueCountries = useMemo(() => [...new Set(universities.map(u => u.country).filter(Boolean))].sort(), [universities]);

  const metrics = useMemo(() => {
    if (!universities.length) return null;
    const avgScore = universities.reduce((a, b) => a + b.aggregatedScore, 0) / universities.length;
    const topUni = universities.reduce((a, b) => a.aggregatedRank < b.aggregatedRank ? a : b);

    // Country Counts
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
          backgroundColor: ['#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      }
    };
  }, [universities, uniqueCountries]);

  const filteredData = useMemo(() => {
    let result = universities;

    // Filter
    if (selectedCountry) result = result.filter(u => u.country === selectedCountry);
    if (selectedGroup === "Ivy League") result = result.filter(u => IVY_LEAGUE.includes(u.name));
    if (selectedGroup === "Big Ten") result = result.filter(u => BIG_TEN.includes(u.name));
    if (selectedGroup === "Russell Group") result = result.filter(u => RUSSELL_GROUP.includes(u.name));

    // Search
    if (searchTerm) {
      const token = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
      result = result.filter(u => u.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(token));
    }

    // Sort
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

  // Pagination
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-mono text-sm animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-violet-500/30">
      <div className="noise-bg"></div>

      {/* --- HEADER --- */}
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold font-space tracking-tight">Rankings<span className="text-violet-400">.AI</span></span>
            <Badge variant="primary" className="ml-2 hidden sm:flex">BETA</Badge>
          </div>
          <div className="text-xs text-zinc-500 font-mono hidden md:block">
            Global Database • Updated {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-12">

        {/* --- HERO --- */}
        <section className="mb-16 mt-8">
          <h1 className="text-6xl md:text-8xl font-black font-space mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">
            Rankings.<br />
            <span className="text-white">Redefined.</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl font-light leading-relaxed">
            A unified intelligence platform Aggregating global university data from QS, THE, ARWU, and US News into a single, decisive metric.
          </p>
        </section>

        {/* --- METRICS GRID --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          <StatCard icon={Globe} label="Universities Tracked" value={metrics.total} sub={`${metrics.countries} Countries Represented`} />
          <StatCard icon={Award} label="Top Performer" value={metrics.topUni.name} sub="Highest Aggregate Score" trend="#1 Globally" />
          <StatCard icon={TrendingUp} label="Global Average" value={metrics.avgScore} sub="Aggregate Index Score" />

          {/* Chart Card */}
          <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Top Region</div>
              <div className="text-2xl font-bold font-space">{metrics.topCountries[0][0]}</div>
              <div className="text-sm text-zinc-500">{metrics.topCountries[0][1]} Universities</div>
            </div>
            <div className="w-20 h-20">
              <Doughnut data={metrics.chartData} options={{ cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
            </div>
          </div>
        </section>


        {/* --- CONTROLS --- */}
        <section className="sticky top-20 z-20 mb-8">
          <div className="glass-panel rounded-2xl p-2 flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name..."
                className="w-full bg-black/20 text-white pl-12 pr-4 py-3 rounded-xl border border-white/5 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-zinc-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <select
                className="bg-black/20 text-zinc-300 px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-violet-500/50 appearance-none min-w-[160px]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="aggregatedRank">Rank (Aggregated)</option>
                <option value="qs">Rank (QS)</option>
                <option value="the">Rank (THE)</option>
                <option value="arwu">Rank (ARWU)</option>
                <option value="usnews">Rank (US News)</option>
                <option value="name">Name (A-Z)</option>
              </select>

              <select
                className="bg-black/20 text-zinc-300 px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-violet-500/50 appearance-none min-w-[160px]"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="">All Countries</option>
                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="bg-black/20 text-zinc-300 px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-violet-500/50 appearance-none min-w-[140px]"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">All Groups</option>
                <option value="Ivy League">Ivy League</option>
                <option value="Russell Group">Russell Group</option>
                <option value="Big Ten">Big Ten</option>
              </select>
            </div>
          </div>
        </section>

        {/* --- LIST --- */}
        <section className="space-y-3">
          <div className="px-4 text-xs font-mono text-zinc-500 uppercase tracking-widest flex justify-between items-center">
            <span>Showing {paginatedData.length} of {filteredData.length} Results</span>
            <span>Page {currentPage}</span>
          </div>

          {paginatedData.map((uni, i) => (
            <UniversityCard
              key={uni.name}
              university={uni}
              expanded={expandedId === i}
              onToggle={() => setExpandedId(expandedId === i ? null : i)}
            />
          ))}

          {paginatedData.length === 0 && (
            <div className="text-center py-20">
              <div className="text-zinc-600 text-lg">No universities found matching your criteria.</div>
            </div>
          )}
        </section>

        {/* --- PAGINATION --- */}
        <div className="mt-12 flex justify-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-4 py-2 rounded-lg bg-white/5 text-zinc-300 disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-zinc-500 font-mono">
            Page {currentPage}
          </span>
          <button
            disabled={paginatedData.length < itemsPerPage}
            onClick={() => {
              setCurrentPage(p => p + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-lg bg-white/5 text-zinc-300 disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            Next
          </button>
        </div>

      </main>
    </div>
  );
}

export default App;

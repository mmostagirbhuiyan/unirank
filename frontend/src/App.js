import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  Search,
  TrendingUp,
  Globe,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Sun,
  Moon,
  Monitor,
  Database,
  Layers,
  BarChart3
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
import EnhancedCardTabs from './components/EnhancedCardTabs';

ChartJS.register(
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

// --- Theme Context ---
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  // 'system', 'light', 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// --- Constants ---
const IVY_LEAGUE = ["Brown University", "Columbia University", "Cornell University", "Dartmouth College", "Harvard University", "University of Pennsylvania", "Princeton University", "Yale University"];
const BIG_TEN = ["University of Illinois Urbana-Champaign", "Indiana University Bloomington", "University of Iowa", "University of Maryland College Park", "University of Michigan", "Michigan State University", "University of Minnesota Twin Cities", "University of Nebraska Lincoln", "Northwestern University", "Ohio State University", "University of Oregon", "Pennsylvania State University", "Purdue University", "Rutgers University New Brunswick", "University of California Los Angeles", "University of Southern California", "University of Washington Seattle", "University of Wisconsin Madison"];
const RUSSELL_GROUP = ["University of Birmingham", "University of Bristol", "University of Cambridge", "Cardiff University", "Durham University", "University of Edinburgh", "University of Exeter", "University of Glasgow", "Imperial College London", "King's College London", "University of Leeds", "University of Liverpool", "London School Economics & Political Science", "University of Manchester", "Newcastle University - UK", "University of Nottingham", "University of Oxford", "Queen Mary University London", "Queens University Belfast", "University of Sheffield", "University of Southampton", "University College London", "University of Warwick", "University of York - UK"];

// --- Components ---

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex p-1 bg-muted rounded-full border border-border">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="System Mode"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, trend }) => (
  <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border relative overflow-hidden group hover:border-primary/40 transition-all shadow-sm">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={48} className="text-foreground" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className="text-3xl font-bold mb-1 font-space tracking-tight">
        {value}
      </div>
      {sub && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {trend && <span className="text-emerald-500 font-medium flex items-center"><ArrowUpRight size={14} className="mr-1" />{trend}</span>}
          {sub}
        </div>
      )}
    </div>
  </div>
);

const HighlightCard = ({ title, value, subtitle }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</div>
    <div className="text-3xl font-bold mt-3 font-space">{value}</div>
    <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
  </div>
);

const Badge = ({ children, className = "", variant = "neutral" }) => {
  const variants = {
    neutral: "bg-muted text-muted-foreground border-transparent",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const UniversityCard = ({ university, expanded, onToggle, globalStats }) => {
  const bestRank = Math.min(...Object.values(university.originalRankings).map(r => r.rank));
  const hasInsights = !!university.insights;

  // Get consensus badge for mini display
  const getConsensusBadge = () => {
    if (!hasInsights || !university.insights.disagreement) return null;
    const category = university.insights.disagreement.category;
    if (category === 'high-consensus') return { label: 'High Consensus', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    if (category === 'high-disagreement') return { label: 'Disputed', color: 'bg-red-500/10 text-red-600 dark:text-red-400' };
    return null;
  };
  const consensusBadge = getConsensusBadge();

  return (
    <div className={`bg-card text-card-foreground rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors duration-200 ${expanded ? 'ring-1 ring-primary/20' : ''} shadow-sm`}>
      <div
        className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer"
        onClick={onToggle}
      >
        {/* Rank Box */}
        <div className="flex-shrink-0 flex flex-row md:flex-col items-center gap-3 md:gap-1 min-w-[80px]">
          <div className="text-3xl md:text-4xl font-bold font-space text-foreground">
            #{university.aggregatedRank}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Rank</div>
        </div>

        {/* Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-xl font-bold break-words sm:truncate group-hover:text-primary transition-colors">
              {university.name}
            </h3>
            {consensusBadge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${consensusBadge.color}`}>
                {consensusBadge.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Globe size={14} />
              {university.country}
            </span>
            <span className="hidden sm:inline-flex w-1 h-1 rounded-full bg-border"></span>
            <span className="font-mono">Score: <span className="text-foreground font-medium">{university.aggregatedScore.toFixed(1)}</span></span>
            <span className="hidden sm:inline-flex w-1 h-1 rounded-full bg-border"></span>
            <span>Best: <span className="text-emerald-500 font-medium">#{bestRank}</span></span>
          </div>
        </div>

        {/* Mini Grid */}
        <div className="hidden md:grid grid-cols-4 gap-2 w-full md:w-auto">
          {Object.entries(university.originalRankings).map(([source, data]) => (
            <div key={source} className="text-center px-3 py-2 bg-muted/50 rounded-lg border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-0.5 font-bold">{source === 'usnews' ? 'USN' : source.toUpperCase()}</div>
              <div className="font-mono text-sm font-medium">#{data.rank}</div>
            </div>
          ))}
        </div>

        <div className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {hasInsights ? (
            <EnhancedCardTabs university={university} globalStats={globalStats} />
          ) : (
            /* Fallback to original view if no insights */
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Rankings Breakdown</h4>
                <div className="space-y-3">
                  {Object.entries(university.originalRankings).map(([source, data]) => (
                    <div key={source} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${source === 'qs' ? 'bg-orange-500' : source === 'the' ? 'bg-yellow-500' : source === 'arwu' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                        <span className="capitalize font-medium">
                          {source === 'usnews' ? 'US News & World Report' :
                            source === 'the' ? 'Times Higher Education' :
                              source === 'qs' ? 'QS World University' : 'ARWU (Shanghai)'}
                        </span>
                      </div>
                      <div className="font-mono text-lg font-bold">#{data.rank}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">National Rank</div>
                    <div className="text-2xl font-bold">#{university.countryRank}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Consistency Score</div>
                    <div className="text-2xl font-bold">{(university.aggregatedScore / 100).toFixed(1)}/10</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border shadow-sm col-span-2">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Ranking Sources</div>
                    <div className="flex gap-2">
                      {Object.keys(university.originalRankings).map(source => (
                        <Badge key={source} variant="neutral" className="uppercase">{source}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Content (Wrapped) ---
const MainApp = () => {
  const [universities, setUniversities] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('aggregatedRank');
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    // Load enhanced rankings (with insights) and global stats in parallel
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
        // Fallback to basic aggregated rankings if enhanced not available
        fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json')
          .then(res => res.json())
          .then(data => { setUniversities(data); setIsLoading(false); })
          .catch(e => console.error(e));
      });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-mono text-sm animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="noise-bg"></div>

      {/* --- HEADER --- */}
      <header className="relative z-50 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 transition-colors duration-300 supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Unified Rankings</div>
              <span className="text-lg font-bold font-space tracking-tight"><span className="text-foreground">Uni</span><span className="text-primary">Rank</span></span>
            </div>
            <Badge variant="primary" className="ml-2 hidden sm:flex">LIVE</Badge>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-xs text-muted-foreground font-mono hidden md:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Updated {new Date().toLocaleDateString()}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-12">

        {/* --- HERO --- */}
        <section className="mb-16 mt-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Global Intelligence Layer
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-space mt-6 mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground to-muted-foreground">
                University rankings,
                <span className="text-foreground"> orchestrated</span>.
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl font-light leading-relaxed">
                UniRank fuses QS, THE, ARWU, and US News into a single intelligence layer—revealing momentum, consensus, and gaps you can actually act on.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25">
                  Explore the leaderboard
                </button>
                <button className="px-6 py-3 rounded-full border border-border text-foreground font-semibold hover:border-primary/50 transition-colors">
                  View methodology
                </button>
              </div>

              {/* Pipeline Stats Banner */}
              {globalStats && (
                <div className="mt-10 grid sm:grid-cols-3 gap-4">
                  <HighlightCard
                    title="Universities"
                    value={globalStats.totalUniversities.toLocaleString()}
                    subtitle="institutions tracked globally"
                  />
                  <HighlightCard
                    title="Sources"
                    value={globalStats.totalSources}
                    subtitle="ranking systems unified"
                  />
                  <HighlightCard
                    title="Resolved"
                    value={(globalStats.manualMappingsCount + globalStats.autoMappingsCount).toLocaleString()}
                    subtitle="name variations reconciled"
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute -top-10 right-4 w-40 h-40 rounded-full bg-primary/20 blur-3xl"></div>
              <div className="absolute -bottom-10 left-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl"></div>
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Top Ranked</div>
                    <h2 className="text-2xl font-semibold mt-3">{metrics.topUni.name}</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <Award className="text-primary" size={20} />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-muted/60 rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Aggregate Rank</div>
                    <div className="text-3xl font-semibold mt-2">#{metrics.topUni.aggregatedRank}</div>
                  </div>
                  <div className="bg-muted/60 rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</div>
                    <div className="text-3xl font-semibold mt-2">{metrics.topUni.aggregatedScore.toFixed(1)}</div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground leading-relaxed">
                  A synthesis of four major rankings, continuously normalized and reconciled to surface true academic momentum.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- METRICS GRID --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          <StatCard icon={Globe} label="Universities Tracked" value={metrics.total} sub={`${metrics.countries} Countries Represented`} />
          <StatCard icon={Award} label="Top Performer" value={metrics.topUni.name} sub="Highest Aggregate Score" trend="#1 Globally" />
          <StatCard icon={TrendingUp} label="Global Average" value={metrics.avgScore} sub="Aggregate Index Score" />

          {/* Chart Card */}
          <div className="bg-card text-card-foreground p-6 rounded-2xl flex items-center justify-between border border-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-70"></div>
            <div className="relative z-10">
              <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Top Region</div>
              <div className="text-2xl font-bold font-space">{metrics.topCountries[0][0]}</div>
              <div className="text-sm text-muted-foreground">{metrics.topCountries[0][1]} Universities</div>
            </div>
            <div className="relative z-10 w-20 h-20">
              <Doughnut data={metrics.chartData} options={{ cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
            </div>
          </div>
        </section>

        <section className="mb-16 grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Database size={18} className="text-primary" />
              Data integrity pulse
            </div>
            <h3 className="text-2xl font-semibold mt-4">Confidence built into every rank.</h3>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              UniRank resolves naming conflicts, accounts for missing data, and fuses multiple methodologies into a consistent signal so you can compare globally without the noise.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="success">Consensus scoring</Badge>
              <Badge variant="primary">Borda count aggregation</Badge>
              <Badge variant="neutral">Pattern-based normalization</Badge>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Layers size={18} className="text-primary" />
              Signal stack
            </div>
            <h3 className="text-2xl font-semibold mt-4">See the full picture, faster.</h3>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Filter by region or academic group, compare ranking sources, and surface the schools with the strongest cross-source momentum.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-border p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Top country</div>
                <div className="text-xl font-semibold mt-2">{metrics.topCountries[0][0]}</div>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Average score</div>
                <div className="text-xl font-semibold mt-2">{metrics.avgScore}</div>
              </div>
            </div>
          </div>
        </section>


        {/* --- CONTROLS (DOCKED TOOLBAR) --- */}
        <section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-xl transition-all duration-300 shadow-sm supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command center</div>
                <h2 className="text-lg font-semibold">Refine the signal</h2>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {filteredData.length.toLocaleString()} universities in scope
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-grow">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search universities..."
                  className="w-full bg-muted/50 text-foreground pl-12 pr-4 py-3 rounded-xl border border-transparent focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/70 text-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <select
                  className="bg-muted/50 text-foreground px-4 py-3 rounded-xl border border-transparent outline-none focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none min-w-[180px] text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors"
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
                  className="bg-muted/50 text-foreground px-4 py-3 rounded-xl border border-transparent outline-none focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none min-w-[160px] text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="">All Countries</option>
                  {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  className="bg-muted/50 text-foreground px-4 py-3 rounded-xl border border-transparent outline-none focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none min-w-[160px] text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors"
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
          </div>
        </section>

        {/* --- LIST --- */}
        <section className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Ranked results</div>
              <h3 className="text-xl font-semibold mt-2">Global leaderboard</h3>
              <p className="text-sm text-muted-foreground mt-1">Showing {paginatedData.length} of {filteredData.length} institutions</p>
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Page {currentPage}
            </div>
          </div>

          {paginatedData.map((uni, i) => (
            <UniversityCard
              key={uni.name}
              university={uni}
              expanded={expandedId === i}
              onToggle={() => setExpandedId(expandedId === i ? null : i)}
              globalStats={globalStats}
            />
          ))}

          {paginatedData.length === 0 && (
            <div className="text-center py-20">
              <div className="text-muted-foreground text-lg">No universities found matching your criteria.</div>
            </div>
          )}
        </section>

        {/* --- PAGINATION --- */}
        <div className="mt-12 flex justify-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80 transition-colors font-medium text-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-muted-foreground font-mono text-sm">
            Page {currentPage}
          </span>
          <button
            disabled={paginatedData.length < itemsPerPage}
            onClick={() => {
              setCurrentPage(p => p + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80 transition-colors font-medium text-sm"
          >
            Next
          </button>
        </div>

      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

export default App;

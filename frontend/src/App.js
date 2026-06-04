import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import useUniversityData from './hooks/useUniversityData';
import BentoDashboardLayout from './layouts/BentoDashboardLayout';
import UniversityProfile from './pages/UniversityProfile';

const SkeletonCard = ({ delay }) => (
  <div
    className="bg-card rounded-2xl border border-border/60 overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="px-5 py-4 flex items-center gap-5">
      <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
      <div className="flex-grow space-y-2.5">
        <div className="h-4 w-3/5 rounded-md shimmer" />
        <div className="h-3 w-2/5 rounded-md shimmer" />
      </div>
      <div className="hidden lg:flex items-center gap-1.5">
        {[0, 1, 2].map(j => (
          <div key={j} className="w-14 h-10 rounded-lg shimmer" />
        ))}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { data, actions, constants } = useUniversityData();

  if (data.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <p className="text-foreground font-space font-semibold text-base mb-1.5">Failed to load rankings</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{data.error}</p>
          </div>
          <button
            onClick={actions.retry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
              bg-primary/10 text-primary border border-primary/20
              hover:bg-primary/20 hover:border-primary/30
              transition-all duration-200 cursor-pointer"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.isLoading || !data.metrics) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
                <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold font-space tracking-tight">
                <span className="text-foreground">Uni</span>
                <span className="text-gradient">Rank</span>
              </span>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4 text-center">
          <div className="h-8 w-64 mx-auto rounded-lg shimmer mb-3" />
          <div className="h-4 w-96 max-w-full mx-auto rounded-md shimmer" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} delay={i * 80} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <BentoDashboardLayout data={data} actions={actions} constants={constants} />;
};

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/university/:slug" element={<UniversityProfile />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;

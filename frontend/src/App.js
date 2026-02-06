import React from 'react';
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import { BarChart3 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import useUniversityData from './hooks/useUniversityData';
import BentoDashboardLayout from './layouts/BentoDashboardLayout';

ChartJS.register(
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

const MainApp = () => {
  const { data, actions, constants } = useUniversityData();

  if (data.isLoading || !data.metrics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
              <BarChart3 className="text-white w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-30 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-space font-semibold text-sm mb-1">Loading UniRank</p>
            <p className="text-muted-foreground text-xs">Aggregating global rankings...</p>
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
      <MainApp />
    </ThemeProvider>
  );
}

export default App;

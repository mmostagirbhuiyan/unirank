import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Calculator, Users, Database } from 'lucide-react';
import RankRadar from './RankRadar';
import CalculationBreakdown from './CalculationBreakdown';
import ConsensusIndicator from './ConsensusIndicator';
import DataQualityBadge from './DataQualityBadge';

const TABS = [
  { id: 'radar', label: 'Radar', icon: Radar, shortLabel: 'Radar' },
  { id: 'method', label: 'Method', icon: Calculator, shortLabel: 'Method' },
  { id: 'consensus', label: 'Consensus', icon: Users, shortLabel: 'Agree' },
  { id: 'quality', label: 'Data', icon: Database, shortLabel: 'Data' }
];

const EnhancedCardTabs = ({ university, globalStats }) => {
  const [activeTab, setActiveTab] = useState('radar');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'radar':
        return <RankRadar university={university} />;
      case 'method':
        return <CalculationBreakdown university={university} />;
      case 'consensus':
        return <ConsensusIndicator university={university} />;
      case 'quality':
        return <DataQualityBadge university={university} globalStats={globalStats} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border/30">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-card text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }
              `}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="min-h-[300px]"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default EnhancedCardTabs;

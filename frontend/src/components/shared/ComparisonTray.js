import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompareArrows, Plus } from 'lucide-react';

const MAX_COMPARE = 3;

const ComparisonTray = ({ compareUniversities, onRemove, onClear, onCompare }) => {
  if (!compareUniversities.length) return null;

  const emptySlots = MAX_COMPARE - compareUniversities.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto px-4 pb-4 pointer-events-auto">
          <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 p-4">
            <div className="flex items-center gap-3">
              {/* Label */}
              <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-muted-foreground flex-shrink-0">
                <GitCompareArrows size={16} className="text-primary" />
                <span>Compare</span>
              </div>

              {/* University chips */}
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
                {compareUniversities.map((uni) => (
                  <motion.div
                    key={uni.name}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl
                      bg-primary/8 border border-primary/15 text-sm font-medium flex-shrink-0 max-w-[200px]"
                  >
                    <span className="truncate text-foreground text-xs">{uni.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(uni.name); }}
                      className="p-0.5 rounded-md hover:bg-primary/15 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
                      aria-label={`Remove ${uni.name} from comparison`}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                      border border-dashed border-border/60 text-xs text-muted-foreground/50 flex-shrink-0"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onClear}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground
                    hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={onCompare}
                  disabled={compareUniversities.length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white
                    bg-gradient-to-r from-primary to-secondary
                    hover:shadow-lg hover:shadow-primary/25
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                    transition-all duration-200 cursor-pointer"
                >
                  Compare {compareUniversities.length}/{MAX_COMPARE}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ComparisonTray;

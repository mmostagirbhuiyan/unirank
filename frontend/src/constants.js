/**
 * Centralized source metadata for all ranking sources.
 * Single source of truth: import from here instead of duplicating.
 */

const SOURCES = {
  qs: {
    key: 'qs',
    label: 'QS',
    hex: '#f97316',
    maxRank: 1000,
    tailwind: {
      bg: 'bg-orange-500/10 dark:bg-orange-500/15',
      text: 'text-orange-600 dark:text-orange-400',
      dot: 'bg-orange-500',
    },
  },
  the: {
    key: 'the',
    label: 'THE',
    hex: '#eab308',
    maxRank: 999,
    tailwind: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
  },
  arwu: {
    key: 'arwu',
    label: 'ARWU',
    hex: '#ef4444',
    maxRank: 1000,
    tailwind: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    },
  },
  usnews: {
    key: 'usnews',
    label: 'US News',
    hex: '#3b82f6',
    maxRank: 980,
    tailwind: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      text: 'text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
    },
  },
};

/** Hex color lookup: { qs: '#f97316', ... } */
export const SOURCE_HEX = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, v.hex])
);

/** Label lookup: { qs: 'QS', ... } */
export const SOURCE_LABELS = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, v.label])
);

/** Max rank lookup: { qs: 1000, ... } */
export const SOURCE_MAX_RANKS = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, v.maxRank])
);

/** Tailwind class lookup (bg, text, dot): used by UniversityCard, BentoDashboardLayout, etc. */
export const SOURCE_COLORS = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, v.tailwind])
);

/** Combined config (label + hex + maxRank): used by CalculationBreakdown, RankRadar */
export const SOURCE_CONFIG = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, { label: v.label, color: v.hex, maxRank: v.maxRank }])
);

export default SOURCES;

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const StatCard = ({ label, value, sub, icon: Icon, trend }) => (
  <div className="group relative bg-card text-card-foreground p-6 rounded-2xl border border-border/60 overflow-hidden card-hover">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-secondary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</span>
        <div className="p-2 rounded-xl bg-primary/8 group-hover:bg-primary/12 transition-colors duration-300">
          <Icon size={16} className="text-primary" strokeWidth={2} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1.5 font-space tracking-tight text-foreground leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {trend && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} />
              {trend}
            </span>
          )}
          <span className="truncate">{sub}</span>
        </div>
      )}
    </div>
  </div>
);

export default StatCard;

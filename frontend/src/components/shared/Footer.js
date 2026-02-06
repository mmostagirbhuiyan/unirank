import React from 'react';
import { BarChart3 } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-border/40 bg-card/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <BarChart3 className="text-white w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-space font-semibold tracking-tight">
            <span className="text-foreground">Uni</span>
            <span className="text-gradient">Rank</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center sm:text-right">
          Aggregating QS, THE, ARWU & US News rankings with Borda Count methodology.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;

import React from 'react';
import { BarChart3, ExternalLink, Github } from 'lucide-react';

const DATA_SOURCES = [
  { label: 'QS', url: 'https://www.topuniversities.com/world-university-rankings' },
  { label: 'THE', url: 'https://www.timeshighereducation.com/world-university-rankings' },
  { label: 'ARWU', url: 'https://www.shanghairanking.com/' },
  { label: 'US News', url: 'https://www.usnews.com/education/best-global-universities/rankings' },
];

const GITHUB_URL = 'https://github.com/mmostagirbhuiyan/unirank';

const Footer = ({ lastUpdated }) => (
  <footer className="border-t border-border/40 bg-card/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand + credit */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-space font-semibold tracking-tight">
              <span className="text-foreground">Uni</span>
              <span className="text-gradient">Rank</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Aggregating QS, THE, ARWU &amp; US News rankings with Borda Count methodology into a single unified score.
          </p>
          <p className="text-xs text-muted-foreground">
            Built by{' '}
            <a
              href="https://mmostagirbhuiyan.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium hover:text-primary transition-colors"
            >
              Mostagir Bhuiyan
            </a>
          </p>
        </div>

        {/* Methodology */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest">Methodology</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rankings are combined using a <span className="text-foreground font-medium">Borda Count with Penalized Absence</span> method.
            Each source awards points inversely proportional to rank (MaxRank - Rank + 1), weighted equally at 0.25.
            Universities missing from a source receive a confidence penalty rather than zero, ensuring fair comparison across varying coverage.
          </p>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest">Data Sources</h4>
          <ul className="space-y-1.5">
            {DATA_SOURCES.map(({ label, url }) => (
              <li key={label}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  {label}
                  <ExternalLink size={10} className="opacity-50" />
                </a>
              </li>
            ))}
          </ul>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            <Github size={13} />
            Source on GitHub
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-8 pt-5 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Data last updated: {lastUpdated || 'N/A'}</span>
        <span>All ranking data belongs to its respective source.</span>
      </div>
    </div>
  </footer>
);

export default Footer;

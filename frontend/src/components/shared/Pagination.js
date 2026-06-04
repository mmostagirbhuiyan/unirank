import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePage = (page) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav role="navigation" aria-label="Pagination" className="flex items-center justify-center gap-2">
      <button
        disabled={currentPage === 1}
        onClick={() => handlePage(currentPage - 1)}
        aria-label="Previous page"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/60 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted hover:border-primary/20 transition-all font-medium text-sm focus-ring"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <div className="hidden sm:flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (currentPage <= 4) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = currentPage - 3 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => handlePage(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all focus-ring ${
                currentPage === pageNum
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <span className="sm:hidden px-4 py-2 text-sm text-muted-foreground font-mono">
        {currentPage} / {totalPages}
      </span>

      <button
        disabled={currentPage >= totalPages}
        onClick={() => handlePage(currentPage + 1)}
        aria-label="Next page"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/60 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted hover:border-primary/20 transition-all font-medium text-sm focus-ring"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};

export default Pagination;

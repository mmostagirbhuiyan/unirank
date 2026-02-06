import React from 'react';
import { Search } from 'lucide-react';

const EmptyState = () => (
  <div className="text-center py-24">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
      <Search className="w-7 h-7 text-muted-foreground" />
    </div>
    <p className="text-foreground font-semibold mb-1">No results found</p>
    <p className="text-muted-foreground text-sm">Try adjusting your search or filter criteria.</p>
  </div>
);

export default EmptyState;

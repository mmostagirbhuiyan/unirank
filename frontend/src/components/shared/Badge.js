import React from 'react';

const Badge = ({ children, className = "", variant = "neutral" }) => {
  const variants = {
    neutral: "bg-muted text-muted-foreground border-border/50",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;

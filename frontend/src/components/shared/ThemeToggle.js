import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="flex p-1 bg-muted/80 rounded-full border border-border/50">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`relative p-2 rounded-full transition-all duration-300 ${
            theme === value
              ? 'bg-card text-primary shadow-sm shadow-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={`${label} Mode`}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;

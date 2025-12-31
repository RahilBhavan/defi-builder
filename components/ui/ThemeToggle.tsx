import { Moon, Sun, Monitor } from 'lucide-react';
import type React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

/**
 * Theme toggle button component
 * Cycles through: light -> dark -> system -> light
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      case 'system':
        return <Monitor size={18} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
      title={`Current: ${getLabel()} mode`}
    >
      {getIcon()}
      <span className="ml-2 text-xs font-mono uppercase hidden sm:inline">{getLabel()}</span>
    </Button>
  );
};


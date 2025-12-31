/**
 * Theme management hook
 * Supports light/dark mode with system preference detection
 */

import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
}

/**
 * Get system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook for theme management
 */
export function useTheme() {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('defi-builder-theme', 'system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    if (storedTheme === 'system') {
      return getSystemTheme();
    }
    return storedTheme;
  });

  // Update effective theme when stored theme or system preference changes
  useEffect(() => {
    const newEffectiveTheme = storedTheme === 'system' ? systemTheme : storedTheme;
    setEffectiveTheme(newEffectiveTheme);
    applyTheme(newEffectiveTheme);
  }, [storedTheme, systemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const setTheme = (theme: Theme) => {
    setStoredTheme(theme);
  };

  const toggleTheme = () => {
    if (storedTheme === 'light') {
      setTheme('dark');
    } else if (storedTheme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return {
    theme: storedTheme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    isDark: effectiveTheme === 'dark',
  };
}


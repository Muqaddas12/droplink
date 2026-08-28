import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ThemeColors = {
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  text: string;
  subtext: string;
  muted: string;
  border: string;
  primary: string;
  primaryFade: string;
  accent: string;
  accentFade: string;
  success: string;
  successFade: string;
  warning: string;
  warningFade: string;
  danger: string;
  dangerFade: string;
};

export const darkPalette: ThemeColors = {
  bg: '#05080F',
  surface1: '#0D1424',
  surface2: '#141E33',
  surface3: '#1B2744',
  text: '#F1F5F9',
  subtext: '#94A3B8',
  muted: '#475569',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#3B82F6',
  primaryFade: 'rgba(59, 130, 246, 0.15)',
  accent: '#8B5CF6',
  accentFade: 'rgba(139, 92, 246, 0.15)',
  success: '#10B981',
  successFade: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningFade: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerFade: 'rgba(239, 68, 68, 0.15)',
};

export const lightPalette: ThemeColors = {
  bg: '#F8FAFC',
  surface1: '#FFFFFF',
  surface2: '#F1F5F9',
  surface3: '#E2E8F0',
  text: '#0F172A',
  subtext: '#475569',
  muted: '#94A3B8',
  border: 'rgba(0, 0, 0, 0.08)',
  primary: '#2563EB',
  primaryFade: 'rgba(37, 99, 235, 0.12)',
  accent: '#7C3AED',
  accentFade: 'rgba(124, 58, 237, 0.12)',
  success: '#059669',
  successFade: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',
  warningFade: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  dangerFade: 'rgba(220, 38, 38, 0.12)',
};

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  isDark: true,
  colors: darkPalette,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return isDark ? darkPalette : lightPalette;
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


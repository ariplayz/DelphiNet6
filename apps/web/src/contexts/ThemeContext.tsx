import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  applyTheme,
  BUILT_IN_THEMES,
  BUILT_IN_THEME_KEYS,
  DEFAULT_THEME_KEY,
  findBuiltInTheme,
  ThemeDefinition,
} from '../lib/themes';
import { useAuth } from './AuthContext';

interface ThemeContextValue {
  themeKey: string;
  customThemes: ThemeDefinition[];
  allThemes: ThemeDefinition[];
  activeTheme: ThemeDefinition;
  setActiveTheme: (key: string) => Promise<void>;
  saveCustomTheme: (theme: ThemeDefinition) => Promise<void>;
  deleteCustomTheme: (key: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const LOCAL_THEME_KEY = 'delphinet:themeKey';
const LOCAL_CUSTOM_KEY = 'delphinet:customThemes';

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [themeKey, setThemeKey] = useState<string>(() => readLocal<string>(LOCAL_THEME_KEY, DEFAULT_THEME_KEY));
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() =>
    readLocal<ThemeDefinition[]>(LOCAL_CUSTOM_KEY, []),
  );

  const allThemes = useMemo<ThemeDefinition[]>(
    () => [...BUILT_IN_THEMES, ...customThemes],
    [customThemes],
  );

  const activeTheme = useMemo<ThemeDefinition>(() => {
    return (
      allThemes.find((t) => t.key === themeKey) ??
      findBuiltInTheme(DEFAULT_THEME_KEY)!
    );
  }, [themeKey, allThemes]);

  // Apply whenever the active theme changes
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  // When the logged-in user changes, fetch their saved preferences
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get('/me/preferences')
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? {};
        const remoteCustom: ThemeDefinition[] = Array.isArray(data.customThemes) ? data.customThemes : [];
        const remoteKey: string = data.themeKey || DEFAULT_THEME_KEY;
        setCustomThemes(remoteCustom);
        writeLocal(LOCAL_CUSTOM_KEY, remoteCustom);
        setThemeKey(remoteKey);
        writeLocal(LOCAL_THEME_KEY, remoteKey);
      })
      .catch(() => {
        /* preferences endpoint optional; fall back to local */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = useCallback(
    async (key: string, customs: ThemeDefinition[]) => {
      writeLocal(LOCAL_THEME_KEY, key);
      writeLocal(LOCAL_CUSTOM_KEY, customs);
      if (user) {
        try {
          await api.put('/me/preferences', { themeKey: key, customThemes: customs });
        } catch {
          /* ignore — local copy still applied */
        }
      }
    },
    [user],
  );

  const setActiveTheme = useCallback(
    async (key: string) => {
      const exists = BUILT_IN_THEME_KEYS.has(key) || customThemes.some((t) => t.key === key);
      const next = exists ? key : DEFAULT_THEME_KEY;
      setThemeKey(next);
      await persist(next, customThemes);
    },
    [customThemes, persist],
  );

  const saveCustomTheme = useCallback(
    async (theme: ThemeDefinition) => {
      const next = (() => {
        const idx = customThemes.findIndex((t) => t.key === theme.key);
        if (idx === -1) return [...customThemes, theme];
        const copy = customThemes.slice();
        copy[idx] = theme;
        return copy;
      })();
      setCustomThemes(next);
      setThemeKey(theme.key);
      await persist(theme.key, next);
    },
    [customThemes, persist],
  );

  const deleteCustomTheme = useCallback(
    async (key: string) => {
      const next = customThemes.filter((t) => t.key !== key);
      setCustomThemes(next);
      const fallback = themeKey === key ? DEFAULT_THEME_KEY : themeKey;
      setThemeKey(fallback);
      await persist(fallback, next);
    },
    [customThemes, themeKey, persist],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ themeKey, customThemes, allThemes, activeTheme, setActiveTheme, saveCustomTheme, deleteCustomTheme }),
    [themeKey, customThemes, allThemes, activeTheme, setActiveTheme, saveCustomTheme, deleteCustomTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

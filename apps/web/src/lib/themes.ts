// Theme catalogue. The default theme ("delphinet") matches the legacy
// DelphiNet dark-green palette. Built-in themes are switched by setting
// `data-theme` on <html>; custom themes have their tokens written inline as
// CSS variables on the same element. See ThemeContext for the runtime glue.

export const THEME_TOKEN_KEYS = [
  'bgBase',
  'bgSurface',
  'bgElevated',
  'bgHover',
  'border',
  'brand',
  'brandHover',
  'brandMuted',
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'danger',
  'warning',
  'success',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemeDefinition {
  key: string;
  name: string;
  isDark: boolean;
  tokens: ThemeTokens;
}

const tokenToCssVar: Record<ThemeTokenKey, string> = {
  bgBase: '--color-bg-base',
  bgSurface: '--color-bg-surface',
  bgElevated: '--color-bg-elevated',
  bgHover: '--color-bg-hover',
  border: '--color-border',
  brand: '--color-brand',
  brandHover: '--color-brand-hover',
  brandMuted: '--color-brand-muted',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textDisabled: '--color-text-disabled',
  danger: '--color-danger',
  warning: '--color-warning',
  success: '--color-success',
};

export const TOKEN_LABELS: Record<ThemeTokenKey, string> = {
  bgBase: 'Background',
  bgSurface: 'Surface',
  bgElevated: 'Elevated',
  bgHover: 'Hover',
  border: 'Border',
  brand: 'Brand',
  brandHover: 'Brand hover',
  brandMuted: 'Brand muted',
  textPrimary: 'Text',
  textSecondary: 'Subtle text',
  textDisabled: 'Disabled text',
  danger: 'Danger',
  warning: 'Warning',
  success: 'Success',
};

export const DEFAULT_THEME_KEY = 'delphinet';

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  {
    key: 'delphinet',
    name: 'Delphinet (Default)',
    isDark: true,
    tokens: {
      bgBase: '#0B0F0D',
      bgSurface: '#111713',
      bgElevated: '#1A2119',
      bgHover: '#1F2A1E',
      border: '#2A3828',
      brand: '#016745',
      brandHover: '#017d53',
      brandMuted: '#013d28',
      textPrimary: '#E8F5E0',
      textSecondary: '#8FAF87',
      textDisabled: '#4A6548',
      danger: '#e53e3e',
      warning: '#d97706',
      success: '#16a34a',
    },
  },
  {
    key: 'midnight',
    name: 'Midnight',
    isDark: true,
    tokens: {
      bgBase: '#0a0e1a', bgSurface: '#111629', bgElevated: '#1a2138', bgHover: '#232c4a',
      border: '#2c3553', brand: '#6366f1', brandHover: '#818cf8', brandMuted: '#312e81',
      textPrimary: '#e0e7ff', textSecondary: '#a5b4fc', textDisabled: '#4f5b8a',
      danger: '#f87171', warning: '#fbbf24', success: '#34d399',
    },
  },
  {
    key: 'dracula',
    name: 'Dracula',
    isDark: true,
    tokens: {
      bgBase: '#282a36', bgSurface: '#21222c', bgElevated: '#343746', bgHover: '#44475a',
      border: '#44475a', brand: '#bd93f9', brandHover: '#d0aaff', brandMuted: '#6272a4',
      textPrimary: '#f8f8f2', textSecondary: '#bd93f9', textDisabled: '#6272a4',
      danger: '#ff5555', warning: '#ffb86c', success: '#50fa7b',
    },
  },
  {
    key: 'nord',
    name: 'Nord',
    isDark: true,
    tokens: {
      bgBase: '#2e3440', bgSurface: '#3b4252', bgElevated: '#434c5e', bgHover: '#4c566a',
      border: '#4c566a', brand: '#88c0d0', brandHover: '#8fbcbb', brandMuted: '#5e81ac',
      textPrimary: '#eceff4', textSecondary: '#d8dee9', textDisabled: '#6f7888',
      danger: '#bf616a', warning: '#ebcb8b', success: '#a3be8c',
    },
  },
  {
    key: 'monokai',
    name: 'Monokai',
    isDark: true,
    tokens: {
      bgBase: '#272822', bgSurface: '#1e1f1c', bgElevated: '#34352f', bgHover: '#3e3d32',
      border: '#49483e', brand: '#a6e22e', brandHover: '#b9f339', brandMuted: '#5a7016',
      textPrimary: '#f8f8f2', textSecondary: '#75715e', textDisabled: '#555349',
      danger: '#f92672', warning: '#fd971f', success: '#a6e22e',
    },
  },
  {
    key: 'solarized-dark',
    name: 'Solarized Dark',
    isDark: true,
    tokens: {
      bgBase: '#002b36', bgSurface: '#073642', bgElevated: '#0a4754', bgHover: '#105563',
      border: '#586e75', brand: '#b58900', brandHover: '#d4a217', brandMuted: '#735700',
      textPrimary: '#fdf6e3', textSecondary: '#93a1a1', textDisabled: '#586e75',
      danger: '#dc322f', warning: '#cb4b16', success: '#859900',
    },
  },
  {
    key: 'solarized-light',
    name: 'Solarized Light',
    isDark: false,
    tokens: {
      bgBase: '#fdf6e3', bgSurface: '#eee8d5', bgElevated: '#e7e1cc', bgHover: '#d6cfb8',
      border: '#93a1a1', brand: '#b58900', brandHover: '#cb9b00', brandMuted: '#d8c779',
      textPrimary: '#002b36', textSecondary: '#586e75', textDisabled: '#93a1a1',
      danger: '#dc322f', warning: '#cb4b16', success: '#859900',
    },
  },
  {
    key: 'light',
    name: 'Light',
    isDark: false,
    tokens: {
      bgBase: '#f8fafc', bgSurface: '#ffffff', bgElevated: '#f1f5f9', bgHover: '#e2e8f0',
      border: '#cbd5e1', brand: '#016745', brandHover: '#015c3e', brandMuted: '#cce5db',
      textPrimary: '#0f172a', textSecondary: '#475569', textDisabled: '#94a3b8',
      danger: '#dc2626', warning: '#d97706', success: '#16a34a',
    },
  },
  {
    key: 'synthwave',
    name: 'Synthwave',
    isDark: true,
    tokens: {
      bgBase: '#1a103c', bgSurface: '#261552', bgElevated: '#311b66', bgHover: '#3d2480',
      border: '#5b3196', brand: '#ff71ce', brandHover: '#ff8edb', brandMuted: '#7d2c63',
      textPrimary: '#f8f8ff', textSecondary: '#b39bff', textDisabled: '#6a589e',
      danger: '#ff3864', warning: '#fbbf24', success: '#00f5d4',
    },
  },
  {
    key: 'gruvbox',
    name: 'Gruvbox',
    isDark: true,
    tokens: {
      bgBase: '#282828', bgSurface: '#3c3836', bgElevated: '#504945', bgHover: '#665c54',
      border: '#504945', brand: '#b8bb26', brandHover: '#d6d83b', brandMuted: '#79740e',
      textPrimary: '#ebdbb2', textSecondary: '#d5c4a1', textDisabled: '#928374',
      danger: '#fb4934', warning: '#fabd2f', success: '#b8bb26',
    },
  },
];

export const BUILT_IN_THEME_KEYS = new Set(BUILT_IN_THEMES.map((t) => t.key));

export function findBuiltInTheme(key: string | null | undefined): ThemeDefinition | null {
  if (!key) return null;
  return BUILT_IN_THEMES.find((t) => t.key === key) ?? null;
}

/** Apply a theme to <html>: set data-theme for built-ins, also write each
 *  token as an inline CSS variable so custom themes work without touching
 *  the stylesheet. */
export function applyTheme(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.key);
  for (const key of THEME_TOKEN_KEYS) {
    root.style.setProperty(tokenToCssVar[key], theme.tokens[key]);
  }
}

export function emptyCustomTheme(name = 'My theme'): ThemeDefinition {
  const base = BUILT_IN_THEMES[0];
  return {
    key: `custom-${Math.random().toString(36).slice(2, 8)}`,
    name,
    isDark: true,
    tokens: { ...base.tokens },
  };
}

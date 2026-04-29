import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../contexts/ThemeContext';
import {
  BUILT_IN_THEME_KEYS,
  ThemeDefinition,
  ThemeTokenKey,
  THEME_TOKEN_KEYS,
  TOKEN_LABELS,
  emptyCustomTheme,
} from '../lib/themes';

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  return (
    <div
      className="flex h-20 rounded-lg overflow-hidden border"
      style={{ borderColor: theme.tokens.border }}
    >
      <div className="flex-1" style={{ background: theme.tokens.bgBase }} />
      <div className="flex-1 flex flex-col">
        <div className="flex-1" style={{ background: theme.tokens.bgSurface }} />
        <div className="flex-1" style={{ background: theme.tokens.bgElevated }} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center" style={{ background: theme.tokens.bgSurface }}>
        <div className="h-3 w-3 rounded-full mb-1" style={{ background: theme.tokens.brand }} />
        <div className="h-1.5 w-8 rounded" style={{ background: theme.tokens.textPrimary }} />
        <div className="h-1.5 w-6 rounded mt-1" style={{ background: theme.tokens.textSecondary }} />
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  active,
  onSelect,
  onEdit,
  onDelete,
  isCustom,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition cursor-pointer flex flex-col gap-2 min-h-[44px] ${
        active ? 'border-brand ring-2 ring-brand/30' : 'border-border hover:border-brand/60'
      }`}
      onClick={onSelect}
    >
      <ThemeSwatch theme={theme} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">{theme.name}</span>
          {isCustom && <Badge variant="brand">Custom</Badge>}
          {active && <Badge>Active</Badge>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button size="sm" variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: ThemeDefinition;
  onCancel: () => void;
  onSave: (theme: ThemeDefinition) => void;
}) {
  const [draft, setDraft] = useState<ThemeDefinition>(() => ({
    ...initial,
    tokens: { ...initial.tokens },
  }));

  const updateToken = (key: ThemeTokenKey, value: string) => {
    setDraft((d) => ({ ...d, tokens: { ...d.tokens, [key]: value } }));
  };

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <Input
            label="Theme name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => onSave(draft)}>Save &amp; apply</Button>
          </div>
        </div>

        <ThemeSwatch theme={draft} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_TOKEN_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-bg-elevated">
              <input
                type="color"
                value={draft.tokens[key]}
                onChange={(e) => updateToken(key, e.target.value)}
                className="h-10 w-10 rounded cursor-pointer border border-border bg-transparent"
                aria-label={TOKEN_LABELS[key]}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-secondary">{TOKEN_LABELS[key]}</div>
                <input
                  type="text"
                  value={draft.tokens[key]}
                  onChange={(e) => updateToken(key, e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-sm font-mono text-text-primary focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const { themeKey, customThemes, allThemes, setActiveTheme, saveCustomTheme, deleteCustomTheme } = useTheme();
  const [editing, setEditing] = useState<ThemeDefinition | null>(null);

  const builtIns = allThemes.filter((t) => BUILT_IN_THEME_KEYS.has(t.key));
  const customs = allThemes.filter((t) => !BUILT_IN_THEME_KEYS.has(t.key));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">
          Customize how DelphiNet looks. Pick a built-in theme or design your own — your choice syncs to your account.
        </p>
      </div>

      <Card title="Theme">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Built-in themes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {builtIns.map((theme) => (
                <ThemeCard
                  key={theme.key}
                  theme={theme}
                  active={theme.key === themeKey}
                  onSelect={() => void setActiveTheme(theme.key)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-secondary">Your themes</h3>
              <Button size="sm" onClick={() => setEditing(emptyCustomTheme())}>
                + New custom theme
              </Button>
            </div>
            {customs.length === 0 ? (
              <p className="text-sm text-text-disabled">
                You haven't built any custom themes yet. Click <span className="font-medium">New custom theme</span> to start one.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customs.map((theme) => (
                  <ThemeCard
                    key={theme.key}
                    theme={theme}
                    active={theme.key === themeKey}
                    onSelect={() => void setActiveTheme(theme.key)}
                    onEdit={() => setEditing(theme)}
                    onDelete={() => void deleteCustomTheme(theme.key)}
                    isCustom
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {editing && (
        <ThemeEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (theme) => {
            await saveCustomTheme(theme);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

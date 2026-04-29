import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

const TRICKY_WORDS = [
  'achieve', 'believe', 'bizarre', 'bureau', 'calendar', 'colleague',
  'committee', 'conscientious', 'definitely', 'development', 'different',
  'disappear', 'embarrass', 'environment', 'exaggerate', 'experience',
  'February', 'fluorescent', 'foreign', 'government', 'guarantee',
  'independent', 'immediately', 'intelligence', 'knowledge', 'liaison',
  'maintenance', 'millennium', 'necessary', 'neighbor', 'occasion',
  'occurrence', 'personnel', 'privilege', 'pronunciation', 'questionnaire',
  'receive', 'recommend', 'relevant', 'restaurant', 'rhythm', 'ridiculous',
  'schedule', 'separate', 'sergeant', 'similar', 'sincerely', 'sufficient',
  'supersede', 'their', 'tomorrow', 'truly', 'unforgettable', 'unnecessary',
  'vacuum', 'whether', 'weird', 'yacht',
];

function canSpellWith(word: string, letters: string): boolean {
  const pool = letters.toLowerCase().split('');
  return word
    .toLowerCase()
    .split('')
    .every((ch) => pool.includes(ch));
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // silently fail if clipboard access denied
  }
}

export function HardToFindWordsPage() {
  const [letters, setLetters] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (word: string) => {
    await copyToClipboard(word);
    setCopied(word);
    setTimeout(() => setCopied(null), 1500);
  };

  const displayWords = TRICKY_WORDS.filter((word) => {
    const matchesSearch = search
      ? word.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesLetters = letters.trim()
      ? canSpellWith(word, letters)
      : true;
    return matchesSearch && matchesLetters;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-text-primary">Hard to Find Words</h1>
        <p className="text-text-secondary text-sm">
          Commonly misspelled or hard-to-find English words — {TRICKY_WORDS.length} words total
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            label="Search words"
            placeholder="Type to search words…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            label="Filter by letters you have"
            placeholder="e.g. aeiou — shows only words using these letters"
            value={letters}
            onChange={(e) => setLetters(e.target.value)}
          />
          {(search || letters) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="brand">{displayWords.length} matches</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setLetters(''); }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {displayWords.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-sm text-center py-8">
            No words match your filters.
          </p>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {displayWords.map((word) => (
            <div
              key={word}
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl bg-bg-surface border border-border hover:border-brand transition-colors"
            >
              <span className="font-medium text-text-primary">{word}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(word)}
                className="shrink-0 text-xs"
              >
                {copied === word ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

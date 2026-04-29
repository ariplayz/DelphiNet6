import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Props {
  title?: string;
  description?: string;
}

/**
 * Placeholder page used while we port over the remaining DelphiNet 5 pages.
 * The page title is taken from props or, as a fallback, a slug parsed from
 * the URL — so a single component can stand in for many routes.
 */
export function ComingSoonPage({ title, description }: Props) {
  const loc = useLocation();
  const fallback = loc.pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Page';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="rounded-lg border border-border bg-bg-surface p-8 text-center">
        <Construction className="mx-auto mb-4 text-brand" size={48} />
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {title ?? fallback}
        </h1>
        <p className="text-text-secondary">
          {description ??
            'This area is being ported from DelphiNet 5 and will be available in an upcoming release.'}
        </p>
      </div>
    </div>
  );
}

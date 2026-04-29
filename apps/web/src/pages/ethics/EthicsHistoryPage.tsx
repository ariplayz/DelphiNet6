import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface EthicsReport {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  subject: { id: string; firstName: string; lastName: string };
  writer: { id: string; firstName: string; lastName: string };
}

const STATUS_OPTIONS = ['all', 'pending', 'reviewed', 'resolved'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_BADGE: Record<string, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  reviewed: 'info',
  resolved: 'success',
};

export function EthicsHistoryPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data, isLoading } = useQuery<EthicsReport[]>({
    queryKey: ['ethics/mine'],
    queryFn: async () => (await api.get<EthicsReport[]>('/ethics/mine')).data,
  });

  const filtered = (data ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">My Ethics Reports</h1>
        <p className="text-sm text-text-secondary mt-1">Full history of all reports you have submitted.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={
              filter === s
                ? 'min-h-[44px] px-4 rounded-lg bg-brand text-white text-sm font-medium'
                : 'min-h-[44px] px-4 rounded-lg bg-bg-elevated border border-border text-text-secondary text-sm'
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-text-secondary py-8">No reports found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-text-primary">
                  {r.subject.lastName}, {r.subject.firstName}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>{r.status}</Badge>
                  <span className="text-xs text-text-secondary">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{r.body}</p>
              {r.reviewNotes && (
                <div className="rounded-lg bg-bg-elevated border border-border px-3 py-2">
                  <p className="text-xs uppercase text-text-secondary font-semibold mb-1">Reviewer Notes</p>
                  <p className="text-sm text-text-primary">{r.reviewNotes}</p>
                  {r.reviewedAt && (
                    <p className="text-xs text-text-secondary mt-1">
                      {new Date(r.reviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

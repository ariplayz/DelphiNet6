import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface EthicsReport {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  writer: { id: string; firstName: string; lastName: string };
  subject: { id: string; firstName: string; lastName: string };
}

interface ReviewForm {
  status: 'reviewed' | 'resolved';
  reviewNotes: string;
}

const STATUS_OPTIONS = ['all', 'pending', 'reviewed', 'resolved'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_BADGE: Record<string, 'warning' | 'brand' | 'success'> = {
  pending: 'warning',
  reviewed: 'brand',
  resolved: 'success',
};

export function CampusEthicsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [reviewing, setReviewing] = useState<EthicsReport | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ status: 'reviewed', reviewNotes: '' });

  if (!hasPermission('ethics.review')) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <p className="text-text-primary font-semibold text-lg">Access Denied</p>
          <p className="text-text-secondary mt-2">You do not have permission to view campus ethics reports.</p>
        </Card>
      </div>
    );
  }

  const { data, isLoading } = useQuery<EthicsReport[]>({
    queryKey: ['ethics/campus'],
    queryFn: async () => (await api.get<EthicsReport[]>('/ethics/campus')).data,
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ReviewForm }) =>
      api.patch(`/ethics/${id}/review`, {
        status: form.status,
        reviewNotes: form.reviewNotes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ethics/campus'] });
      setReviewing(null);
    },
  });

  const filtered = (data ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Campus Ethics Reports</h1>
        <p className="text-sm text-text-secondary mt-1">All ethics reports submitted in this school.</p>
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
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>{r.status}</Badge>
                    <span className="text-xs text-text-secondary">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Writer:</span>{' '}
                    {r.writer.lastName}, {r.writer.firstName}
                  </p>
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Subject:</span>{' '}
                    {r.subject.lastName}, {r.subject.firstName}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReviewing(r);
                      setReviewForm({ status: 'reviewed', reviewNotes: '' });
                    }}
                  >
                    Review
                  </Button>
                )}
              </div>

              <p className="text-sm text-text-secondary whitespace-pre-wrap">{r.body}</p>

              {r.reviewNotes && (
                <div className="rounded-lg bg-bg-elevated border border-border px-3 py-2">
                  <p className="text-xs uppercase text-text-secondary font-semibold mb-1">Reviewer Notes</p>
                  <p className="text-sm text-text-primary">{r.reviewNotes}</p>
                </div>
              )}

              {reviewing?.id === r.id && (
                <div className="rounded-lg bg-bg-elevated border border-border p-3 space-y-3 mt-2">
                  <p className="text-sm font-medium text-text-primary">Submit Review</p>
                  <div>
                    <label className="text-xs uppercase text-text-secondary font-semibold">Status</label>
                    <select
                      value={reviewForm.status}
                      onChange={(e) =>
                        setReviewForm((f) => ({ ...f, status: e.target.value as 'reviewed' | 'resolved' }))
                      }
                      className="mt-1 w-full rounded-lg bg-bg-base border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
                    >
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase text-text-secondary font-semibold">Notes (optional)</label>
                    <textarea
                      rows={3}
                      value={reviewForm.reviewNotes}
                      onChange={(e) => setReviewForm((f) => ({ ...f, reviewNotes: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-bg-base border border-border px-3 py-2 text-base text-text-primary resize-none"
                      placeholder="Add review notes..."
                    />
                  </div>
                  {reviewMut.isError && (
                    <p className="text-sm text-danger">
                      {(reviewMut.error as any)?.response?.data?.message ?? 'Failed to submit review.'}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setReviewing(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      loading={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ id: r.id, form: reviewForm })}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

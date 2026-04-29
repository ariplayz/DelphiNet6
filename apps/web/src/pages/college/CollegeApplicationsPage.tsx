import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = 'researching' | 'applied' | 'accepted' | 'rejected' | 'enrolled';

interface CollegeApp {
  id: string;
  collegeName: string;
  status: AppStatus;
  deadline: string | null;
  notes: string | null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addSchema = z.object({
  collegeName: z.string().min(1, 'College name is required'),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});
type AddForm = z.infer<typeof addSchema>;

const editSchema = z.object({
  collegeName: z.string().min(1, 'College name is required'),
  status: z.enum(['researching', 'applied', 'accepted', 'rejected', 'enrolled']),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppStatus, string> = {
  researching: 'Researching',
  applied: 'Applied',
  accepted: 'Accepted',
  rejected: 'Rejected',
  enrolled: 'Enrolled',
};

const STATUS_COLORS: Record<AppStatus, string> = {
  researching: 'bg-bg-hover text-text-secondary',
  applied: 'bg-blue-500/10 text-blue-400',
  accepted: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
  enrolled: 'bg-brand/10 text-brand',
};

const ALL_STATUSES: AppStatus[] = ['researching', 'applied', 'accepted', 'rejected', 'enrolled'];
const FILTER_TABS: Array<AppStatus | 'all'> = ['all', ...ALL_STATUSES];

function formatDeadline(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isDeadlineSoon(dateStr: string | null, status: AppStatus): boolean {
  if (!dateStr || status === 'accepted' || status === 'enrolled') return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AddForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: AddForm) => api.post('/college-applications', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['college-applications'] });
      reset();
      onClose();
    },
  });

  return (
    <form
      onSubmit={handleSubmit(d => mutation.mutate(d))}
      className="bg-bg-surface border border-border rounded-xl p-4 mb-4 space-y-3"
    >
      <h3 className="text-text-primary font-semibold">New Application</h3>

      <div>
        <input
          {...register('collegeName')}
          placeholder="College name *"
          className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand min-h-[44px]"
        />
        {errors.collegeName && <p className="text-red-400 text-sm mt-1">{errors.collegeName.message}</p>}
      </div>

      <div>
        <label className="block text-text-secondary text-sm mb-1">Deadline (optional)</label>
        <input
          type="date"
          {...register('deadline')}
          className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand min-h-[44px]"
        />
      </div>

      <div>
        <textarea
          {...register('notes')}
          placeholder="Notes (optional)"
          rows={3}
          className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending} className="min-h-[44px]">
          {mutation.isPending ? 'Saving…' : 'Add Application'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="min-h-[44px]">
          Cancel
        </Button>
      </div>
      {mutation.isError && <p className="text-red-400 text-sm">Failed to save. Please try again.</p>}
    </form>
  );
}

function AppCard({ app, onDeleted }: { app: CollegeApp; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();

  const deadlineLabel = formatDeadline(app.deadline);
  const soon = isDeadlineSoon(app.deadline, app.status);

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) =>
      api.patch(`/college-applications/${app.id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['college-applications'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/college-applications/${app.id}`).then(r => r.data),
    onSuccess: onDeleted,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      collegeName: app.collegeName,
      status: app.status,
      deadline: app.deadline ? app.deadline.substring(0, 10) : '',
      notes: app.notes ?? '',
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Delete application to "${app.collegeName}"?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-bold text-lg truncate">{app.collegeName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status]}`}>
              {STATUS_LABELS[app.status]}
            </span>
            {deadlineLabel && (
              <span className={`text-xs ${soon ? 'text-red-400 font-semibold' : 'text-text-secondary'}`}>
                Due {deadlineLabel}{soon ? ' ⚠️' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(e => !e)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Edit"
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Notes preview (when not editing) */}
      {!editing && app.notes && (
        <p className="text-text-secondary text-sm line-clamp-2">{app.notes}</p>
      )}

      {/* Inline edit form */}
      {editing && (
        <form
          onSubmit={handleSubmit(d => updateMutation.mutate(d))}
          className="space-y-3 pt-2 border-t border-border"
        >
          <div>
            <input
              {...register('collegeName')}
              placeholder="College name *"
              className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand min-h-[44px]"
            />
            {errors.collegeName && <p className="text-red-400 text-sm mt-1">{errors.collegeName.message}</p>}
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand min-h-[44px]"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">Deadline</label>
            <input
              type="date"
              {...register('deadline')}
              className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand min-h-[44px]"
            />
          </div>

          <div>
            <textarea
              {...register('notes')}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending} className="min-h-[44px]">
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="min-h-[44px]">
              Cancel
            </Button>
          </div>
          {updateMutation.isError && <p className="text-red-400 text-sm">Failed to save.</p>}
        </form>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CollegeApplicationsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');
  const qc = useQueryClient();

  const { data: apps, isLoading, isError } = useQuery<CollegeApp[]>({
    queryKey: ['college-applications'],
    queryFn: () => api.get('/college-applications').then(r => r.data),
  });

  const filtered = (apps ?? []).filter(a => filter === 'all' || a.status === filter);

  const counts = {
    total: apps?.length ?? 0,
    applied: apps?.filter(a => a.status === 'applied').length ?? 0,
    accepted: apps?.filter(a => a.status === 'accepted').length ?? 0,
    enrolled: apps?.filter(a => a.status === 'enrolled').length ?? 0,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-text-primary text-2xl font-bold">College Applications</h1>
        <Button
          onClick={() => setShowAdd(s => !s)}
          className="min-h-[44px] shrink-0"
        >
          {showAdd ? 'Cancel' : '+ Add Application'}
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: counts.total },
          { label: 'Applied', value: counts.applied },
          { label: 'Accepted', value: counts.accepted },
          { label: 'Enrolled', value: counts.enrolled },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-text-primary text-xl font-bold">{stat.value}</div>
            <div className="text-text-secondary text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Inline add form */}
      {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
              filter === tab
                ? 'bg-brand text-white'
                : 'bg-bg-surface text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            {tab === 'all' ? 'All' : STATUS_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : isError ? (
        <p className="text-red-400 text-center py-8">Failed to load applications.</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎓</p>
          <p className="text-text-secondary text-lg">
            {filter === 'all'
              ? 'No applications yet — start your college journey!'
              : `No ${STATUS_LABELS[filter as AppStatus].toLowerCase()} applications.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <AppCard
              key={app.id}
              app={app}
              onDeleted={() => qc.invalidateQueries({ queryKey: ['college-applications'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

interface Seminar {
  id: string;
  name: string;
  description: string | null;
  daysOfWeek: number[];
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  leaderUserId: string | null;
  isArchived: boolean;
  leader?: { id: string; firstName: string; lastName: string; email: string } | null;
  _count?: { enrollments: number };
}

interface UserOption { id: string; firstName: string; lastName: string; email: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SeminarsListPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can('seminar.manage');
  const [editing, setEditing] = useState<Partial<Seminar> | null>(null);

  const { data, isLoading } = useQuery<Seminar[]>({
    queryKey: ['seminars'],
    queryFn: async () => (await api.get<Seminar[]>('/seminars?includeArchived=true')).data,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/seminars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seminars'] }),
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Seminars</h1>
          <p className="text-sm text-text-secondary">
            Lightweight, no-points classes that meet on selected days. Led by an assigned staff member.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing({ daysOfWeek: [], startsAt: '09:00', durationMinutes: 50 })}>
            <Plus size={16} /> New
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-text-primary">{s.name}</h3>
                    {s.isArchived && <Badge>Archived</Badge>}
                    <Badge variant="brand">{s._count?.enrollments ?? 0} enrolled</Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {s.daysOfWeek.length === 0
                      ? 'No days set'
                      : s.daysOfWeek.sort().map((d) => DAYS[d]).join(' · ')}
                    {' @ '}{s.startsAt} · {s.durationMinutes} min
                    {s.location ? ` · ${s.location}` : ''}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Led by {s.leader ? `${s.leader.firstName} ${s.leader.lastName}` : <span className="italic">unassigned</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/seminar-roll-call/${s.id}`}>
                    <Button variant="secondary" size="sm">
                      <ExternalLink size={14} /> Roll Call
                    </Button>
                  </Link>
                  {canManage && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${s.name}"?`)) removeMut.mutate(s.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-center text-text-secondary py-8">No seminars yet.</p>
          )}
        </div>
      )}

      {editing && (
        <SeminarEditModal
          seminar={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['seminars'] });
          }}
        />
      )}
    </div>
  );
}

function SeminarEditModal({
  seminar,
  onClose,
  onSaved,
}: {
  seminar: Partial<Seminar>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !seminar.id;
  const [form, setForm] = useState({
    name: seminar.name ?? '',
    description: seminar.description ?? '',
    daysOfWeek: seminar.daysOfWeek ?? [],
    startsAt: seminar.startsAt ?? '09:00',
    durationMinutes: seminar.durationMinutes ?? 50,
    location: seminar.location ?? '',
    leaderUserId: seminar.leaderUserId ?? '',
    isArchived: seminar.isArchived ?? false,
  });

  const { data: users } = useQuery<UserOption[]>({
    queryKey: ['users-staff'],
    queryFn: async () => {
      try {
        const res = await api.get<UserOption[]>('/users');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        leaderUserId: form.leaderUserId || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
      };
      if (isNew) return (await api.post('/seminars', payload)).data;
      return (await api.patch(`/seminars/${seminar.id}`, payload)).data;
    },
    onSuccess: onSaved,
  });

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }));

  return (
    <Modal open onClose={onClose} title={isNew ? 'New Seminar' : `Edit ${seminar.name}`}>
      <div className="space-y-3">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div>
          <label className="text-xs uppercase text-text-secondary font-semibold">Days</label>
          <div className="flex gap-1 mt-1 flex-wrap">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={
                  form.daysOfWeek.includes(i)
                    ? 'min-h-[44px] px-3 rounded-lg bg-brand text-white text-sm'
                    : 'min-h-[44px] px-3 rounded-lg bg-bg-elevated border border-border text-text-secondary text-sm'
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starts at (HH:mm)" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Input
            label="Duration (min)"
            type="number"
            value={String(form.durationMinutes)}
            onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div>
          <label className="text-xs uppercase text-text-secondary font-semibold">Leader</label>
          <select
            value={form.leaderUserId}
            onChange={(e) => setForm({ ...form, leaderUserId: e.target.value })}
            className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
          >
            <option value="">— unassigned —</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.lastName}, {u.firstName} ({u.email})</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={form.isArchived}
            onChange={(e) => setForm({ ...form, isArchived: e.target.checked })}
          />
          Archived
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
        {saveMut.isError && (
          <p className="text-sm text-danger">{(saveMut.error as any)?.response?.data?.message ?? 'Failed to save.'}</p>
        )}
      </div>
    </Modal>
  );
}

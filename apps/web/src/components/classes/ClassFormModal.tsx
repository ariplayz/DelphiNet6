import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserPicker } from '../UserPicker';
import {
  CLASS_KIND_LABELS,
  ClassDetail,
  ClassKind,
  CreateClassDto,
  classesApi,
} from '../../lib/api/classes';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: ClassDetail | null;
}

export function ClassFormModal({ open, onClose, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateClassDto>({
    name: '',
    kind: 'ACADEMIC',
    notes: '',
    location: '',
    supervisorUserId: undefined,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (initial) {
        setForm({
          name: initial.name,
          kind: initial.kind,
          notes: initial.notes ?? '',
          location: initial.location ?? '',
          supervisorUserId: initial.supervisorUserId ?? undefined,
        });
      } else {
        setForm({
          name: '',
          kind: 'ACADEMIC',
          notes: '',
          location: '',
          supervisorUserId: undefined,
        });
      }
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async (dto: CreateClassDto) => {
      const payload: CreateClassDto = {
        ...dto,
        notes: dto.notes?.trim() || undefined,
        location: dto.location?.trim() || undefined,
      };
      if (isEdit && initial) {
        return classesApi.update(initial.id, payload);
      }
      return classesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      if (initial) qc.invalidateQueries({ queryKey: ['class', initial.id] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to save class');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    mut.mutate(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit class' : 'New class'}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={mut.isPending}>
            {isEdit ? 'Save changes' : 'Create class'}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Kind</label>
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as ClassKind })
            }
            className="w-full rounded-lg px-3 py-2 text-base sm:text-sm min-h-[44px] bg-bg-elevated border border-border text-text-primary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {Object.entries(CLASS_KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Location"
          value={form.location ?? ''}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Room or building"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">
            Supervisor
          </label>
          <UserPicker
            value={form.supervisorUserId ?? null}
            onChange={(id) =>
              setForm({ ...form, supervisorUserId: id ?? undefined })
            }
            placeholder="Search for a supervisor…"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-base sm:text-sm bg-bg-elevated border border-border text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

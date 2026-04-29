import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ClassSession, classesApi } from '../../lib/api/classes';

interface Props {
  open: boolean;
  onClose: () => void;
  classId: string;
  initial?: ClassSession | null;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function SessionFormModal({ open, onClose, classId, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (initial) {
        setStartsAt(toLocalInputValue(initial.startsAt));
        setEndsAt(toLocalInputValue(initial.endsAt));
      } else {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
        const end = new Date(now);
        end.setHours(end.getHours() + 1);
        setStartsAt(toLocalInputValue(now.toISOString()));
        setEndsAt(toLocalInputValue(end.toISOString()));
      }
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      };
      if (isEdit && initial) {
        return classesApi.updateSession(initial.id, payload);
      }
      return classesApi.createSession(classId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', classId] });
      qc.invalidateQueries({ queryKey: ['class', classId, 'sessions'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'today-classes'] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to save session');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!startsAt || !endsAt) {
      setError('Both start and end times are required');
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError('End must be after start');
      return;
    }
    mut.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit session' : 'Add session'}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={mut.isPending}>
            {isEdit ? 'Save' : 'Add session'}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Starts at"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Input
          label="Ends at"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

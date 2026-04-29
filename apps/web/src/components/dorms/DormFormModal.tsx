import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserPicker } from '../UserPicker';
import {
  CreateDormDto,
  DormDetail,
  DormSummary,
  dormsApi,
} from '../../lib/api/dorms';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: DormDetail | DormSummary | null;
}

export function DormFormModal({ open, onClose, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [captainUserId, setCaptainUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setName(initial.name);
      setNotes(initial.notes ?? '');
      setCaptainUserId(initial.captainUserId ?? null);
    } else {
      setName('');
      setNotes('');
      setCaptainUserId(null);
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      const dto: CreateDormDto = {
        name: name.trim(),
        captainUserId: captainUserId ?? undefined,
        notes: notes.trim() || undefined,
      };
      if (isEdit && initial) {
        return dormsApi.update(initial.id, {
          name: dto.name,
          captainUserId: captainUserId,
          notes: dto.notes ?? null,
        });
      }
      return dormsApi.create(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dorms'] });
      if (initial) qc.invalidateQueries({ queryKey: ['dorm', initial.id] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to save dorm');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    mut.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit dorm' : 'New dorm'}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} loading={mut.isPending} className="flex-1">
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="North Hall"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Captain (optional)
          </label>
          <UserPicker
            value={captainUserId}
            onChange={(id) => setCaptainUserId(id)}
            placeholder="Pick a student captain…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm focus:outline-none focus:border-brand"
          />
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DormRoom, dormsApi } from '../../lib/api/dorms';

interface Props {
  open: boolean;
  onClose: () => void;
  dormId: string;
  initial?: DormRoom | null;
}

export function RoomFormModal({ open, onClose, dormId, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setName(initial.name);
      setCapacity(initial.capacity);
    } else {
      setName('');
      setCapacity(2);
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      const dto = { name: name.trim(), capacity };
      if (isEdit && initial) return dormsApi.updateRoom(initial.id, dto);
      return dormsApi.addRoom(dormId, dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dorm', dormId] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to save room');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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
      title={isEdit ? 'Edit room' : 'New room'}
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
            Room name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room 101"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Capacity
          </label>
          <Input
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value || '1', 10)))}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

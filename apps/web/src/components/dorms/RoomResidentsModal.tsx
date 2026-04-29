import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserPicker } from '../UserPicker';
import { DormRoom, dormsApi } from '../../lib/api/dorms';

interface Props {
  open: boolean;
  onClose: () => void;
  dormId: string;
  room: DormRoom | null;
}

export function RoomResidentsModal({ open, onClose, dormId, room }: Props) {
  const qc = useQueryClient();
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setIds(room?.assignments.map((a) => a.studentUserId) ?? []);
  }, [open, room]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!room) return;
      return dormsApi.setRoomResidents(room.id, ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dorm', dormId] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to update residents');
    },
  });

  const overCapacity = room ? ids.length > room.capacity : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={room ? `Residents — ${room.name}` : 'Residents'}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            loading={mut.isPending}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">
          {ids.length}
          {room && ` / ${room.capacity}`} assigned
          {overCapacity && (
            <span className="text-warning ml-2">
              (over capacity, will still save)
            </span>
          )}
        </p>
        <UserPicker
          multiple
          value={ids}
          onChange={(v) => setIds(v)}
          placeholder="Add residents…"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

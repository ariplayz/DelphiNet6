import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserPicker } from '../UserPicker';
import { ClassDetail, classesApi } from '../../lib/api/classes';

interface Props {
  open: boolean;
  onClose: () => void;
  cls: ClassDetail;
}

export function RosterModal({ open, onClose, cls }: Props) {
  const qc = useQueryClient();
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIds(cls.enrollments.map((e) => e.studentUserId));
      setError(null);
    }
  }, [open, cls]);

  const mut = useMutation({
    mutationFn: () => classesApi.setRoster(cls.id, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', cls.id] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to update roster');
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage roster"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <span className="text-xs text-text-secondary self-center">
            {ids.length} student{ids.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => mut.mutate()} loading={mut.isPending}>
              Save roster
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          Add or remove students. Changes apply when you save.
        </p>
        <UserPicker
          multiple
          value={ids}
          onChange={setIds}
          placeholder="Search students to add…"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

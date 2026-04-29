import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  CreateScheduleSlotDto,
  DAY_LABELS,
  DormScheduleSlot,
  DormSlotKind,
  dormsApi,
} from '../../lib/api/dorms';

interface Props {
  open: boolean;
  onClose: () => void;
  dormId: string;
  initial?: DormScheduleSlot | null;
}

export function ScheduleSlotModal({ open, onClose, dormId, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [slot, setSlot] = useState<DormSlotKind>('morning');
  const [time, setTime] = useState('07:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [allowsMessy, setAllowsMessy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setSlot(initial.slot);
      setTime(initial.timeOfDay);
      setDays([...initial.daysOfWeek].sort());
      setAllowsMessy(initial.allowsMessyRoomPoints);
    } else {
      setSlot('morning');
      setTime('07:00');
      setDays([1, 2, 3, 4, 5]);
      setAllowsMessy(true);
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      const dto: CreateScheduleSlotDto = {
        slot,
        timeOfDay: time,
        daysOfWeek: [...days].sort(),
        allowsMessyRoomPoints: slot === 'morning' ? allowsMessy : false,
      };
      if (isEdit && initial) return dormsApi.updateScheduleSlot(initial.id, dto);
      return dormsApi.addScheduleSlot(dormId, dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dorm', dormId] });
      qc.invalidateQueries({ queryKey: ['dorm-schedule', dormId] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Failed to save slot');
    },
  });

  const toggleDay = (d: number) => {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0) {
      setError('Pick at least one day');
      return;
    }
    mut.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit roll call slot' : 'New roll call slot'}
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
            Kind
          </label>
          <div className="flex gap-2">
            {(['morning', 'evening'] as DormSlotKind[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setSlot(k)}
                className={clsx(
                  'flex-1 py-2.5 rounded-lg border text-sm font-semibold capitalize min-h-[44px]',
                  slot === k
                    ? 'bg-brand text-white border-brand'
                    : 'bg-transparent border-border text-text-secondary',
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Time
          </label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">
            Days of week
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={clsx(
                  'py-2 rounded-lg border text-xs font-medium min-h-[40px]',
                  days.includes(i)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-transparent text-text-secondary border-border',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {slot === 'morning' && (
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={allowsMessy}
              onChange={(e) => setAllowsMessy(e.target.checked)}
            />
            Allow Mark Messy +1 (room inspections)
          </label>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

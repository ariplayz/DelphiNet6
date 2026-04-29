import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Check, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import {
  DormAttendanceStatus,
  DormRollCall,
  DormRollCallEntry,
  DormRollCallRoom,
  dormsApi,
} from '../../lib/api/dorms';

const STATUS_BUTTONS: {
  status: DormAttendanceStatus;
  label: string;
  selected: string;
}[] = [
  { status: 'HERE', label: 'Here', selected: 'bg-success text-white border-success' },
  { status: 'LATE', label: 'Late', selected: 'bg-warning text-white border-warning' },
  { status: 'ABSENT', label: 'Absent', selected: 'bg-danger text-white border-danger' },
  { status: 'EXCUSED', label: 'Excused', selected: 'bg-bg-elevated text-text-primary border-border' },
];

function StatusBtn({
  label,
  selected,
  active,
  onClick,
}: {
  label: string;
  selected: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex-1 min-h-[48px] min-w-[72px] px-3 rounded-lg border text-sm font-semibold',
        'transition-colors touch-manipulation select-none',
        active
          ? selected
          : 'bg-transparent text-text-secondary border-border hover:bg-bg-hover',
      )}
    >
      {label}
    </button>
  );
}

function StudentRow({
  entry,
  onChange,
  saving,
  flashAt,
}: {
  entry: DormRollCallEntry;
  onChange: (status: DormAttendanceStatus, excuseReason?: string) => Promise<void>;
  saving: boolean;
  flashAt: number | null;
}) {
  const [excuseOpen, setExcuseOpen] = useState(entry.status === 'EXCUSED');
  const [reason, setReason] = useState(entry.excuseReason ?? '');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (flashAt) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [flashAt]);

  useEffect(() => {
    setReason(entry.excuseReason ?? '');
    setExcuseOpen(entry.status === 'EXCUSED');
  }, [entry.id, entry.status, entry.excuseReason]);

  const isLate = entry.status === 'LATE' || entry.status === 'ABSENT';

  const handleClick = async (status: DormAttendanceStatus) => {
    if (status === 'EXCUSED') {
      setExcuseOpen(true);
      return;
    }
    setExcuseOpen(false);
    await onChange(status);
  };

  const handleSaveExcuse = async () => {
    setReasonTouched(true);
    if (!reason.trim()) return;
    await onChange('EXCUSED', reason.trim());
    setExcuseOpen(false);
    setReasonTouched(false);
  };

  const reasonInvalid = excuseOpen && reasonTouched && !reason.trim();

  return (
    <div className="py-3 px-4 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-medium text-text-primary truncate">
            {entry.student?.firstName} {entry.student?.lastName}
          </span>
          {showFlash && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-white">
              <Check size={12} />
            </span>
          )}
          {saving && <Spinner size="sm" />}
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <StatusBtn
          label={STATUS_BUTTONS[0].label}
          selected={STATUS_BUTTONS[0].selected}
          active={entry.status === 'HERE'}
          onClick={() => handleClick('HERE')}
        />
        <StatusBtn
          label={STATUS_BUTTONS[1].label}
          selected={STATUS_BUTTONS[1].selected}
          active={entry.status === 'LATE'}
          onClick={() => handleClick('LATE')}
        />
        {isLate && (
          <StatusBtn
            label={STATUS_BUTTONS[2].label}
            selected={STATUS_BUTTONS[2].selected}
            active={entry.status === 'ABSENT'}
            onClick={() => handleClick('ABSENT')}
          />
        )}
        <StatusBtn
          label={STATUS_BUTTONS[3].label}
          selected={STATUS_BUTTONS[3].selected}
          active={entry.status === 'EXCUSED' || excuseOpen}
          onClick={() => handleClick('EXCUSED')}
        />
      </div>

      {excuseOpen && (
        <div className="mt-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setReasonTouched(true)}
            placeholder="Reason for excused absence"
            className={clsx(
              'w-full px-3 py-2.5 rounded-lg bg-bg-base text-text-primary',
              'border min-h-[48px] focus:outline-none focus:ring-2 focus:ring-brand/50',
              reasonInvalid ? 'border-danger' : 'border-border',
            )}
          />
          {reasonInvalid && (
            <p className="text-xs text-danger mt-1">Reason required</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSaveExcuse} className="flex-1">
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setExcuseOpen(entry.status === 'EXCUSED');
                setReason(entry.excuseReason ?? '');
                setReasonTouched(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {entry.status === 'EXCUSED' && entry.excuseReason && !excuseOpen && (
        <p className="text-xs text-text-secondary mt-2 italic truncate">
          “{entry.excuseReason}”
        </p>
      )}
    </div>
  );
}

function RoomBlock({
  room,
  canMessy,
  onSetEntry,
  saving,
  flashes,
  onMarkMessy,
  messyPulse,
}: {
  room: DormRollCallRoom;
  canMessy: boolean;
  onSetEntry: (
    entryId: string,
    status: DormAttendanceStatus,
    excuseReason?: string,
  ) => Promise<void>;
  saving: Set<string>;
  flashes: Record<string, number>;
  onMarkMessy: (roomId: string) => void;
  messyPulse: string | null;
}) {
  const messy = room.messy;
  const pulsing = messyPulse === room.id;

  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden mb-4">
      <div
        className={clsx(
          'flex items-center justify-between gap-3 px-4 py-3 border-b border-border',
          messy ? 'bg-danger/10' : 'bg-bg-elevated',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-text-primary text-base truncate">
            {room.name}
          </h3>
          <span className="text-xs text-text-secondary">
            ({room.entries.length})
          </span>
          {messy && (
            <Badge variant="danger">
              <Sparkles size={10} className="mr-1" /> Messy +1
            </Badge>
          )}
        </div>
        {canMessy && (
          <button
            type="button"
            onClick={() => onMarkMessy(room.id)}
            disabled={messy}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold min-h-[44px] touch-manipulation',
              'border-2 transition-all select-none',
              messy
                ? 'border-danger/40 bg-danger/20 text-danger cursor-not-allowed opacity-70'
                : 'border-warning bg-warning/10 text-warning hover:bg-warning/20 active:scale-95',
              pulsing && 'animate-pulse',
            )}
            aria-label={`Mark ${room.name} messy`}
          >
            <AlertTriangle size={14} />
            {messy ? 'Messy' : 'Mark Messy +1'}
          </button>
        )}
      </div>
      {room.entries.length === 0 ? (
        <p className="text-sm text-text-secondary p-4">No residents.</p>
      ) : (
        <div>
          {room.entries.map((e) => (
            <StudentRow
              key={e.id}
              entry={e}
              onChange={(s, r) => onSetEntry(e.id, s, r)}
              saving={saving.has(e.id)}
              flashAt={flashes[e.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DormRollCallPage() {
  const { slotId = '' } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [messyPulse, setMessyPulse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryKey = ['dorm-roll-call', slotId];
  const { data: rc, isLoading } = useQuery<DormRollCall>({
    queryKey,
    queryFn: () => dormsApi.open(slotId),
    enabled: !!slotId,
  });

  const showError = (msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4000);
  };

  const setEntryMut = useMutation({
    mutationFn: async (vars: {
      entryId: string;
      status: DormAttendanceStatus;
      excuseReason?: string;
    }) =>
      dormsApi.setEntry(vars.entryId, {
        status: vars.status,
        excuseReason: vars.excuseReason,
      }),
  });

  const messyMut = useMutation({
    mutationFn: (roomId: string) =>
      dormsApi.markRoomMessy(rc!.id, roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const handleSetEntry = async (
    entryId: string,
    status: DormAttendanceStatus,
    excuseReason?: string,
  ) => {
    if (!rc) return;
    // Find the entry in any room or orphan list.
    const all: DormRollCallEntry[] = [
      ...rc.rooms.flatMap((r) => r.entries),
      ...rc.orphanEntries,
    ];
    const before = all.find((e) => e.id === entryId);
    if (!before) return;

    // Optimistic
    qc.setQueryData<DormRollCall>(queryKey, (cur) => {
      if (!cur) return cur;
      const map = (es: DormRollCallEntry[]) =>
        es.map((e) =>
          e.id === entryId
            ? { ...e, status, excuseReason: status === 'EXCUSED' ? excuseReason ?? null : null }
            : e,
        );
      return {
        ...cur,
        rooms: cur.rooms.map((r) => ({ ...r, entries: map(r.entries) })),
        orphanEntries: map(cur.orphanEntries),
      };
    });
    setSavingIds((s) => new Set(s).add(entryId));
    try {
      await setEntryMut.mutateAsync({ entryId, status, excuseReason });
      setFlashes((f) => ({ ...f, [entryId]: Date.now() }));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Failed to save';
      showError(msg);
      // Roll back
      qc.setQueryData<DormRollCall>(queryKey, (cur) => {
        if (!cur) return cur;
        const map = (es: DormRollCallEntry[]) =>
          es.map((e) => (e.id === entryId ? before : e));
        return {
          ...cur,
          rooms: cur.rooms.map((r) => ({ ...r, entries: map(r.entries) })),
          orphanEntries: map(cur.orphanEntries),
        };
      });
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(entryId);
        return n;
      });
    }
  };

  const handleMarkMessy = async (roomId: string) => {
    if (!rc) return;
    setMessyPulse(roomId);
    try {
      await messyMut.mutateAsync(roomId);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Failed to mark messy';
      showError(msg);
    } finally {
      setTimeout(() => setMessyPulse(null), 800);
    }
  };

  if (isLoading || !rc) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const canMessy = rc.kind === 'DORM_MORNING' && rc.allowsMessyRoomPoints;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      <button
        onClick={() => navigate('/dorm-roll-call')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3 min-h-[40px] touch-manipulation"
      >
        <ArrowLeft size={16} /> Pending
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
            {rc.dormName}
          </h1>
          <Badge variant={rc.slotKind === 'morning' ? 'warning' : 'brand'}>
            {rc.slotKind}
          </Badge>
        </div>
        <p className="text-xs text-text-secondary inline-flex items-center gap-1 mt-1">
          <Clock size={12} /> {rc.timeOfDay} •{' '}
          {new Date(rc.occursOn).toLocaleDateString()}
        </p>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {rc.rooms.length === 0 && rc.orphanEntries.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded-xl p-6 text-center text-text-secondary text-sm">
          No residents in this dorm yet.
        </div>
      ) : (
        <>
          {rc.rooms.map((room) => (
            <RoomBlock
              key={room.id}
              room={room}
              canMessy={canMessy}
              onSetEntry={handleSetEntry}
              saving={savingIds}
              flashes={flashes}
              onMarkMessy={handleMarkMessy}
              messyPulse={messyPulse}
            />
          ))}
          {rc.orphanEntries.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg-elevated">
                <h3 className="font-semibold text-text-primary text-sm">
                  Unassigned residents
                </h3>
              </div>
              {rc.orphanEntries.map((e) => (
                <StudentRow
                  key={e.id}
                  entry={e}
                  onChange={(s, r) => handleSetEntry(e.id, s, r)}
                  saving={savingIds.has(e.id)}
                  flashAt={flashes[e.id] ?? null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

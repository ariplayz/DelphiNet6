import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Check, MapPin, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  AttendanceEntry,
  AttendanceStatus,
  RollCall,
  attendanceApi,
} from '../../lib/api/attendance';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type StatusButton = {
  status: AttendanceStatus;
  label: string;
  selectedClasses: string;
};

const STATUS_BUTTONS: StatusButton[] = [
  { status: 'HERE', label: 'Here', selectedClasses: 'bg-success text-white border-success' },
  { status: 'LATE', label: 'Late', selectedClasses: 'bg-warning text-white border-warning' },
  { status: 'ABSENT', label: 'Absent', selectedClasses: 'bg-danger text-white border-danger' },
  { status: 'EXCUSED', label: 'Excused', selectedClasses: 'bg-bg-elevated text-text-primary border-border' },
];

function StatusButtonControl({
  status,
  active,
  onClick,
  className,
}: {
  status: StatusButton;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex-1 min-h-[48px] min-w-[80px] px-3 rounded-lg border text-sm font-semibold',
        'transition-colors touch-manipulation select-none',
        active
          ? status.selectedClasses
          : 'bg-transparent text-text-secondary border-border hover:bg-bg-hover',
        className,
      )}
    >
      {status.label}
    </button>
  );
}

interface StudentRowProps {
  entry: AttendanceEntry;
  onChange: (status: AttendanceStatus, excuseReason?: string) => Promise<void>;
  saving: boolean;
  flashSavedAt: number | null;
}

function StudentRow({ entry, onChange, saving, flashSavedAt }: StudentRowProps) {
  const [excuseOpen, setExcuseOpen] = useState(entry.status === 'EXCUSED');
  const [reason, setReason] = useState(entry.excuseReason ?? '');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (flashSavedAt) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [flashSavedAt]);

  useEffect(() => {
    setReason(entry.excuseReason ?? '');
    setExcuseOpen(entry.status === 'EXCUSED');
  }, [entry.id, entry.status, entry.excuseReason]);

  const isLate = entry.status === 'LATE' || entry.status === 'ABSENT';

  const handleStatusClick = async (status: AttendanceStatus) => {
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
          <span className="text-lg font-medium text-text-primary truncate">
            {entry.student?.firstName} {entry.student?.lastName}
          </span>
          {showFlash && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-white"
              aria-label="Saved"
            >
              <Check size={12} />
            </span>
          )}
          {saving && <Spinner size="sm" />}
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <StatusButtonControl
          status={STATUS_BUTTONS[0]}
          active={entry.status === 'HERE'}
          onClick={() => handleStatusClick('HERE')}
        />
        <StatusButtonControl
          status={STATUS_BUTTONS[1]}
          active={entry.status === 'LATE'}
          onClick={() => handleStatusClick('LATE')}
        />
        {isLate && (
          <StatusButtonControl
            status={STATUS_BUTTONS[2]}
            active={entry.status === 'ABSENT'}
            onClick={() => handleStatusClick('ABSENT')}
          />
        )}
        <StatusButtonControl
          status={STATUS_BUTTONS[3]}
          active={entry.status === 'EXCUSED' || excuseOpen}
          onClick={() => handleStatusClick('EXCUSED')}
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
              onClick={() => {
                setExcuseOpen(entry.status === 'EXCUSED');
                setReason(entry.excuseReason ?? '');
                setReasonTouched(false);
              }}
              className="flex-1"
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

export function RollCallPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryKey = ['attendance', 'roll-call', sessionId];

  const { data: rc, isLoading } = useQuery<RollCall>({
    queryKey,
    queryFn: () => attendanceApi.openRollCall(sessionId),
    enabled: !!sessionId,
  });

  const showError = (msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4000);
  };

  const setEntryMutation = useMutation({
    mutationFn: async (vars: {
      entryId: string;
      status: AttendanceStatus;
      excuseReason?: string;
    }) =>
      attendanceApi.setEntry(vars.entryId, {
        status: vars.status,
        excuseReason: vars.excuseReason,
      }),
  });

  const handleEntryChange = async (
    entryId: string,
    status: AttendanceStatus,
    excuseReason?: string,
  ) => {
    if (!rc) return;
    const before = rc.entries.find((e) => e.id === entryId);
    if (!before) return;

    // Optimistic update.
    qc.setQueryData<RollCall>(queryKey, (cur) =>
      cur
        ? {
            ...cur,
            entries: cur.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    status,
                    excuseReason: status === 'EXCUSED' ? excuseReason ?? null : null,
                  }
                : e,
            ),
          }
        : cur,
    );
    setSavingIds((s) => new Set(s).add(entryId));
    try {
      const updated = await setEntryMutation.mutateAsync({ entryId, status, excuseReason });
      qc.setQueryData<RollCall>(queryKey, (cur) =>
        cur
          ? {
              ...cur,
              entries: cur.entries.map((e) => (e.id === entryId ? { ...e, ...updated } : e)),
            }
          : cur,
      );
      setFlashes((f) => ({ ...f, [entryId]: Date.now() }));
    } catch (err: unknown) {
      // Revert.
      qc.setQueryData<RollCall>(queryKey, (cur) =>
        cur
          ? {
              ...cur,
              entries: cur.entries.map((e) => (e.id === entryId ? before : e)),
            }
          : cur,
      );
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message ?? 'Failed to save');
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(entryId);
        return next;
      });
    }
  };

  const counts = useMemo(() => {
    const c = { HERE: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    rc?.entries.forEach((e) => {
      c[e.status] += 1;
    });
    return c;
  }, [rc]);

  if (isLoading || !rc) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const cls = rc.classSession?.class;
  const summaryAllHere =
    counts.LATE === 0 && counts.ABSENT === 0 && counts.EXCUSED === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/roll-call')}
            className="p-2 -ml-2 text-text-secondary hover:text-text-primary touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-text-primary truncate">
              {cls?.name ?? 'Roll Call'}
            </h1>
            <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
              {rc.classSession && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {formatTime(rc.classSession.startsAt)} –{' '}
                  {formatTime(rc.classSession.endsAt)}
                </span>
              )}
              {cls?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {cls.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-danger/10 border-b border-danger/30 text-danger text-sm px-4 py-2">
          {error}
        </div>
      )}

      {/* Roster */}
      <div className="flex-1 overflow-y-auto pb-32">
        {rc.entries.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No students enrolled in this class.
          </div>
        ) : (
          <div>
            {rc.entries.map((entry) => (
              <StudentRow
                key={entry.id}
                entry={entry}
                saving={savingIds.has(entry.id)}
                flashSavedAt={flashes[entry.id] ?? null}
                onChange={(status, reason) =>
                  handleEntryChange(entry.id, status, reason)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 inset-x-0 md:static z-20 bg-bg-surface border-t border-border px-4 py-3 pb-safe md:pb-3">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="text-sm text-text-secondary truncate">
            {summaryAllHere ? (
              <span className="text-success font-medium">All marked Here ✓</span>
            ) : (
              <>
                {counts.LATE} late · {counts.ABSENT} absent · {counts.EXCUSED} excused
              </>
            )}
          </div>
          <Button onClick={() => navigate('/roll-call')}>Done</Button>
        </div>
      </footer>
    </div>
  );
}

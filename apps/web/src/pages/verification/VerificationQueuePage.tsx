import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Check, X, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  AttendanceStatus,
  STATUS_LABELS,
  VerificationEntry,
  VerificationQueueResponse,
  attendanceApi,
} from '../../lib/api/attendance';

function statusBadgeVariant(status: AttendanceStatus) {
  switch (status) {
    case 'HERE':
      return 'success' as const;
    case 'LATE':
      return 'warning' as const;
    case 'ABSENT':
      return 'danger' as const;
    case 'EXCUSED':
    default:
      return 'default' as const;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

interface RowProps {
  entry: VerificationEntry;
  onVerify: (entryId: string) => void;
  onExcuse: (entryId: string, reason: string) => void;
  pending: boolean;
}

function EntryRow({ entry, onVerify, onExcuse, pending }: RowProps) {
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [reason, setReason] = useState('');

  const className =
    entry.rollCall.classSession?.class.name ?? entry.rollCall.class?.name ?? '—';

  const isVerified = entry.verificationStatus === 'verified';
  const isExcusedByCouncil = entry.verificationStatus === 'excused_by_council';

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{className}</span>
            <Badge variant={statusBadgeVariant(entry.status)}>
              {STATUS_LABELS[entry.status]}
            </Badge>
            <span className="text-xs text-text-secondary">{entry.pointsAwarded} pts</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {formatDateTime(entry.createdAt)}
            {entry.rollCall.takenByUser && (
              <>
                {' · by '}
                {entry.rollCall.takenByUser.firstName}{' '}
                {entry.rollCall.takenByUser.lastName}
              </>
            )}
          </p>

          {isVerified && entry.verifier && entry.verifiedAt && (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <Check size={12} />
              Verified by {entry.verifier.firstName} {entry.verifier.lastName} on{' '}
              {formatShort(entry.verifiedAt)}
            </p>
          )}
          {isExcusedByCouncil && (
            <p className="text-xs text-warning mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              Excused
              {entry.verifier &&
                ` by ${entry.verifier.firstName} ${entry.verifier.lastName}`}
              {entry.councilExcuseReason && `: “${entry.councilExcuseReason}”`}
            </p>
          )}
          {!isVerified && !isExcusedByCouncil && entry.excuseReason && (
            <p className="text-xs text-text-secondary mt-1 italic">
              Original reason: “{entry.excuseReason}”
            </p>
          )}
        </div>

        {!isVerified && !isExcusedByCouncil && (
          <div className="flex flex-col sm:items-end gap-2 sm:w-auto w-full">
            {!excuseOpen ? (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onVerify(entry.id)}
                  disabled={pending}
                  className="flex-1 sm:flex-none"
                >
                  <Check size={14} />
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setExcuseOpen(true)}
                  disabled={pending}
                  className="flex-1 sm:flex-none"
                >
                  Excuse
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full sm:w-72">
                <input
                  type="text"
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  className="w-full rounded-lg px-3 py-2 text-base sm:text-sm min-h-[44px] bg-bg-elevated border border-border text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const r = reason.trim();
                      if (!r) return;
                      onExcuse(entry.id, r);
                      setExcuseOpen(false);
                      setReason('');
                    }}
                    disabled={pending || reason.trim() === ''}
                    className="flex-1"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setExcuseOpen(false);
                      setReason('');
                    }}
                    disabled={pending}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function VerificationQueuePage() {
  const qc = useQueryClient();
  const [week, setWeek] = useState<'current' | 'previous'>('current');
  const [includeVerified, setIncludeVerified] = useState(false);

  const queryKey = ['attendance', 'verification-queue', week, includeVerified];
  const { data, isLoading, isFetching } = useQuery<VerificationQueueResponse>({
    queryKey,
    queryFn: () =>
      attendanceApi.verificationQueue({ week, includeVerified }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { student: VerificationEntry['student']; entries: VerificationEntry[] }>();
    for (const e of data?.entries ?? []) {
      const cur = map.get(e.studentUserId);
      if (cur) cur.entries.push(e);
      else map.set(e.studentUserId, { student: e.student, entries: [e] });
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.student.lastName} ${a.student.firstName}`.localeCompare(
        `${b.student.lastName} ${b.student.firstName}`,
      ),
    );
  }, [data]);

  const patchOptimistic = (
    entryId: string,
    patch: Partial<VerificationEntry>,
  ) => {
    qc.setQueryData<VerificationQueueResponse | undefined>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        entries: old.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
      };
    });
  };

  const verifyMut = useMutation({
    mutationFn: (entryId: string) => attendanceApi.verifyEntry(entryId),
    onMutate: (entryId) => {
      const prev = qc.getQueryData<VerificationQueueResponse>(queryKey);
      patchOptimistic(entryId, {
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString(),
      });
      return { prev };
    },
    onError: (_err, _e, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const excuseMut = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      attendanceApi.excuseEntry(entryId, reason),
    onMutate: ({ entryId, reason }) => {
      const prev = qc.getQueryData<VerificationQueueResponse>(queryKey);
      patchOptimistic(entryId, {
        verificationStatus: 'excused_by_council',
        status: 'EXCUSED',
        pointsAwarded: 0,
        councilExcuseReason: reason,
        verifiedAt: new Date().toISOString(),
      });
      return { prev };
    },
    onError: (_err, _e, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const pending = verifyMut.isPending || excuseMut.isPending;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Attendance Verification
        </h1>
        {isFetching && <Spinner size="sm" />}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-border bg-bg-surface p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setWeek('current')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium min-h-[40px] ${
              week === 'current' ? 'bg-brand text-white' : 'text-text-secondary'
            }`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeek('previous')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium min-h-[40px] ${
              week === 'previous' ? 'bg-brand text-white' : 'text-text-secondary'
            }`}
          >
            Last week
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer min-h-[40px]">
          <input
            type="checkbox"
            checked={includeVerified}
            onChange={(e) => setIncludeVerified(e.target.checked)}
            className="w-4 h-4 accent-brand"
          />
          Show already verified
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary flex flex-col items-center gap-2">
          <Clock size={20} />
          <p>Nothing to verify {includeVerified ? 'in this period' : 'right now'}.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(({ student, entries }) => {
            const totalPoints = entries.reduce(
              (sum, e) => sum + e.pointsAwarded,
              0,
            );
            const restricted = totalPoints >= 4;
            return (
              <section key={student.id}>
                <header className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {totalPoints} pts this week · {entries.length} entr
                      {entries.length === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                  {restricted && <Badge variant="danger">Restricted</Badge>}
                </header>
                <div className="flex flex-col gap-2">
                  {entries.map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      pending={pending}
                      onVerify={(id) => verifyMut.mutate(id)}
                      onExcuse={(id, reason) =>
                        excuseMut.mutate({ entryId: id, reason })
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

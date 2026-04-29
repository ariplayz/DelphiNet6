import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  AttendanceStatus,
  HistoryEntry,
  STATUS_LABELS,
  WeekStatus,
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function MyAttendancePage() {
  const { data: week, isLoading: loadingWeek } = useQuery<WeekStatus>({
    queryKey: ['attendance', 'me', 'week'],
    queryFn: () => attendanceApi.myWeek(),
  });

  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromIso = from.toISOString();
  const { data: history = [], isLoading: loadingHistory } = useQuery<HistoryEntry[]>({
    queryKey: ['attendance', 'me', 'history', fromIso],
    queryFn: () => attendanceApi.myHistory(fromIso),
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-4">
        My Attendance
      </h1>

      <Card className="p-5 sm:p-6 mb-5">
        {loadingWeek || !week ? (
          <div className="flex justify-center py-6">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-text-secondary uppercase font-semibold tracking-wide">
                This week
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-bold text-text-primary">
                  {week.points}
                </span>
                <span className="text-text-secondary text-base">
                  / {week.restrictionThreshold} pts
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Resets {formatDate(week.resetsAt)}
              </p>
            </div>
            <div>
              {week.restricted ? (
                <Badge variant="danger">Restricted</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </div>
          </div>
        )}
      </Card>

      <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-3">
        Recent (last 30 days)
      </h2>

      {loadingHistory ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : history.length === 0 ? (
        <Card className="p-6 text-center text-text-secondary">
          No attendance records yet.
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {history.map((e) => {
              const className =
                e.rollCall.classSession?.class.name ?? e.rollCall.class?.name ?? '—';
              return (
                <Card key={e.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {className}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(e.createdAt)}
                      </p>
                      {e.excuseReason && (
                        <p className="text-xs text-text-secondary mt-1 italic truncate">
                          “{e.excuseReason}”
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusBadgeVariant(e.status)}>
                        {STATUS_LABELS[e.status]}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        {e.pointsAwarded} pts
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-3 text-text-primary">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {e.rollCall.classSession?.class.name ??
                        e.rollCall.class?.name ??
                        '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(e.status)}>
                        {STATUS_LABELS[e.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{e.pointsAwarded}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {e.excuseReason ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

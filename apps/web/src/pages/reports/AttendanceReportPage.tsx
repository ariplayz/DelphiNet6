import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { RestrictedRow, attendanceApi } from '../../lib/api/attendance';

const RESTRICTION_THRESHOLD = 4;

export function AttendanceReportPage() {
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery<RestrictedRow[]>({
    queryKey: ['attendance', 'restricted'],
    queryFn: () => attendanceApi.restricted(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => {
      const full = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
      return full.includes(q) || r.student.email.toLowerCase().includes(q);
    });
  }, [data, search]);

  // already sorted by points desc from the API, but re-sort after client filter
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.points - a.points),
    [filtered],
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-5">
        Attendance Report
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Card className="flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-danger" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary uppercase font-semibold tracking-wide">
              On Restriction
            </p>
            <p className="text-2xl font-bold text-text-primary">
              {isLoading ? '—' : data.length}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary uppercase font-semibold tracking-wide">
              Restriction Threshold
            </p>
            <p className="text-2xl font-bold text-text-primary">
              {RESTRICTION_THRESHOLD} pts
            </p>
            <p className="text-xs text-text-secondary">per week</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-lg pl-9 pr-4 py-2 text-base sm:text-sm min-h-[44px] bg-bg-elevated border border-border text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-text-secondary flex flex-col items-center gap-3">
          {search ? (
            <p className="text-sm">No students match "{search}".</p>
          ) : (
            <>
              <span className="text-4xl">🎉</span>
              <p className="text-sm font-medium">No students currently on restriction</p>
              <p className="text-xs text-text-disabled">
                Students appear here once they reach {RESTRICTION_THRESHOLD} attendance points this week.
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {sorted.map((row) => (
              <Card key={row.student.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {row.student.firstName} {row.student.lastName}
                    </p>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {row.student.email}
                    </p>
                    {row.student.form != null && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        Form {row.student.form}
                      </p>
                    )}
                    {row.pendingVerificationCount > 0 && (
                      <p className="text-xs text-warning mt-1">
                        {row.pendingVerificationCount} pending verification
                        {row.pendingVerificationCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant="danger">Restricted</Badge>
                    <span className="text-sm font-bold text-danger">{row.points} pts</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Form</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.student.id} className="border-t border-border hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {row.student.firstName} {row.student.lastName}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{row.student.email}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.student.form != null ? `Form ${row.student.form}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-danger">
                      {row.points}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="danger">Restricted</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {row.pendingVerificationCount > 0 ? (
                        <span className="text-warning font-medium">
                          {row.pendingVerificationCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-disabled mt-3 text-right">
            {sorted.length} student{sorted.length !== 1 ? 's' : ''} on restriction this week
          </p>
        </>
      )}
    </div>
  );
}

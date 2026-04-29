import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

interface SnapshotStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form: number | null;
}

interface Snapshot {
  id: string;
  studentUserId: string;
  schoolId: string;
  weekStart: string;
  totalPoints: number;
  restricted: boolean;
  student: SnapshotStudent;
}

type SortKey = 'name' | 'current';

interface PlusMinusReportPageProps {
  weeks?: number;
  title?: string;
}

function cellClass(restricted: boolean, points: number) {
  if (restricted) return 'bg-danger/10 text-danger';
  if (points === 0) return 'bg-warning/10 text-warning';
  return 'bg-success/10 text-success';
}

export function PlusMinusReportPage({
  weeks = 8,
  title = '+/- Days Report',
}: PlusMinusReportPageProps) {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const { data: snapshots = [], isLoading } = useQuery<Snapshot[]>({
    queryKey: ['attendance', 'all-snapshots', weeks],
    queryFn: async () => {
      const res = await api.get<Snapshot[]>(`/attendance/all-snapshots?weeks=${weeks}`);
      return res.data;
    },
    enabled: hasPermission('students.view_all'),
  });

  // Build sorted list of unique week starts (most recent first, limited to `weeks`)
  const weekCols = useMemo(() => {
    const seen = new Set<string>();
    for (const s of snapshots) seen.add(s.weekStart);
    return Array.from(seen)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, weeks);
  }, [snapshots, weeks]);

  // Group snapshots by studentUserId
  const snapshotsByStudent = useMemo(() => {
    const map = new Map<string, Map<string, Snapshot>>();
    for (const s of snapshots) {
      if (!map.has(s.studentUserId)) map.set(s.studentUserId, new Map());
      map.get(s.studentUserId)!.set(s.weekStart, s);
    }
    return map;
  }, [snapshots]);

  // Unique students
  const students = useMemo(() => {
    const seen = new Map<string, SnapshotStudent>();
    for (const s of snapshots) {
      if (!seen.has(s.studentUserId)) seen.set(s.studentUserId, s.student);
    }
    return Array.from(seen.values());
  }, [snapshots]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q
      ? students.filter((u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
        )
      : students;

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sort === 'name') {
        cmp = `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        );
      } else {
        const aSnap = snapshotsByStudent.get(a.id)?.get(weekCols[0]);
        const bSnap = snapshotsByStudent.get(b.id)?.get(weekCols[0]);
        cmp = (aSnap?.totalPoints ?? 0) - (bSnap?.totalPoints ?? 0);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [students, search, sort, sortAsc, snapshotsByStudent, weekCols]);

  // School-wide totals per week
  const totals = useMemo(() => {
    return weekCols.map((wk) =>
      Array.from(snapshotsByStudent.values()).reduce(
        (sum, m) => sum + (m.get(wk)?.totalPoints ?? 0),
        0,
      ),
    );
  }, [weekCols, snapshotsByStudent]);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortAsc((a) => !a);
    else { setSort(key); setSortAsc(true); }
  }

  if (!hasPermission('students.view_all')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-text-secondary">Permission required: students.view_all</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-5">{title}</h1>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-base rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <Card padding={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-secondary font-semibold whitespace-nowrap">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 hover:text-text-primary"
                  >
                    Student <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="text-left px-3 py-3 text-text-secondary font-semibold">Form</th>
                {weekCols.map((wk, i) => (
                  <th key={wk} className="px-3 py-3 text-text-secondary font-semibold whitespace-nowrap">
                    {i === 0 ? (
                      <button
                        onClick={() => toggleSort('current')}
                        className="flex items-center gap-1 hover:text-text-primary mx-auto"
                      >
                        {new Date(wk).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <ArrowUpDown size={12} />
                      </button>
                    ) : (
                      new Date(wk).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const map = snapshotsByStudent.get(student.id) ?? new Map<string, Snapshot>();
                return (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-bg-surface/50">
                    <td className="px-4 py-2 text-text-primary whitespace-nowrap">
                      {student.lastName}, {student.firstName}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {student.form ?? '—'}
                    </td>
                    {weekCols.map((wk) => {
                      const snap = map.get(wk);
                      return (
                        <td key={wk} className="px-3 py-2 text-center">
                          {snap ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cellClass(snap.restricted, snap.totalPoints)}`}
                            >
                              {snap.totalPoints}
                            </span>
                          ) : (
                            <span className="text-text-secondary text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-bg-surface">
                <td className="px-4 py-2 font-semibold text-text-primary" colSpan={2}>
                  School Total
                </td>
                {totals.map((t, i) => (
                  <td key={i} className="px-3 py-2 text-center font-semibold text-text-primary">
                    {t}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}

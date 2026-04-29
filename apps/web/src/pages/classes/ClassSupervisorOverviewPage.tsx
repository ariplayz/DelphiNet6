import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';

interface OverviewStudent {
  student: { id: string; firstName: string; lastName: string; form: number | null };
  pointsToday: number;
  pointsThisWeek: number;
  pointsLast30Days: number;
  weekEntries: number;
  restricted: boolean;
  lastEntry: { status: string; points: number; verified: boolean; at: string } | null;
}

interface Overview {
  classId: string;
  className: string;
  weekStart: string;
  restrictionThreshold: number;
  totals: {
    todayPoints: number;
    weekPoints: number;
    restrictedCount: number;
    studentCount: number;
  };
  students: OverviewStudent[];
}

export function ClassSupervisorOverviewPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<Overview>({
    queryKey: ['class', id, 'overview'],
    queryFn: async () => (await api.get<Overview>(`/classes/${id}/overview`)).data,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-danger">Unable to load class overview.</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(`/classes/${id}`)}>
          <ArrowLeft size={16} /> Class
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">{data.className}</h1>
          <p className="text-sm text-text-secondary">Supervisor overview</p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Students" value={data.totals.studentCount} />
        <KpiTile label="Points today" value={data.totals.todayPoints} />
        <KpiTile label="Points this week" value={data.totals.weekPoints} />
        <KpiTile
          label="Restricted"
          value={data.totals.restrictedCount}
          tone={data.totals.restrictedCount > 0 ? 'danger' : 'normal'}
        />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {data.students.map((s) => <StudentCard key={s.student.id} s={s} threshold={data.restrictionThreshold} />)}
      </div>

      {/* Desktop grid */}
      <Card className="hidden lg:block overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-secondary text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Student</th>
              <th className="text-left px-3 py-2 font-medium">Form</th>
              <th className="text-right px-3 py-2 font-medium">Today</th>
              <th className="text-right px-3 py-2 font-medium">This week</th>
              <th className="text-right px-3 py-2 font-medium">Last 30d</th>
              <th className="text-left px-3 py-2 font-medium">Last entry</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => {
              const restricted = s.restricted;
              return (
                <tr key={s.student.id} className="border-t border-border hover:bg-bg-hover">
                  <td className="px-3 py-2 text-text-primary">{s.student.lastName}, {s.student.firstName}</td>
                  <td className="px-3 py-2 text-text-secondary">{s.student.form ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{s.pointsToday}</td>
                  <td className={clsx('px-3 py-2 text-right font-medium', restricted ? 'text-danger' : 'text-text-primary')}>
                    {s.pointsThisWeek}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">{s.pointsLast30Days}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {s.lastEntry ? (
                      <span>
                        {s.lastEntry.status} ({s.lastEntry.points}pt)
                        {' · '}
                        {new Date(s.lastEntry.at).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {restricted ? (
                      <Badge variant="danger">
                        <AlertTriangle size={12} className="mr-1" /> Restricted
                      </Badge>
                    ) : s.pointsThisWeek === 0 ? (
                      <Badge variant="success"><CheckCircle2 size={12} className="mr-1" /> Clear</Badge>
                    ) : (
                      <Badge>OK</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.students.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6 text-text-secondary">No students enrolled.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-text-disabled text-center">
        Week resets every Tuesday · {data.restrictionThreshold}+ points = restricted
      </p>
    </div>
  );
}

function KpiTile({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'danger' }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-semibold mt-0.5', tone === 'danger' && value > 0 ? 'text-danger' : 'text-text-primary')}>{value}</p>
    </Card>
  );
}

function StudentCard({ s, threshold }: { s: OverviewStudent; threshold: number }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{s.student.lastName}, {s.student.firstName}</p>
          <p className="text-xs text-text-secondary">Form {s.student.form ?? '—'}</p>
        </div>
        {s.restricted && (
          <Badge variant="danger"><AlertTriangle size={12} className="mr-1" /> {s.pointsThisWeek}/{threshold}</Badge>
        )}
      </div>
      <div className="grid grid-cols-3 mt-2 text-center text-xs">
        <div><p className="text-text-disabled">Today</p><p className="text-base font-semibold text-text-primary">{s.pointsToday}</p></div>
        <div><p className="text-text-disabled">Week</p><p className={clsx('text-base font-semibold', s.restricted ? 'text-danger' : 'text-text-primary')}>{s.pointsThisWeek}</p></div>
        <div><p className="text-text-disabled">30d</p><p className="text-base font-semibold text-text-primary">{s.pointsLast30Days}</p></div>
      </div>
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';

type Status = 'PRESENT' | 'ABSENT' | 'EXCUSED';

interface Seminar {
  id: string;
  name: string;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  leader?: { firstName: string; lastName: string } | null;
  enrollments: Array<{
    id: string;
    student: { id: string; firstName: string; lastName: string; form: number | null };
  }>;
}

interface AttendanceRow {
  id: string;
  studentUserId: string;
  status: Status;
  excuseReason: string | null;
  recordedAt: string;
  student: { id: string; firstName: string; lastName: string };
}

export function SeminarRollCallPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: seminar, isLoading } = useQuery<Seminar>({
    queryKey: ['seminar', id],
    queryFn: async () => (await api.get<Seminar>(`/seminars/${id}`)).data,
    enabled: !!id,
  });

  const sessionMut = useMutation({
    mutationFn: async () => (await api.post<{ id: string }>(`/seminars/${id}/sessions/today`)).data,
  });

  const sessionId = sessionMut.data?.id;

  useEffect(() => {
    if (id && !sessionMut.data && !sessionMut.isPending) {
      sessionMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { data: existing } = useQuery<AttendanceRow[]>({
    queryKey: ['seminar-attendance', sessionId],
    queryFn: async () => (await api.get<AttendanceRow[]>(`/seminars/${id}/sessions/${sessionId}/attendance`)).data,
    enabled: !!sessionId,
  });

  const initial = useMemo(() => {
    const map: Record<string, { status: Status; excuseReason: string }> = {};
    (seminar?.enrollments ?? []).forEach((e) => {
      const ex = (existing ?? []).find((r) => r.studentUserId === e.student.id);
      map[e.student.id] = { status: ex?.status ?? 'PRESENT', excuseReason: ex?.excuseReason ?? '' };
    });
    return map;
  }, [seminar, existing]);

  const [marks, setMarks] = useState<Record<string, { status: Status; excuseReason: string }>>({});

  useEffect(() => {
    setMarks(initial);
  }, [initial]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      const entries = Object.entries(marks).map(([studentUserId, m]) => ({
        studentUserId,
        status: m.status,
        excuseReason: m.status === 'EXCUSED' ? m.excuseReason || undefined : undefined,
      }));
      await api.post(`/seminars/${id}/sessions/${sessionId}/attendance`, { entries });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seminar-attendance', sessionId] }),
  });

  if (isLoading) return <div className="p-6 flex justify-center"><Spinner size="lg" /></div>;
  if (!seminar) return <div className="p-6">Seminar not found.</div>;

  const setStatus = (sid: string, status: Status) =>
    setMarks((m) => ({ ...m, [sid]: { ...(m[sid] ?? { excuseReason: '' }), status } }));
  const setReason = (sid: string, excuseReason: string) =>
    setMarks((m) => ({ ...m, [sid]: { ...(m[sid] ?? { status: 'EXCUSED' }), excuseReason } }));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">{seminar.name}</h1>
          <p className="text-xs text-text-secondary">
            Roll call · {new Date().toLocaleDateString()} · {seminar.startsAt} ({seminar.durationMinutes} min)
            {seminar.location ? ` · ${seminar.location}` : ''}
          </p>
        </div>
      </div>

      {sessionMut.isError && (
        <Card className="p-3 border-danger/40">
          <p className="text-sm text-danger flex items-center gap-2">
            <AlertCircle size={16} /> {(sessionMut.error as any)?.response?.data?.message ?? 'Cannot start session.'}
          </p>
          <Link to="/seminars" className="text-xs text-brand underline">Back to seminars</Link>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {seminar.enrollments.length === 0 && (
            <p className="text-center text-text-secondary py-8 text-sm">
              No students enrolled in this seminar.
            </p>
          )}
          {seminar.enrollments.map((e) => {
            const cur = marks[e.student.id] ?? { status: 'PRESENT' as Status, excuseReason: '' };
            return (
              <div key={e.student.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium truncate">
                    {e.student.lastName}, {e.student.firstName}
                  </p>
                  {e.student.form != null && (
                    <p className="text-xs text-text-secondary">Form {e.student.form}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <StatusBtn current={cur.status} value="PRESENT" onClick={() => setStatus(e.student.id, 'PRESENT')}>
                    <Check size={14} /> Here
                  </StatusBtn>
                  <StatusBtn current={cur.status} value="ABSENT" onClick={() => setStatus(e.student.id, 'ABSENT')} variant="danger">
                    <X size={14} /> Absent
                  </StatusBtn>
                  <StatusBtn current={cur.status} value="EXCUSED" onClick={() => setStatus(e.student.id, 'EXCUSED')} variant="warning">
                    Excused
                  </StatusBtn>
                </div>
                {cur.status === 'EXCUSED' && (
                  <input
                    placeholder="Reason"
                    value={cur.excuseReason}
                    onChange={(ev) => setReason(e.student.id, ev.target.value)}
                    className="text-base sm:text-sm bg-bg-elevated border border-border rounded-lg px-2 py-1 min-h-[40px] sm:min-w-[180px]"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {saveMut.isSuccess ? <Badge variant="success">Saved</Badge> : 'Changes are not auto-saved.'}
        </p>
        <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={!sessionId}>
          Save roll call
        </Button>
      </div>
    </div>
  );
}

function StatusBtn({
  current,
  value,
  onClick,
  variant = 'primary',
  children,
}: {
  current: Status;
  value: Status;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'warning';
  children: React.ReactNode;
}) {
  const active = current === value;
  const base = 'px-3 min-h-[40px] rounded-lg text-sm inline-flex items-center gap-1 border';
  let cls = `${base} bg-bg-elevated border-border text-text-secondary hover:bg-bg-hover`;
  if (active) {
    if (variant === 'danger') cls = `${base} bg-danger/15 border-danger text-danger`;
    else if (variant === 'warning') cls = `${base} bg-warning/15 border-warning text-warning`;
    else cls = `${base} bg-brand/15 border-brand text-brand`;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>{children}</button>
  );
}

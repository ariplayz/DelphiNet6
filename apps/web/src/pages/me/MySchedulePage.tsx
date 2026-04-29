import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface ScheduleSession {
  id: string;
  sourceId: string;
  sourceType: 'class' | 'seminar';
  name: string;
  location: string | null;
  kind: string;
  startsAt: string;
  endsAt: string;
  role: 'supervisor' | 'attendee' | 'leader';
}

interface ScheduleResponse {
  from: string;
  to: string;
  sessions: ScheduleSession[];
}

function startOfWeekUtc(d: Date): Date {
  // Anchor on Sunday so the grid layout matches normal calendars.
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export function MySchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekUtc(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const { data, isLoading } = useQuery<ScheduleResponse>({
    queryKey: ['me', 'schedule', weekStart.toISOString()],
    queryFn: async () => {
      const res = await api.get<ScheduleResponse>('/me/schedule', {
        params: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
      });
      return res.data;
    },
  });

  const sessionsByDay = useMemo(() => {
    const buckets: ScheduleSession[][] = Array.from({ length: 7 }, () => []);
    for (const s of data?.sessions ?? []) {
      const day = new Date(s.startsAt).getUTCDay();
      buckets[day].push(s);
    }
    return buckets;
  }, [data]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Schedule</h1>
          <p className="text-sm text-text-secondary">
            Week of {formatLongDate(weekStart)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Prev week
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeekUtc(new Date()))}>
            This week
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next week →
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          {/* Mobile: stacked day list */}
          <div className="md:hidden flex flex-col gap-3">
            {sessionsByDay.map((sessions, dayIdx) => {
              const dayDate = addDays(weekStart, dayIdx);
              return (
                <Card key={dayIdx} title={`${DAY_LABELS[dayIdx]} · ${dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-text-disabled">No sessions.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sessions.map((s) => <SessionRow key={s.id} s={s} />)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-7 gap-3">
            {sessionsByDay.map((sessions, dayIdx) => {
              const dayDate = addDays(weekStart, dayIdx);
              const isToday = dayDate.toDateString() === new Date().toDateString();
              return (
                <div
                  key={dayIdx}
                  className={`bg-bg-surface rounded-xl border p-3 min-h-[260px] ${
                    isToday ? 'border-brand' : 'border-border'
                  }`}
                >
                  <div className="mb-2">
                    <div className="text-xs uppercase font-semibold text-text-secondary">{DAY_LABELS[dayIdx]}</div>
                    <div className="text-sm text-text-primary">{dayDate.getUTCDate()}</div>
                  </div>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-text-disabled">—</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sessions.map((s) => <SessionRow key={s.id} s={s} compact />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SessionRow({ s, compact = false }: { s: ScheduleSession; compact?: boolean }) {
  const link =
    s.sourceType === 'class'
      ? `/classes/${s.sourceId}`
      : `/seminars/${s.sourceId}`;

  return (
    <Link
      to={link}
      className="block rounded-lg bg-bg-elevated hover:bg-bg-hover p-2 transition border border-transparent hover:border-brand/40"
    >
      <div className={`text-${compact ? 'xs' : 'sm'} font-medium text-text-primary truncate`}>{s.name}</div>
      <div className="text-xs text-text-secondary">
        {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
      </div>
      {s.location && (
        <div className="text-xs text-text-disabled truncate">{s.location}</div>
      )}
      {(s.role === 'supervisor' || s.role === 'leader') && (
        <Badge variant="brand" className="mt-1">
          {s.role === 'supervisor' ? 'Supervisor' : 'Leader'}
        </Badge>
      )}
    </Link>
  );
}

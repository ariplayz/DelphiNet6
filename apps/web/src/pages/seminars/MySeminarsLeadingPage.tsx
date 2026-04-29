import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

interface Seminar {
  id: string;
  name: string;
  location: string | null;
  startsAt: string;
  daysOfWeek: number[];
  durationMinutes: number;
  _count?: { enrollments: number };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MySeminarsLeadingPage() {
  const { data, isLoading } = useQuery<Seminar[]>({
    queryKey: ['my-seminars-leading'],
    queryFn: async () => (await api.get<Seminar[]>('/seminars/mine/leading')).data,
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Seminar Roll Call</h1>
        <p className="text-sm text-text-secondary">Pick a seminar to take today's roll call.</p>
      </header>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-text-secondary text-sm">
          You aren't assigned as the leader of any seminar.
        </Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <Link key={s.id} to={`/seminar-roll-call/${s.id}`}>
              <Card className="p-3 hover:bg-bg-hover transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{s.name}</p>
                  <p className="text-xs text-text-secondary">
                    {s.daysOfWeek.sort().map((d) => DAYS[d]).join(' · ') || 'No days set'}
                    {' @ '}{s.startsAt}
                    {s.location ? ` · ${s.location}` : ''}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">{s._count?.enrollments ?? 0} enrolled</span>
                <ChevronRight size={16} className="text-text-disabled" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

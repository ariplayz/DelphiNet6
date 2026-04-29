import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { attendanceApi, PendingRollCall } from '../../lib/api/attendance';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RollCallListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<PendingRollCall[]>({
    queryKey: ['attendance', 'pending'],
    queryFn: () => attendanceApi.myPending(),
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardList className="text-brand" size={24} />
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Roll Call
        </h1>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        Today&apos;s sessions you supervise.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-secondary">No roll call needed today.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((s) => (
            <Card key={s.sessionId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary truncate">
                      {s.className}
                    </h3>
                    {s.taken && <Badge variant="success">Started</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs sm:text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                    </span>
                    {s.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {s.location}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={() => navigate(`/roll-call/${s.sessionId}`)}
                  className="flex-shrink-0"
                >
                  <span className="hidden sm:inline">Take roll call</span>
                  <span className="sm:hidden">Take</span>
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

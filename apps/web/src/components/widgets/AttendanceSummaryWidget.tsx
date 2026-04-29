import { useQuery } from '@tanstack/react-query';
import { WidgetWrapper } from './WidgetWrapper';
import { Spinner } from '../ui/Spinner';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';

interface Summary {
  todayClassesCount: number;
  weeklyPoints: number;
  restrictionThreshold: number;
  restricted: boolean;
  pendingRoutingForms: number;
  unreadNotifications: number;
  weekStart: string;
  nextReset: string;
}

interface Props {
  editMode?: boolean;
}

export function AttendanceSummaryWidget({ editMode }: Props) {
  const { data, isLoading } = useQuery<Summary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await api.get<Summary>('/dashboard/summary')).data,
  });

  return (
    <WidgetWrapper title="Attendance" editMode={editMode}>
      {isLoading || !data ? (
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-col justify-center h-full">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-text-primary">
              {data.weeklyPoints}
            </span>
            <span className="text-text-secondary text-sm">
              / {data.restrictionThreshold} pts this week
            </span>
          </div>
          <div className="mt-3">
            {data.restricted ? (
              <Badge variant="danger">Restricted</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-3">
            Resets{' '}
            {new Date(data.nextReset).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </WidgetWrapper>
  );
}

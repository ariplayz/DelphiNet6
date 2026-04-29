import { useQuery } from '@tanstack/react-query';
import { WidgetWrapper } from './WidgetWrapper';
import { Spinner } from '../ui/Spinner';
import { api } from '../../lib/api';

interface TodayClassesResponse {
  classes: Array<{ id: string; name: string; startsAt: string; endsAt: string }>;
  note?: string;
}

interface Props {
  editMode?: boolean;
}

export function TodayClassesWidget({ editMode }: Props) {
  const { data, isLoading } = useQuery<TodayClassesResponse>({
    queryKey: ['dashboard', 'today-classes'],
    queryFn: async () =>
      (await api.get<TodayClassesResponse>('/dashboard/today-classes')).data,
  });

  return (
    <WidgetWrapper title="Today's Classes" editMode={editMode}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner size="md" />
        </div>
      ) : !data || data.classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center gap-1">
          <p className="text-text-secondary text-sm">No classes today</p>
          {data?.note && (
            <p className="text-text-secondary text-xs italic">{data.note}</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-y-auto">
          {data.classes.map((c) => (
            <li key={c.id} className="py-2 flex justify-between text-sm">
              <span className="text-text-primary font-medium">{c.name}</span>
              <span className="text-text-secondary">
                {new Date(c.startsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetWrapper>
  );
}

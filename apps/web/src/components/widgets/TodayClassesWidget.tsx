import { useQuery } from '@tanstack/react-query';
import { WidgetWrapper } from './WidgetWrapper';
import { Spinner } from '../ui/Spinner';
import { api } from '../../lib/api';

interface TodayClass {
  id: string;
  classId: string;
  name: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
}

interface TodayClassesResponse {
  classes: TodayClass[];
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
          <p className="text-text-secondary text-sm">No classes today 🎉</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-y-auto">
          {data.classes.map((c) => (
            <li
              key={c.id}
              className="py-2 flex items-center justify-between gap-3 text-sm min-h-[44px]"
            >
              <span className="text-text-secondary tabular-nums w-14 flex-shrink-0">
                {new Date(c.startsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium truncate">{c.name}</p>
                {c.location && (
                  <p className="text-text-secondary text-xs truncate">
                    {c.location}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetWrapper>
  );
}

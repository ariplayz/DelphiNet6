import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Home as HomeIcon, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { DormPendingItem, dormsApi } from '../../lib/api/dorms';

export function DormRollCallListPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery<DormPendingItem[]>({
    queryKey: ['dorm-roll-call', 'my-pending'],
    queryFn: () => dormsApi.myPending(),
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-4">
        Dorm Roll Call
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8 text-sm">
            No dorm roll calls pending.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <button
              key={item.slotId}
              onClick={() => navigate(`/dorm-roll-call/${item.slotId}`)}
              className="bg-bg-surface border border-border hover:border-brand rounded-xl p-4 text-left flex items-center gap-3 min-h-[80px] touch-manipulation transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                <HomeIcon size={22} className="text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text-primary text-base">
                    {item.dormName}
                  </p>
                  <Badge variant={item.slot === 'morning' ? 'warning' : 'brand'}>
                    {item.slot}
                  </Badge>
                  {item.taken && (
                    <Badge variant="success">
                      <CheckCircle2 size={10} className="mr-1" /> Taken
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-secondary inline-flex items-center gap-1 mt-1">
                  <Clock size={12} /> {item.timeOfDay}
                </p>
              </div>
              <ChevronRight size={20} className="text-text-disabled flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

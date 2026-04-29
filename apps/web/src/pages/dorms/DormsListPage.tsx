import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Home as HomeIcon, Users, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { DormFormModal } from '../../components/dorms/DormFormModal';
import {
  DormSummary,
  MyResidence,
  dormsApi,
} from '../../lib/api/dorms';

function DormCard({ dorm, onClick }: { dorm: DormSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-bg-surface rounded-xl border border-border p-4 hover:border-brand hover:bg-bg-hover transition-colors min-h-[120px] flex flex-col gap-2 touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary text-sm leading-tight flex-1 min-w-0 truncate">
          {dorm.name}
        </h3>
      </div>
      <p className="text-xs text-text-secondary truncate">
        {dorm.captain
          ? `Captain: ${dorm.captain.firstName} ${dorm.captain.lastName}`
          : 'No captain'}
      </p>
      <div className="flex items-center gap-3 text-xs text-text-secondary mt-auto">
        <span className="inline-flex items-center gap-1">
          <HomeIcon size={12} />
          {dorm.roomCount} rooms
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} />
          {dorm.occupancy}
        </span>
      </div>
    </button>
  );
}

export function DormsListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const canManage = can('reslife.manage');
  const canViewAll = can('dorm.view_all') || canManage;
  const [createOpen, setCreateOpen] = useState(false);

  const { data: residence, isLoading: loadingMine } = useQuery<MyResidence | null>({
    queryKey: ['dorms', 'me', 'residence'],
    queryFn: () => dormsApi.myResidence(),
  });

  const { data: captaincies = [], isLoading: loadingCap } = useQuery<DormSummary[]>({
    queryKey: ['dorms', 'me', 'captaincy'],
    queryFn: () => dormsApi.myCaptaincy(),
  });

  const { data: all = [], isLoading: loadingAll } = useQuery<DormSummary[]>({
    queryKey: ['dorms', 'all'],
    queryFn: () => dormsApi.list(),
    enabled: canViewAll,
  });

  const loading = loadingMine || loadingCap || (canViewAll && loadingAll);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Dorms
        </h1>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            New dorm
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {residence && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                My Dorm
              </h2>
              <Card
                className="cursor-pointer hover:border-brand transition-colors"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/dorms/${residence.dorm.id}`)}
                  className="flex items-center gap-3 w-full text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                    <HomeIcon size={20} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm">
                      {residence.dorm.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      Room {residence.room.name}
                      {residence.dorm.captain &&
                        ` • Captain: ${residence.dorm.captain.firstName} ${residence.dorm.captain.lastName}`}
                    </p>
                  </div>
                </button>
              </Card>
            </section>
          )}

          {captaincies.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-2">
                <Crown size={14} /> I Captain
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {captaincies.map((d) => (
                  <DormCard
                    key={d.id}
                    dorm={d}
                    onClick={() => navigate(`/dorms/${d.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {canViewAll && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                All Dorms
              </h2>
              {all.length === 0 ? (
                <Card>
                  <p className="text-center text-text-secondary py-6 text-sm">
                    No dorms yet.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {all.map((d) => (
                    <DormCard
                      key={d.id}
                      dorm={d}
                      onClick={() => navigate(`/dorms/${d.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {!residence && captaincies.length === 0 && !canViewAll && (
            <Card>
              <p className="text-center text-text-secondary py-8 text-sm">
                You're not assigned to a dorm.
              </p>
            </Card>
          )}
        </div>
      )}

      <DormFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

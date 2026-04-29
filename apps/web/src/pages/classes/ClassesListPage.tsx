import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  CLASS_KIND_LABELS,
  ClassSummary,
  classesApi,
} from '../../lib/api/classes';
import { ClassFormModal } from '../../components/classes/ClassFormModal';

type Tab = 'mine' | 'all';

export function ClassesListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const canManage = can('class.manage');
  const [tab, setTab] = useState<Tab>('mine');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: mine = [], isLoading: loadingMine } = useQuery<ClassSummary[]>({
    queryKey: ['classes', 'mine'],
    queryFn: () => classesApi.mine(),
  });

  const { data: all = [], isLoading: loadingAll } = useQuery<ClassSummary[]>({
    queryKey: ['classes', 'all'],
    queryFn: () => classesApi.list(),
    enabled: canManage && tab === 'all',
  });

  const list = tab === 'mine' ? mine : all;
  const loading = tab === 'mine' ? loadingMine : loadingAll;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Classes
        </h1>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            New class
          </Button>
        )}
      </div>

      {canManage && (
        <div className="flex gap-1 mb-4 bg-bg-surface border border-border rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('mine')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium min-h-[40px] touch-manipulation ${
              tab === 'mine'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            My classes
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium min-h-[40px] touch-manipulation ${
              tab === 'all'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All classes
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8 text-sm">
            {tab === 'mine'
              ? "You're not in any classes yet."
              : 'No classes have been created.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/classes/${c.id}`)}
              className="text-left bg-bg-surface rounded-xl border border-border p-4 hover:border-brand hover:bg-bg-hover transition-colors min-h-[120px] flex flex-col gap-2 touch-manipulation"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-text-primary text-sm leading-tight flex-1 min-w-0 truncate">
                  {c.name}
                </h3>
                <Badge variant="brand">{CLASS_KIND_LABELS[c.kind]}</Badge>
              </div>
              {c.supervisor && (
                <p className="text-xs text-text-secondary truncate">
                  Supervisor: {c.supervisor.firstName} {c.supervisor.lastName}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-text-secondary mt-auto">
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  {c._count?.enrollments ?? 0}
                </span>
                {c.location && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin size={12} />
                    <span className="truncate">{c.location}</span>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <ClassFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

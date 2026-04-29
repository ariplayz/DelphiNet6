import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoutingForm {
  id: string;
  subject: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
  starter: UserSummary;
  assignee?: UserSummary | null;
}

const STATUS_BADGE: Record<string, 'warning' | 'brand' | 'success'> = {
  open: 'warning',
  in_progress: 'brand',
  completed: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function RoutingCard({
  form,
  partyLabel,
  party,
  onAction,
}: {
  form: RoutingForm;
  partyLabel: string;
  party?: UserSummary | null;
  onAction?: (status: 'in_progress' | 'completed') => void;
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{form.subject}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {partyLabel}:{' '}
            {party ? `${party.lastName}, ${party.firstName}` : '—'}
          </p>
          {form.description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {form.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={STATUS_BADGE[form.status] ?? 'default'}>
            {STATUS_LABEL[form.status] ?? form.status}
          </Badge>
          <span className="text-xs text-text-secondary">
            {new Date(form.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      {onAction && (
        <div className="flex gap-2 flex-wrap pt-1">
          {form.status === 'open' && (
            <Button size="sm" variant="secondary" onClick={() => onAction('in_progress')}>
              Mark In Progress
            </Button>
          )}
          {form.status === 'in_progress' && (
            <Button size="sm" onClick={() => onAction('completed')}>
              Mark Complete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function RoutingInboxPage() {
  const [tab, setTab] = useState<'inbox' | 'started'>('inbox');
  const qc = useQueryClient();

  const { data: inbox, isLoading: loadingInbox } = useQuery<RoutingForm[]>({
    queryKey: ['routing/inbox'],
    queryFn: async () => (await api.get<RoutingForm[]>('/routing/inbox')).data,
  });

  const { data: started, isLoading: loadingStarted } = useQuery<RoutingForm[]>({
    queryKey: ['routing/started'],
    queryFn: async () => (await api.get<RoutingForm[]>('/routing/started')).data,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/routing/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routing/inbox'] });
      qc.invalidateQueries({ queryKey: ['routing/started'] });
    },
  });

  const tabs = [
    { key: 'inbox' as const, label: 'Assigned to Me' },
    { key: 'started' as const, label: 'Started by Me' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          My Routes To Handle
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage routes assigned to you or started by you.
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'min-h-[44px] px-4 rounded-lg bg-brand text-white text-sm font-medium'
                : 'min-h-[44px] px-4 rounded-lg bg-bg-elevated border border-border text-text-secondary text-sm'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <>
          {loadingInbox ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (inbox ?? []).length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              No routes assigned to you right now.
            </p>
          ) : (
            <div className="space-y-3">
              {(inbox ?? []).map((form) => (
                <RoutingCard
                  key={form.id}
                  form={form}
                  partyLabel="From"
                  party={form.starter}
                  onAction={(status) => updateMut.mutate({ id: form.id, status })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'started' && (
        <>
          {loadingStarted ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (started ?? []).length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              You haven&apos;t started any routes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(started ?? []).map((form) => (
                <RoutingCard
                  key={form.id}
                  form={form}
                  partyLabel="Assigned to"
                  party={form.assignee}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Edit,
  MapPin,
  Plus,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  CLASS_KIND_LABELS,
  ClassDetail,
  ClassSession,
  classesApi,
} from '../../lib/api/classes';
import { ClassFormModal } from '../../components/classes/ClassFormModal';
import { RosterModal } from '../../components/classes/RosterModal';
import { SessionFormModal } from '../../components/classes/SessionFormModal';

export function ClassDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canManage = can('class.manage');

  const [editOpen, setEditOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: cls, isLoading } = useQuery<ClassDetail>({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => classesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      navigate('/classes');
    },
  });

  const deleteSession = useMutation({
    mutationFn: (sid: string) => classesApi.deleteSession(sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!cls) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-text-secondary">Class not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/classes')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3 min-h-[40px] touch-manipulation"
      >
        <ArrowLeft size={16} />
        Back to classes
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
              {cls.name}
            </h1>
            <Badge variant="brand">{CLASS_KIND_LABELS[cls.kind]}</Badge>
          </div>
          {cls.supervisor && (
            <p className="text-sm text-text-secondary">
              Supervised by {cls.supervisor.firstName} {cls.supervisor.lastName}
            </p>
          )}
        </div>
        {(canManage || cls.supervisorUserId === user?.id) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/classes/${id}/overview`)}>
              Overview
            </Button>
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Edit size={14} />
                  Edit
                </Button>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Info */}
        <Card title="Info">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-text-disabled font-semibold">
                Location
              </dt>
              <dd className="text-text-primary inline-flex items-center gap-1.5 mt-1">
                {cls.location ? (
                  <>
                    <MapPin size={14} className="text-text-secondary" />
                    {cls.location}
                  </>
                ) : (
                  <span className="text-text-secondary">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-disabled font-semibold">
                Notes
              </dt>
              <dd className="text-text-primary whitespace-pre-wrap mt-1">
                {cls.notes || (
                  <span className="text-text-secondary">No notes</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Roster */}
        <Card
          title={`Roster (${cls.enrollments.length})`}
          action={
            canManage && (
              <Button size="sm" variant="secondary" onClick={() => setRosterOpen(true)}>
                Manage
              </Button>
            )
          }
        >
          {cls.enrollments.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              No students enrolled.
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto -mx-1">
              {cls.enrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 py-2.5 px-1 min-h-[44px]"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-muted border border-brand/30 flex items-center justify-center flex-shrink-0">
                    <UserIcon size={14} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {e.student.firstName} {e.student.lastName}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {e.student.email}
                      {e.student.form ? ` · Form ${e.student.form}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Sessions */}
        <Card
          className="lg:col-span-2"
          title={`Upcoming sessions (${cls.sessions.length})`}
          action={
            canManage && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingSession(null);
                  setSessionOpen(true);
                }}
              >
                <Plus size={14} />
                Add
              </Button>
            )
          }
        >
          {cls.sessions.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              No upcoming sessions.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {cls.sessions.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 py-3 min-h-[44px]"
                >
                  <Calendar
                    size={16}
                    className="text-text-secondary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      {new Date(s.startsAt).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-text-secondary">
                      ends{' '}
                      {new Date(s.endsAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingSession(s);
                          setSessionOpen(true);
                        }}
                        className="p-2 text-text-secondary hover:text-text-primary touch-manipulation"
                        aria-label="Edit session"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteSession.mutate(s.id)}
                        className="p-2 text-text-secondary hover:text-danger touch-manipulation"
                        aria-label="Delete session"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ClassFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={cls}
      />
      <RosterModal
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        cls={cls}
      />
      <SessionFormModal
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        classId={cls.id}
        initial={editingSession}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative z-10 w-full sm:max-w-md sm:mx-4 bg-bg-elevated border border-border rounded-t-2xl sm:rounded-2xl p-6 pb-safe">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              Delete this class?
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              This will remove all enrollments and sessions. This cannot be
              undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMut.mutate()}
                loading={deleteMut.isPending}
              >
                Delete class
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

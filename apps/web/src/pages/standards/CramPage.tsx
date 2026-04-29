import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface CramAssignment {
  id: string;
  subject: string;
  description?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string };
}

export function CramPage() {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery<CramAssignment[]>({
    queryKey: ['standards', 'cram'],
    queryFn: async () => {
      const res = await api.get('/standards/cram');
      return res.data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/standards/cram/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards', 'cram'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Off Course Correction Assignments</h1>

      {assignments.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-center py-6">
            No CRAM assignments — you're on track! 🎉
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const isCompleted = !!a.completedAt;
            const isOverdue = !isCompleted && !!a.dueAt && new Date(a.dueAt) < new Date();

            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text-primary">{a.subject}</span>
                      {isCompleted ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="danger">OVERDUE</Badge>
                      )}
                    </div>

                    {a.description && (
                      <p className="text-text-secondary text-sm mt-1">{a.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary">
                      <span>Assigned: {new Date(a.createdAt).toLocaleDateString()}</span>
                      {a.dueAt && (
                        <span>Due: {new Date(a.dueAt).toLocaleDateString()}</span>
                      )}
                      {a.completedAt && (
                        <span>Completed: {new Date(a.completedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {!isCompleted && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={completeMutation.isPending && completeMutation.variables === a.id}
                      onClick={() => completeMutation.mutate(a.id)}
                      className="shrink-0"
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

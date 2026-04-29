import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface EthicsReport {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  subject: { id: string; firstName: string; lastName: string };
  writer: { id: string; firstName: string; lastName: string };
  reviewNotes?: string | null;
}

const schema = z.object({
  subjectId: z.string().uuid('Select a valid subject'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
});
type FormValues = z.infer<typeof schema>;

const STATUS_BADGE: Record<string, 'warning' | 'brand' | 'success'> = {
  pending: 'warning',
  reviewed: 'brand',
  resolved: 'success',
};

export function WriteEthicsPage() {
  const qc = useQueryClient();

  const { data: students, isLoading: loadingStudents } = useQuery<UserOption[]>({
    queryKey: ['users-students'],
    queryFn: async () => {
      const res = await api.get<UserOption[]>('/users?role=student');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: myReports, isLoading: loadingReports } = useQuery<EthicsReport[]>({
    queryKey: ['ethics/mine'],
    queryFn: async () => (await api.get<EthicsReport[]>('/ethics/mine')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMut = useMutation({
    mutationFn: (data: FormValues) => api.post('/ethics', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ethics/mine'] });
      reset();
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Write Ethics Report</h1>
        <p className="text-sm text-text-secondary mt-1">
          Submit an anonymous ethics report about a fellow student.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">Subject *</label>
            {loadingStudents ? (
              <div className="mt-1"><Spinner size="sm" /></div>
            ) : (
              <select
                {...register('subjectId')}
                className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
              >
                <option value="">— select student —</option>
                {(students ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.lastName}, {u.firstName}
                  </option>
                ))}
              </select>
            )}
            {errors.subjectId && (
              <p className="text-xs text-danger mt-1">{errors.subjectId.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">Report *</label>
            <textarea
              {...register('body')}
              rows={5}
              placeholder="Describe the ethics concern in detail (min 10 characters)..."
              className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary resize-none min-h-[120px]"
            />
            {errors.body && (
              <p className="text-xs text-danger mt-1">{errors.body.message}</p>
            )}
          </div>

          {createMut.isError && (
            <p className="text-sm text-danger">
              {(createMut.error as any)?.response?.data?.message ?? 'Failed to submit report.'}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={createMut.isPending}>
              Submit Report
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="text-base font-semibold text-text-primary mb-2">My Recent Reports</h2>
        {loadingReports ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (myReports ?? []).length === 0 ? (
          <p className="text-center text-text-secondary py-8">No reports submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {(myReports ?? []).slice(0, 5).map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text-primary text-sm">
                        {r.subject.lastName}, {r.subject.firstName}
                      </span>
                      <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{r.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

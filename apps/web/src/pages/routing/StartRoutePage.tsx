import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const schema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  assignedTo: z.string().uuid('Select a valid user').optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

export function StartRoutePage() {
  const [success, setSuccess] = useState(false);

  const { data: users, isLoading: loadingUsers } = useQuery<UserOption[]>({
    queryKey: ['users-all'],
    queryFn: async () => {
      const res = await api.get<UserOption[]>('/users');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMut = useMutation({
    mutationFn: (data: FormValues) =>
      api.post('/routing', {
        subject: data.subject,
        description: data.description || undefined,
        assignedTo: data.assignedTo || undefined,
      }),
    onSuccess: () => {
      setSuccess(true);
      reset();
    },
  });

  if (success) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Card className="p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-text-primary">Route Started!</p>
          <p className="text-sm text-text-secondary">
            Your route has been created and the assignee has been notified.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/routing/inbox"
              className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium"
            >
              View your routes
            </Link>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-bg-elevated border border-border text-text-secondary text-sm"
            >
              Start another
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Start Route</h1>
        <p className="text-sm text-text-secondary mt-1">
          Submit a new administrative route form.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">
              Subject *
            </label>
            <input
              {...register('subject')}
              placeholder="Brief subject of this route"
              className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
            />
            {errors.subject && (
              <p className="text-xs text-danger mt-1">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Additional details (optional)..."
              className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary resize-none"
            />
          </div>

          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">
              Assign To
            </label>
            {loadingUsers ? (
              <div className="mt-1">
                <Spinner size="sm" />
              </div>
            ) : (
              <select
                {...register('assignedTo')}
                className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
              >
                <option value="">— unassigned —</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.lastName}, {u.firstName} ({u.email})
                  </option>
                ))}
              </select>
            )}
            {errors.assignedTo && (
              <p className="text-xs text-danger mt-1">{errors.assignedTo.message}</p>
            )}
          </div>

          {createMut.isError && (
            <p className="text-sm text-danger">
              {(createMut.error as any)?.response?.data?.message ?? 'Failed to create route.'}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={createMut.isPending}>
              Start Route
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

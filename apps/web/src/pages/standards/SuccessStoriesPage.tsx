import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface SuccessStory {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  student?: { id: string; firstName: string; lastName: string };
}

const storySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(20, 'Body must be at least 20 characters'),
});
type StoryFormValues = z.infer<typeof storySchema>;

export function SuccessStoriesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const canVerify = hasPermission('success_story.verify');

  const { data: myStories = [], isLoading: loadingMine } = useQuery<SuccessStory[]>({
    queryKey: ['standards', 'success-stories', 'mine'],
    queryFn: async () => (await api.get('/standards/success-stories')).data,
  });

  const { data: pendingStories = [], isLoading: loadingPending } = useQuery<SuccessStory[]>({
    queryKey: ['standards', 'success-stories', 'pending'],
    queryFn: async () => (await api.get('/standards/success-stories/pending')).data,
    enabled: canVerify,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StoryFormValues>({ resolver: zodResolver(storySchema) });

  const createMutation = useMutation({
    mutationFn: (data: StoryFormValues) => api.post('/standards/success-stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards', 'success-stories', 'mine'] });
      reset();
      setShowForm(false);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/standards/success-stories/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards', 'success-stories', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['standards', 'success-stories', 'mine'] });
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">My Success Story Entry</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Write a Story'}
        </Button>
      </div>

      {/* Write form */}
      {showForm && (
        <Card title="New Success Story">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Title</label>
              <input
                {...register('title')}
                className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand"
                placeholder="Story title"
              />
              {errors.title && (
                <p className="text-danger text-xs mt-1">{errors.title.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Body</label>
              <textarea
                {...register('body')}
                rows={5}
                className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-base text-text-primary focus:outline-none focus:border-brand resize-none"
                placeholder="Share your success story (min. 20 characters)…"
              />
              {errors.body && (
                <p className="text-danger text-xs mt-1">{errors.body.message}</p>
              )}
            </div>
            <Button type="submit" loading={createMutation.isPending} className="w-full">
              Submit Story
            </Button>
          </form>
        </Card>
      )}

      {/* My stories */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">My Stories</h2>
        {loadingMine ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : myStories.length === 0 ? (
          <Card>
            <p className="text-text-secondary text-center py-4">
              You haven't written any success stories yet.
            </p>
          </Card>
        ) : (
          myStories.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{s.title}</span>
                    {s.verifiedAt ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Pending Review</Badge>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm mt-1 line-clamp-3">{s.body}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary">
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                    {s.verifiedAt && (
                      <span>Verified {new Date(s.verifiedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      {/* Pending review (verifiers only) */}
      {canVerify && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Pending Review</h2>
          {loadingPending ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : pendingStories.length === 0 ? (
            <Card>
              <p className="text-text-secondary text-center py-4">No stories awaiting review.</p>
            </Card>
          ) : (
            pendingStories.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {s.student && (
                      <p className="text-xs text-text-secondary mb-1">
                        {s.student.firstName} {s.student.lastName}
                      </p>
                    )}
                    <p className="font-semibold text-text-primary">{s.title}</p>
                    <p className="text-text-secondary text-sm mt-1">{s.body}</p>
                  </div>
                  <Button
                    size="sm"
                    loading={verifyMutation.isPending && verifyMutation.variables === s.id}
                    onClick={() => verifyMutation.mutate(s.id)}
                    className="shrink-0"
                  >
                    Verify
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>
      )}
    </div>
  );
}

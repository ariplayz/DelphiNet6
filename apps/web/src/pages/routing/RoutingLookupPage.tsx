import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface RoutingForm {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  starter: { id: string; firstName: string; lastName: string };
  assignee?: { id: string; firstName: string; lastName: string } | null;
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

export function RoutingLookupPage() {
  const { hasPermission } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [q, setQ] = useState('');

  const { data: users, isLoading: loadingUsers } = useQuery<UserOption[]>({
    queryKey: ['users-all'],
    queryFn: async () => {
      const res = await api.get<UserOption[]>('/users');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: hasPermission('students.view_all'),
  });

  const { data: results, isLoading: loadingResults } = useQuery<RoutingForm[]>({
    queryKey: ['routing/lookup', studentId, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (studentId) params.set('studentId', studentId);
      if (q) params.set('q', q);
      const res = await api.get<RoutingForm[]>(`/routing/lookup?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: hasPermission('students.view_all'),
  });

  if (!hasPermission('students.view_all')) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-text-primary">Access Denied</p>
          <p className="text-sm text-text-secondary">
            You don&apos;t have permission to access Route Lookup.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Route Lookup By Student
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Search routes by student or subject.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">
              Filter by Student
            </label>
            {loadingUsers ? (
              <div className="mt-1">
                <Spinner size="sm" />
              </div>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
              >
                <option value="">— all students —</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.lastName}, {u.firstName} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs uppercase text-text-secondary font-semibold">
              Search by Subject
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subject..."
              className="mt-1 w-full rounded-lg bg-bg-elevated border border-border px-3 py-2 text-base text-text-primary min-h-[44px]"
            />
          </div>
        </div>
      </Card>

      {loadingResults ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (results ?? []).length === 0 ? (
        <p className="text-center text-text-secondary py-8">No routes found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-surface">
                <th className="text-left px-4 py-3 text-xs uppercase text-text-secondary font-semibold">
                  Subject
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase text-text-secondary font-semibold">
                  Started By
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase text-text-secondary font-semibold">
                  Assigned To
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase text-text-secondary font-semibold">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase text-text-secondary font-semibold">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {(results ?? []).map((form) => (
                <tr key={form.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-primary font-medium">{form.subject}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {form.starter
                      ? `${form.starter.lastName}, ${form.starter.firstName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {form.assignee
                      ? `${form.assignee.lastName}, ${form.assignee.firstName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[form.status] ?? 'default'}>
                      {STATUS_LABEL[form.status] ?? form.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

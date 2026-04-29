import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';

interface ClassItem {
  id: string;
  name: string;
  kind: string;
  location?: string | null;
  supervisor: { id: string; firstName: string; lastName: string } | null;
  _count: { enrollments: number };
}

export function StudentServiceRostersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const studentService = (data ?? []).filter((c) => c.kind === 'STUDENT_SERVICE');
  const filtered = studentService.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-text-primary flex-1">
          Student Service Rosters
        </h1>
        <Badge variant="brand">{studentService.length} classes</Badge>
      </div>

      <Input
        placeholder="Search by class name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Card>
          <p className="text-danger text-sm text-center py-4">
            Failed to load classes. Please try again.
          </p>
        </Card>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <Card>
          <p className="text-text-secondary text-sm text-center py-8">
            {search ? 'No classes match your search.' : 'No student service classes found.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((cls) => (
            <Link key={cls.id} to={`/classes/${cls.id}`}>
              <Card className="hover:border-brand transition-colors cursor-pointer min-h-[44px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{cls.name}</p>
                    <p className="text-sm text-text-secondary">
                      {cls.supervisor
                        ? `${cls.supervisor.firstName} ${cls.supervisor.lastName}`
                        : 'No supervisor assigned'}
                    </p>
                  </div>
                  <Badge variant="default">{cls._count.enrollments} enrolled</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

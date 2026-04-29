import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import {
  CLASS_KIND_LABELS,
  ClassKind,
  ClassSummary,
  classesApi,
} from '../../lib/api/classes';

const KIND_ORDER: ClassKind[] = [
  'ACADEMIC',
  'SEMINAR',
  'AFTERNOON',
  'NIGHT',
  'STUDENT_SERVICE',
  'CLUB',
  'AFTER_CLASS',
];

export function ClassesOfferedPage() {
  const [search, setSearch] = useState('');

  const { data: classes = [], isLoading } = useQuery<ClassSummary[]>({
    queryKey: ['classes', 'all'],
    queryFn: () => classesApi.list(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, search]);

  const grouped = useMemo(() => {
    const map = new Map<ClassKind, ClassSummary[]>();
    for (const kind of KIND_ORDER) map.set(kind, []);
    for (const c of filtered) {
      const list = map.get(c.kind);
      if (list) list.push(c);
      else map.set(c.kind, [c]);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-1">
          Classes Offered
        </h1>
        <p className="text-sm text-text-secondary">
          All classes currently offered at this school.
        </p>
      </div>

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
        />
        <Input
          placeholder="Filter by class name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8 text-sm">
            {search ? 'No classes match your search.' : 'No classes have been created yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([kind, list]) => (
            <section key={kind}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-text-primary">
                  {CLASS_KIND_LABELS[kind]}
                </h2>
                <Badge variant="default">{list.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((c) => (
                  <ClassCard key={c.id} cls={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassSummary }) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary text-sm leading-tight flex-1 min-w-0">
          {cls.name}
        </h3>
        <Badge variant="brand">{CLASS_KIND_LABELS[cls.kind]}</Badge>
      </div>

      {cls.supervisor && (
        <p className="text-xs text-text-secondary truncate">
          {cls.supervisor.firstName} {cls.supervisor.lastName}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-text-secondary mt-auto pt-1">
        <span className="inline-flex items-center gap-1">
          <Users size={12} />
          {cls._count?.enrollments ?? 0} enrolled
        </span>
        {cls.location && (
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin size={12} />
            <span className="truncate">{cls.location}</span>
          </span>
        )}
      </div>
    </div>
  );
}

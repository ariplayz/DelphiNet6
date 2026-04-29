import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Search, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import {
  CLASS_KIND_LABELS,
  ClassKind,
  ClassSummary,
  classesApi,
} from '../../lib/api/classes';

const KIND_ORDER: ClassKind[] = [
  'ACADEMIC',
  'AFTERNOON',
  'NIGHT',
  'SEMINAR',
  'STUDENT_SERVICE',
  'CLUB',
  'AFTER_CLASS',
];

export function ClassSchedulesPage() {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<ClassKind | 'ALL'>('ALL');

  const { data: classes = [], isLoading } = useQuery<ClassSummary[]>({
    queryKey: ['classes', 'all'],
    queryFn: () => classesApi.list(),
  });

  const filtered = classes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesKind = kindFilter === 'ALL' || c.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const grouped = KIND_ORDER.reduce<Record<ClassKind, ClassSummary[]>>(
    (acc, kind) => {
      acc[kind] = filtered.filter((c) => c.kind === kind);
      return acc;
    },
    {} as Record<ClassKind, ClassSummary[]>,
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
            All Class Schedules
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} total
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => window.print()}
          className="print:hidden w-fit"
        >
          <Printer size={16} />
          Print
        </Button>
      </div>

      {/* Filters — hidden during print */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 print:hidden">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes…"
            className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand min-h-[44px]"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as ClassKind | 'ALL')}
          className="px-3 py-2 text-base sm:text-sm bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand min-h-[44px] sm:w-48"
        >
          <option value="ALL">All kinds</option>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {CLASS_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded-xl p-8 text-center text-text-secondary text-sm">
          No classes match your search.
        </div>
      ) : (
        <div className="space-y-8 print:space-y-6">
          {KIND_ORDER.map((kind) => {
            const rows = grouped[kind];
            if (rows.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1 print:text-black">
                  {CLASS_KIND_LABELS[kind]}
                </h2>
                {/* Desktop table */}
                <div className="hidden sm:block bg-bg-surface rounded-xl border border-border overflow-hidden print:border print:rounded-none">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-elevated print:bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider print:text-black">
                          Class Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider print:text-black">
                          Kind
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider print:text-black">
                          Supervisor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider print:text-black">
                          Enrolled
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-border hover:bg-bg-hover transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-text-primary">
                            {c.name}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="brand">
                              {CLASS_KIND_LABELS[c.kind]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {c.supervisor
                              ? `${c.supervisor.firstName} ${c.supervisor.lastName}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-text-secondary">
                              <Users size={13} />
                              {c._count?.enrollments ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card stack */}
                <div className="sm:hidden bg-bg-surface rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {rows.map((c) => (
                    <div key={c.id} className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-text-primary text-sm leading-tight">
                          {c.name}
                        </span>
                        <Badge variant="brand">{CLASS_KIND_LABELS[c.kind]}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary">
                        <span>
                          {c.supervisor
                            ? `${c.supervisor.firstName} ${c.supervisor.lastName}`
                            : 'No supervisor'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} />
                          {c._count?.enrollments ?? 0} enrolled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

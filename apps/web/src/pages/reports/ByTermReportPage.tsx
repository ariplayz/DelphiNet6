import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Printer, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form: number | null;
  photoUrl: string | null;
  roles: { name: string }[];
}

const FORMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function FormSection({ form, students }: { form: number | null; students: User[] }) {
  const [open, setOpen] = useState(true);
  const label = form !== null ? `Form ${form}` : 'Unknown';

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-surface hover:bg-bg-surface/80 transition-colors"
      >
        <span className="font-semibold text-text-primary">
          {label}
          <span className="ml-2 text-sm text-text-secondary font-normal">
            ({students.length} student{students.length !== 1 ? 's' : ''})
          </span>
        </span>
        {open ? (
          <ChevronDown size={16} className="text-text-secondary" />
        ) : (
          <ChevronRight size={16} className="text-text-secondary" />
        )}
      </button>
      {open && (
        <ul className="divide-y divide-border bg-bg-base">
          {students.map((s) => (
            <li key={s.id} className="px-4 py-2 text-sm text-text-primary">
              {s.firstName} {s.lastName}
              <span className="ml-2 text-text-secondary text-xs">{s.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ByTermReportPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await api.get<User[]>('/users');
      return res.data;
    },
    enabled: hasPermission('students.view_all'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  }, [data, search]);

  const byForm = useMemo(() => {
    const map = new Map<number | null, User[]>();
    for (const f of FORMS) map.set(f, []);
    map.set(null, []);
    for (const u of filtered) {
      const key = FORMS.includes(u.form as typeof FORMS[number]) ? u.form : null;
      map.get(key)!.push(u);
    }
    return map;
  }, [filtered]);

  if (!hasPermission('students.view_all')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-text-secondary">Permission required: students.view_all</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Students by Form
        </h1>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Printer size={14} />
          Use Ctrl+P to print
        </span>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-base rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {FORMS.map((f) => {
            const students = byForm.get(f) ?? [];
            return <FormSection key={f} form={f} students={students} />;
          })}
          {(byForm.get(null) ?? []).length > 0 && (
            <FormSection form={null} students={byForm.get(null)!} />
          )}
        </div>
      )}
    </div>
  );
}

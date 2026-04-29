import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
}

const FORMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function initials(u: User) {
  return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
}

function StudentCard({ student }: { student: User }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-bg-surface rounded-xl border border-border">
      {student.photoUrl ? (
        <img
          src={student.photoUrl}
          alt={`${student.firstName} ${student.lastName}`}
          className="w-16 h-16 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
          <span className="text-brand text-lg font-bold">{initials(student)}</span>
        </div>
      )}
      <div className="text-center min-w-0">
        <p className="text-sm font-medium text-text-primary leading-tight truncate max-w-[7rem]">
          {student.firstName} {student.lastName}
        </p>
        {student.form !== null && (
          <p className="text-xs text-text-secondary">Form {student.form}</p>
        )}
      </div>
    </div>
  );
}

export function PhotoDisplayPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<number | 'all'>('all');

  const { data = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await api.get<User[]>('/users');
      return res.data;
    },
    enabled: hasPermission('students.view_all'),
  });

  const filtered = useMemo(() => {
    let result = data;
    if (formFilter !== 'all') {
      result = result.filter((u) => u.form === formFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data, search, formFilter]);

  if (!hasPermission('students.view_all')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-text-secondary">Permission required: students.view_all</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-5">
        Photo Display
      </h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-base rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={formFilter === 'all' ? 'all' : String(formFilter)}
          onChange={(e) =>
            setFormFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-3 py-2 text-base rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All Forms</option>
          {FORMS.map((f) => (
            <option key={f} value={f}>
              Form {f}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-text-secondary py-16">No students found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 print:grid-cols-6">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

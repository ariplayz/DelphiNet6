import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';

interface UserRoleEntry {
  role: { name: string };
}

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  form: number | null;
  isSuperAdmin: boolean;
  userRoles: UserRoleEntry[];
}

type StudentRow = Record<string, unknown> & Student;

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand/20 text-brand text-xs font-bold select-none flex-shrink-0">
      {initials(first, last)}
    </span>
  );
}

export function StudentLookupPage() {
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedForm, setDebouncedForm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedForm(formFilter), 300);
    return () => clearTimeout(t);
  }, [formFilter]);

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students', 'lookup', debouncedSearch, debouncedForm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (debouncedForm) params.set('form', debouncedForm);
      return (await api.get<Student[]>(`/users?${params.toString()}`)).data;
    },
  });

  const columns: { key: string; header: string; render?: (row: StudentRow) => React.ReactNode }[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar first={u.firstName} last={u.lastName} />
          <span className="font-medium text-text-primary">
            {u.firstName} {u.lastName}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (u) => <span className="text-text-secondary">{u.email}</span>,
    },
    {
      key: 'form',
      header: 'Form',
      render: (u) => (
        <span className="text-text-secondary">{u.form != null ? String(u.form) : '—'}</span>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {u.isSuperAdmin && <Badge variant="danger">super_admin</Badge>}
          {u.userRoles.map((ur, i) => (
            <Badge key={i} variant="brand">{ur.role.name}</Badge>
          ))}
        </div>
      ),
    },
  ];

  const isEmpty = !isLoading && students.length === 0;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              label="Search by name or email"
              placeholder="e.g. John Smith"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-32">
            <Input
              label="Form"
              type="number"
              inputMode="numeric"
              min={1}
              max={8}
              placeholder="1–8"
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card title="Students" padding={false}>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner size="lg" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center p-10 gap-2 text-text-secondary">
            <span className="text-4xl">🔍</span>
            <p className="text-sm">No students found.</p>
            {(search || formFilter) && (
              <p className="text-xs text-text-secondary/60">Try adjusting your search or form filter.</p>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            data={students as StudentRow[]}
            keyField="id"
          />
        )}
      </Card>
    </div>
  );
}

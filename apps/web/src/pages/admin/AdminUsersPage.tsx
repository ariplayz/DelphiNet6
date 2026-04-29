import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { X } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  form: string;
  roles: Role[];
}

interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  form?: number;
}

type UserRow = Record<string, unknown> & { id: string; email: string; firstName: string; lastName: string; form: string; roles: Role[] };

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<Role[]>('/roles')).data,
  });

  const { data: userRoles = [] } = useQuery<Role[]>({
    queryKey: ['admin', 'users', selectedUser?.id, 'roles'],
    queryFn: async () => (await api.get<Role[]>(`/users/${selectedUser!.id}/roles`)).data,
    enabled: !!selectedUser,
  });

  const [createError, setCreateError] = useState<string | null>(null);
  const [formInput, setFormInput] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    form: string;
  }>({ email: '', password: '', firstName: '', lastName: '', form: '' });

  const createUser = useMutation({
    mutationFn: (dto: CreateUserDto) => api.post('/users', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setCreateOpen(false);
      setCreateError(null);
      setFormInput({ email: '', password: '', firstName: '', lastName: '', form: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setCreateError(Array.isArray(msg) ? msg.join('; ') : (msg ?? err?.message ?? 'Create failed'));
    },
  });

  const submitCreate = () => {
    setCreateError(null);
    const trimmedForm = formInput.form.trim();
    let parsedForm: number | undefined;
    if (trimmedForm !== '') {
      const n = Number(trimmedForm);
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        setCreateError('Form must be an integer between 1 and 8 (or leave blank).');
        return;
      }
      parsedForm = n;
    }
    if (formInput.password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    const dto: CreateUserDto = {
      email: formInput.email.trim(),
      password: formInput.password,
      firstName: formInput.firstName.trim(),
      lastName: formInput.lastName.trim(),
      ...(parsedForm !== undefined ? { form: parsedForm } : {}),
    };
    createUser.mutate(dto);
  };

  const assignRole = useMutation({
    mutationFn: (roleId: string) => api.post(`/users/${selectedUser!.id}/roles`, { roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users', selectedUser?.id, 'roles'] }),
  });

  const removeRole = useMutation({
    mutationFn: (roleId: string) => api.delete(`/users/${selectedUser!.id}/roles/${roleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users', selectedUser?.id, 'roles'] }),
  });

  const columns: { key: string; header: string; render?: (value: UserRow) => React.ReactNode }[] = [
    { key: 'name', header: 'Name', render: (u) => `${String(u.firstName)} ${String(u.lastName)}` },
    { key: 'email', header: 'Email', render: (u) => String(u.email) },
    { key: 'form', header: 'Form', render: (u) => String(u.form) || '—' },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {(u.roles as Role[])?.map((r) => <Badge key={r.id} variant="brand">{r.name}</Badge>)}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
      <div className="flex-1 min-w-0">
        <Card
          title="Users"
          action={<Button size="sm" onClick={() => setCreateOpen(true)}>New User</Button>}
          padding={false}
        >
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <Table
              columns={columns}
              data={users as UserRow[]}
              keyField="id"
              onRowClick={(row) => setSelectedUser(row as User)}
            />
          )}
        </Card>
      </div>

      {selectedUser && (
        <div className="w-full lg:w-80 bg-bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">{selectedUser.firstName} {selectedUser.lastName}</h3>
            <button onClick={() => setSelectedUser(null)} className="text-text-secondary hover:text-text-primary">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-text-secondary">{selectedUser.email}</p>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Roles</p>
            <div className="flex flex-col gap-2">
              {allRoles.map((role) => {
                const hasRole = userRoles.some((r) => r.id === role.id);
                return (
                  <label key={role.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasRole}
                      onChange={() => hasRole ? removeRole.mutate(role.id) : assignRole.mutate(role.id)}
                      className="rounded border-border bg-bg-elevated text-brand focus:ring-brand/20"
                    />
                    {role.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        title="New User"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setCreateError(null); }}>Cancel</Button>
            <Button
              loading={createUser.isPending}
              onClick={submitCreate}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {createError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {createError}
            </div>
          )}
          <Input label="First Name" value={formInput.firstName} onChange={(e) => setFormInput({ ...formInput, firstName: e.target.value })} />
          <Input label="Last Name" value={formInput.lastName} onChange={(e) => setFormInput({ ...formInput, lastName: e.target.value })} />
          <Input label="Email" type="email" value={formInput.email} onChange={(e) => setFormInput({ ...formInput, email: e.target.value })} />
          <Input label="Password" type="password" value={formInput.password} onChange={(e) => setFormInput({ ...formInput, password: e.target.value })} />
          <Input
            label="Form (optional, 1–8)"
            type="number"
            inputMode="numeric"
            min={1}
            max={8}
            value={formInput.form}
            onChange={(e) => setFormInput({ ...formInput, form: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}

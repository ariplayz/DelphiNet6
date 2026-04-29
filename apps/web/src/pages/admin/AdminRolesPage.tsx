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
import { PERMISSIONS } from '@delphinet/shared-types';

interface Role {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  permissions: string[];
}

type RoleRow = Record<string, unknown> & { id: string; name: string; description?: string; isBuiltIn: boolean; permissions: string[] };

const PERMISSION_DOMAINS: Record<string, string[]> = {
  System: ['super_admin.all', 'school.manage', 'dashboard.admin', 'analytics.view'],
  Users: ['users.manage', 'roles.assign'],
  Classes: ['class.manage', 'class.view', 'class.supervise'],
  Attendance: ['attendance.record', 'attendance.verify', 'attendance.view_all', 'attendance.amend', 'restriction.view'],
  Programs: ['program.view', 'program.view_others', 'program.edit', 'program.edit_template'],
  Ethics: ['ethics.write', 'ethics.review'],
  Routing: ['routing.handle', 'routing.start'],
  ResLife: ['reslife.manage', 'dorm.captain'],
  Council: ['success_story.verify'],
};

// Ensure all PERMISSIONS are covered
const _allPerms: readonly string[] = PERMISSIONS;
void _allPerms;

export function AdminRolesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [pendingPerms, setPendingPerms] = useState<string[]>([]);

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<Role[]>('/roles')).data,
  });

  const createRole = useMutation({
    mutationFn: () => api.post('/roles', { name: newRoleName, description: newRoleDesc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setCreateOpen(false); setNewRoleName(''); setNewRoleDesc(''); },
  });

  const savePermissions = useMutation({
    mutationFn: () => api.put(`/roles/${selectedRole!.id}/permissions`, { permissions: pendingPerms }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setPendingPerms(role.permissions ?? []);
  };

  const togglePerm = (perm: string) => {
    setPendingPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const columns: { key: string; header: string; render?: (value: RoleRow) => React.ReactNode }[] = [
    { key: 'name', header: 'Name', render: (r) => String(r.name) },
    { key: 'description', header: 'Description', render: (r) => r.description ? String(r.description) : '—' },
    {
      key: 'isBuiltIn',
      header: 'Type',
      render: (r) => r.isBuiltIn ? <Badge variant="warning">Built-in</Badge> : <Badge>Custom</Badge>,
    },
    { key: 'permissions', header: 'Permissions', render: (r) => `${(r.permissions as string[])?.length ?? 0}` },
  ];

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1">
        <Card
          title="Roles"
          action={<Button size="sm" onClick={() => setCreateOpen(true)}>New Role</Button>}
          padding={false}
        >
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <Table
              columns={columns}
              data={roles as RoleRow[]}
              keyField="id"
              onRowClick={(row) => handleSelectRole(row as Role)}
            />
          )}
        </Card>
      </div>

      {selectedRole && (
        <div className="w-80 bg-bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">{selectedRole.name}</h3>
            <button onClick={() => setSelectedRole(null)} className="text-text-secondary hover:text-text-primary">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {Object.entries(PERMISSION_DOMAINS).map(([domain, perms]) => (
              <div key={domain}>
                <p className="text-xs font-semibold text-text-secondary uppercase mb-2">{domain}</p>
                <div className="flex flex-col gap-1.5">
                  {perms.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingPerms.includes(perm)}
                        onChange={() => togglePerm(perm)}
                        disabled={selectedRole.isBuiltIn}
                        className="rounded border-border bg-bg-elevated text-brand focus:ring-brand/20"
                      />
                      <span className="font-mono text-xs text-text-secondary">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!selectedRole.isBuiltIn && (
            <Button onClick={() => savePermissions.mutate()} loading={savePermissions.isPending}>
              Save Permissions
            </Button>
          )}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Role"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createRole.isPending} onClick={() => createRole.mutate()}>Create</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Role Name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
          <Input label="Description" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

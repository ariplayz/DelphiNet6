import { useState, useEffect } from 'react';
import type { User } from './App';

const AVAILABLE_ROLES = ['student', 'staff', 'admin', 'courseroom-supervisor', 'absence-checker'];

function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['student']);
    const [editingUser, setEditingUser] = useState<string | null>(null);

    const fetchUsers = () => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingUser ? `/api/users/${editingUser}` : '/api/users';
        const method = editingUser ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password: password || undefined, 
                roles: selectedRoles 
            })
        });

        if (res.ok) {
            resetForm();
            fetchUsers();
        } else {
            const err = await res.json();
            alert(err.error || 'Operation failed');
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setSelectedRoles(['student']);
        setEditingUser(null);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user.username);
        setUsername(user.username);
        setPassword(''); // Don't show password
        setSelectedRoles(user.roles);
    };

    const handleDeleteUser = async (uname: string) => {
        if (!confirm(`Are you sure you want to delete ${uname}?`)) return;
        const res = await fetch(`/api/users/${uname}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '800px' }}>
            <h2>{editingUser ? `Edit User: ${editingUser}` : 'Manage Users'}</h2>
            <form onSubmit={handleSubmit} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px', 
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'var(--surface)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
            }}>
                <input 
                    placeholder="Username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                    disabled={!!editingUser}
                />
                <input 
                    placeholder={editingUser ? "New Password (leave blank to keep)" : "Password"} 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required={!editingUser} 
                />
                
                <div style={{ margin: '10px 0' }}>
                    <strong>Roles:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                        {AVAILABLE_ROLES.map(r => (
                            <label key={r} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px', 
                                backgroundColor: selectedRoles.includes(r) ? 'var(--primary)' : 'var(--surface-light)',
                                padding: '5px 10px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                                border: '1px solid var(--border)',
                                transition: 'all 0.2s'
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedRoles.includes(r)} 
                                    onChange={() => toggleRole(r)}
                                    style={{ display: 'none' }}
                                />
                                {r}
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 1 }}>{editingUser ? 'Update User' : 'Add User'}</button>
                    {editingUser && <button type="button" onClick={resetForm} style={{ backgroundColor: 'transparent' }}>Cancel</button>}
                </div>
            </form>

            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--surface-light)' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Roles</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.username} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px' }}>{u.username}</td>
                                <td style={{ padding: '10px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {u.roles.map(r => (
                                            <span key={r} style={{ fontSize: '0.75em', backgroundColor: 'var(--surface-light)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                        <button onClick={() => handleEdit(u)} style={{ fontSize: '0.8em', padding: '5px 10px' }}>Edit</button>
                                        {u.username !== 'admin' && (
                                            <button onClick={() => handleDeleteUser(u.username)} style={{ color: '#ff5252', fontSize: '0.8em', padding: '5px 10px' }}>Delete</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminUsers;

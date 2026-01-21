import { useState, useEffect } from 'react';
import type { User } from './App';

function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'student' | 'staff' | 'admin' | 'courseroom-supervisor'>('student');
    const [isAbsenceChecker, setIsAbsenceChecker] = useState(false);

    const fetchUsers = () => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, isAbsenceChecker })
        });
        if (res.ok) {
            setUsername('');
            setPassword('');
            setRole('student');
            setIsAbsenceChecker(false);
            fetchUsers();
        } else {
            alert('Failed to add user');
        }
    };

    const handleDeleteUser = async (uname: string) => {
        if (!confirm(`Are you sure you want to delete ${uname}?`)) return;
        const res = await fetch(`/api/users/${uname}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
    };

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '800px' }}>
            <h2>Manage Users</h2>
            <form onSubmit={handleAddUser} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px', 
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'var(--surface)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
            }}>
                <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <select value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="courseroom-supervisor">Courseroom Supervisor</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={isAbsenceChecker} onChange={e => setIsAbsenceChecker(e.target.checked)} />
                    Is Absence Checker
                </label>
                <button type="submit">Add User</button>
            </form>

            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--surface-light)' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Checker</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.username} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px' }}>{u.username}</td>
                                <td style={{ padding: '10px' }}>{u.role}</td>
                                <td style={{ padding: '10px' }}>{u.isAbsenceChecker ? 'Yes' : 'No'}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {u.username !== 'admin' && (
                                        <button onClick={() => handleDeleteUser(u.username)} style={{ color: '#ff5252' }}>Delete</button>
                                    )}
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

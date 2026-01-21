import type { User } from './App';
import { useState, useEffect } from 'react';

interface SidebarProps {
    setScreen: (screen: string) => void;
    user: User;
    onLogout: () => void;
}

function Sidebar({ setScreen, user, onLogout }: SidebarProps) {
    const [isSupervisor, setIsSupervisor] = useState(false);

    useEffect(() => {
        fetch('/api/classes')
            .then(res => res.json())
            .then(data => {
                const supervising = data.some((c: any) => c.supervisor === user.username);
                setIsSupervisor(supervising);
            })
            .catch(() => {});
    }, [user.username]);

    return (
        <aside className="sidebar">
            <div className="user-info">
                <span>{user.username}</span>
                <small>{user.role}</small>
            </div>
            <button onClick={() => setScreen('dashboard')}>Dashboard</button>
            <button onClick={() => setScreen('points')}>Points</button>
            
            {user.role === 'student' && (
                <button onClick={() => setScreen('programs')}>My Programs</button>
            )}

            {(user.role === 'admin' || user.role === 'courseroom-supervisor') && (
                <button onClick={() => setScreen('admin-programs')}>Manage Programs</button>
            )}
            
            {(isSupervisor || user.role === 'courseroom-supervisor') && (
                <button onClick={() => setScreen('roll-call')}>Roll Call</button>
            )}

            {(user.role === 'admin' || user.isAbsenceChecker) && (
                <button onClick={() => setScreen('absences')}>Absences</button>
            )}

            {user.role === 'admin' && (
                <>
                    <button onClick={() => setScreen('admin-users')}>Manage Users</button>
                    <button onClick={() => setScreen('admin-classes')}>Manage Classes</button>
                </>
            )}

            <button onClick={onLogout} style={{ marginTop: 'auto', color: '#ff5252' }}>Logout</button>
        </aside>
    );
}

export default Sidebar;
import { useState, useEffect } from 'react';
import type { User } from './App';
import EnterPoints from './EnterPoints';
import ViewPoints from './ViewPoints';

interface PointSlip {
    name: string;
    date: Date;
    points: number;
    hours: number;
}

const API_URL = '/api';

function Points({ user }: { user: User }) {
    const [subScreen, setSubScreen] = useState<'view' | 'enter'>('view');
    // Staff can't enter, so they should definitely default to view. 
    // Actually, user said: "but the view tab defaults to theirs and the weekly stats is just the active person"
    // This probably refers to the student.
    
    const [pointsSlips, setPointsSlips] = useState<PointSlip[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSlips = async () => {
        try {
            const response = await fetch(`${API_URL}/slips`);
            if (response.ok) {
                const data = await response.json();
                const formattedData = data.map((slip: any) => ({
                    ...slip,
                    date: new Date(slip.date)
                }));
                setPointsSlips(formattedData);
            }
        } catch (err) {
            console.error('Fetch slips error:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (response.ok) {
                const data = await response.json();
                setUsersList(data);
            } else {
                // Fallback for non-admins who can't fetch all users
                setUsersList([{ username: user.username, roles: user.roles }]);
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchSlips(), fetchUsers()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const addSlip = async (newSlip: PointSlip) => {
        try {
            const response = await fetch(`${API_URL}/slips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newSlip,
                    date: newSlip.date.toISOString().split('T')[0]
                }),
            });
            if (response.ok) {
                await fetchSlips();
                setSubScreen('view');
            } else {
                const err = await response.json();
                alert(err.error || 'Failed to add slip');
            }
        } catch (err) {
            console.error('Add slip error:', err);
        }
    };

    const navButtonStyle = (isActive: boolean) => ({
        padding: '10px 20px',
        backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-light)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold' as const,
        marginRight: '10px'
    });

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                <button 
                    style={navButtonStyle(subScreen === 'view')} 
                    onClick={() => setSubScreen('view')}
                >
                    View Points
                </button>
                {!user.roles.includes('staff') && (
                    <button 
                        style={navButtonStyle(subScreen === 'enter')} 
                        onClick={() => setSubScreen('enter')}
                    >
                        Enter Points
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
            ) : subScreen === 'view' ? (
                <ViewPoints pointsSlips={pointsSlips} currentUser={user} />
            ) : (
                <EnterPoints addSlip={addSlip} userList={usersList} currentUser={user} />
            )}
        </div>
    );
}

export default Points;

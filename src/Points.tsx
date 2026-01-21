import { useState, useEffect } from 'react';
import EnterPoints from './EnterPoints';
import ViewPoints from './ViewPoints';

interface PointSlip {
    name: string;
    date: Date;
    points: number;
    hours: number;
}

interface Staff {
    name: string;
}

const API_URL = '/api';

function Points() {
    const [subScreen, setSubScreen] = useState<'view' | 'enter'>('view');
    const [pointsSlips, setPointsSlips] = useState<PointSlip[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
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

    const fetchStaff = async () => {
        try {
            const response = await fetch(`${API_URL}/staff`);
            if (response.ok) {
                const data = await response.json();
                setStaffList(data);
            }
        } catch (err) {
            console.error('Fetch staff error:', err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchSlips(), fetchStaff()]);
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
                <button 
                    style={navButtonStyle(subScreen === 'enter')} 
                    onClick={() => setSubScreen('enter')}
                >
                    Enter Points
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
            ) : subScreen === 'view' ? (
                <ViewPoints pointsSlips={pointsSlips} />
            ) : (
                <EnterPoints addSlip={addSlip} staffList={staffList} />
            )}
        </div>
    );
}

export default Points;

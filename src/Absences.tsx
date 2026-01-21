import { useState, useEffect } from 'react';

interface AbsenceRecord {
    id: string;
    username: string;
    date: string;
    time: string;
    status: string;
    reason: string;
    excused: boolean;
    rollcallId: string;
}

function Absences() {
    const [rollcalls, setRollcalls] = useState<any[]>([]);
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const [rcRes, abRes] = await Promise.all([
            fetch('/api/rollcalls'),
            fetch('/api/absences')
        ]);
        if (rcRes.ok) setRollcalls(await rcRes.json());
        if (abRes.ok) setAbsences(await abRes.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveAbsence = async (ab: Partial<AbsenceRecord>) => {
        const method = ab.id ? 'PUT' : 'POST';
        const url = ab.id ? `/api/absences/${ab.id}` : '/api/absences';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ab)
        });
        if (res.ok) fetchData();
    };

    const getWeekRange = () => {
        const now = new Date();
        const first = now.getDate() - now.getDay();
        const last = first + 6;
        const start = new Date(now.setDate(first)).toISOString().split('T')[0];
        const end = new Date(now.setDate(last)).toISOString().split('T')[0];
        return { start, end };
    };

    const { start, end } = getWeekRange();

    // Derived list of "absence" items that need attention
    const itemsToProcess: any[] = [];
    rollcalls.forEach(rc => {
        if (rc.date >= start && rc.date <= end) {
            Object.keys(rc.status).forEach(username => {
                const status = rc.status[username];
                if (status === 'late' || status === 'absent' || status === 'arrived') {
                    const existingAbsence = absences.find(a => a.rollcallId === rc.id && a.username === username);
                    itemsToProcess.push({
                        username,
                        date: rc.date,
                        time: rc.time,
                        status,
                        rollcallId: rc.id,
                        absence: existingAbsence
                    });
                }
            });
        }
    });

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '900px' }}>
            <h2>Weekly Absence/Lateness Tracker</h2>
            <p>Week: {start} to {end}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {itemsToProcess.map((item, idx) => (
                    <div key={idx} style={{ 
                        backgroundColor: 'var(--surface)', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 2fr 1fr',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <div>
                            <strong>{item.username}</strong><br/>
                            <small>{item.date} {item.time}</small>
                        </div>
                        <div style={{ color: item.status === 'absent' ? '#ff5252' : 'var(--accent)' }}>
                            Status: {item.status.toUpperCase()}
                        </div>
                        <div>
                            <input 
                                placeholder="Reason for lateness/absence..."
                                defaultValue={item.absence?.reason || ''}
                                onBlur={(e) => handleSaveAbsence({
                                    ...item.absence,
                                    username: item.username,
                                    date: item.date,
                                    time: item.time,
                                    status: item.status,
                                    rollcallId: item.rollcallId,
                                    reason: e.target.value
                                })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input 
                                type="checkbox"
                                checked={item.absence?.excused || false}
                                onChange={(e) => handleSaveAbsence({
                                    ...item.absence,
                                    username: item.username,
                                    date: item.date,
                                    time: item.time,
                                    status: item.status,
                                    rollcallId: item.rollcallId,
                                    excused: e.target.checked
                                })}
                            />
                            Excused
                        </div>
                    </div>
                ))}
                {itemsToProcess.length === 0 && <p>No absences or lateness recorded for this week.</p>}
            </div>
        </div>
    );
}

export default Absences;

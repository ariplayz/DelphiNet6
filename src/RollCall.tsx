import { useState, useEffect } from 'react';
import type { User } from './App';

interface AttendanceState {
    [username: string]: 'here' | 'late' | 'arrived' | 'absent' | 'excused';
}

function RollCall({ user }: { user: User }) {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [attendance, setAttendance] = useState<AttendanceState>({});
    const [startTime, setStartTime] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/classes')
            .then(res => res.json())
            .then(data => {
                const supervising = data.filter((c: any) => c.supervisor === user.username);
                setClasses(supervising);
                if (supervising.length > 0) setSelectedClass(supervising[0]);
            });
    }, [user.username]);

    const startRollCall = (time: string) => {
        setSelectedTime(time);
        setStartTime(Date.now());
        const initial: AttendanceState = {};
        selectedClass.roster.forEach((u: string) => {
            initial[u] = 'late'; // Defaults to late
        });
        setAttendance(initial);
    };

    useEffect(() => {
        if (!startTime || !selectedTime) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - startTime > 15 * 60 * 1000) {
                setAttendance(prev => {
                    const next = { ...prev };
                    let changed = false;
                    Object.keys(next).forEach(u => {
                        if (next[u] === 'late') {
                            next[u] = 'absent';
                            changed = true;
                        }
                    });
                    return changed ? next : prev;
                });
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [startTime, selectedTime]);

    const updateStatus = (username: string, status: 'here' | 'late' | 'arrived' | 'absent' | 'excused') => {
        setAttendance(prev => ({ ...prev, [username]: status }));
    };

    const submitRollCall = async () => {
        const res = await fetch('/api/rollcalls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                classId: selectedClass.id,
                time: selectedTime,
                date: new Date().toISOString().split('T')[0],
                status: attendance
            })
        });
        if (res.ok) {
            alert('Roll call submitted');
            setSelectedTime('');
            setAttendance({});
        }
    };

    if (classes.length === 0) return <div style={{ padding: '20px' }}>You are not supervising any classes.</div>;

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '600px' }}>
            <h2>Roll Call</h2>
            <div style={{ marginBottom: '20px' }}>
                <label>Select Class: </label>
                <select value={selectedClass?.id} onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value))}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {selectedClass && !selectedTime && (
                <div>
                    <h3>Select Time Slot</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {selectedClass.schedule.find((s: any) => s.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))?.times.map((t: string) => (
                            <button key={t} onClick={() => startRollCall(t)}>{t}</button>
                        )) || <p>No sessions scheduled for today.</p>}
                    </div>
                </div>
            )}

            {selectedTime && (
                <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>{selectedClass.name} - {selectedTime}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedClass.roster.map((u: string) => {
                            const status = attendance[u];
                            return (
                                <div key={u} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: 'var(--surface-light)', borderRadius: '4px' }}>
                                    <span style={{ flex: 1 }}>{u}</span>
                                    
                                    <button 
                                        onClick={() => updateStatus(u, 'here')}
                                        style={{ backgroundColor: status === 'here' ? 'var(--primary)' : 'transparent' }}
                                    >Here</button>
                                    
                                    <button 
                                        onClick={() => updateStatus(u, 'late')}
                                        style={{ backgroundColor: status !== 'here' ? 'var(--accent)' : 'transparent' }}
                                    >Late</button>

                                    {status !== 'here' && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => updateStatus(u, 'arrived')} style={{ fontSize: '0.8em', backgroundColor: status === 'arrived' ? 'var(--primary)' : 'transparent' }}>Arrived</button>
                                            <button onClick={() => updateStatus(u, 'absent')} style={{ fontSize: '0.8em', backgroundColor: status === 'absent' ? '#ff5252' : 'transparent' }}>Absent</button>
                                            <button onClick={() => updateStatus(u, 'excused')} style={{ fontSize: '0.8em', backgroundColor: status === 'excused' ? 'var(--primary)' : 'transparent' }}>Excused</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={submitRollCall} style={{ marginTop: '20px', width: '100%' }}>Submit Attendance</button>
                </div>
            )}
        </div>
    );
}

export default RollCall;

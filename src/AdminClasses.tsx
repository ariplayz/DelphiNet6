import { useState, useEffect } from 'react';
import type { User } from './App';

interface ClassSchedule {
    day: string; // 'Monday', 'Tuesday', etc.
    times: string[]; // ['09:00', '14:00']
}

interface ClassData {
    id: string;
    name: string;
    studentLimit: number;
    supervisor: string;
    schedule: ClassSchedule[];
    roster: string[];
}

function AdminClasses() {
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [name, setName] = useState('');
    const [limit, setLimit] = useState(20);
    const [supervisor, setSupervisor] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const fetchData = () => {
        fetch('/api/classes').then(res => res.json()).then(setClasses);
        fetch('/api/users').then(res => res.json()).then(setUsers);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setName('');
        setLimit(20);
        setSupervisor('');
        setSelectedStudents([]);
        setSchedule([]);
        setEditingClassId(null);
    };

    const handleEdit = (cls: ClassData) => {
        setEditingClassId(cls.id);
        setName(cls.name);
        setLimit(cls.studentLimit);
        setSupervisor(cls.supervisor);
        setSelectedStudents(cls.roster || []);
        setSchedule(cls.schedule || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingClassId ? `/api/classes/${editingClassId}` : '/api/classes';
        const method = editingClassId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                studentLimit: limit, 
                supervisor, 
                schedule, 
                roster: selectedStudents 
            })
        });
        if (res.ok) {
            resetForm();
            fetchData();
        } else {
            alert('Failed to save class');
        }
    };

    const toggleStudent = (uname: string) => {
        setSelectedStudents(prev => 
            prev.includes(uname) ? prev.filter(u => u !== uname) : [...prev, uname]
        );
    };

    const addScheduleDay = (day: string) => {
        if (!schedule.find(s => s.day === day)) {
            setSchedule([...schedule, { day, times: ['09:00'] }]);
        }
    };

    const updateScheduleTime = (day: string, timeIndex: number, newTime: string) => {
        setSchedule(prev => prev.map(s => {
            if (s.day === day) {
                const newTimes = [...s.times];
                newTimes[timeIndex] = newTime;
                return { ...s, times: newTimes };
            }
            return s;
        }));
    };

    const addTimeSlot = (day: string) => {
        setSchedule(prev => prev.map(s => {
            if (s.day === day) {
                return { ...s, times: [...s.times, '12:00'] };
            }
            return s;
        }));
    };

    const removeDay = (day: string) => {
        setSchedule(prev => prev.filter(s => s.day !== day));
    };

    return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '1000px' }}>
            <h2>{editingClassId ? `Edit Class: ${name}` : 'Manage Classes'}</h2>
            <form onSubmit={handleSubmit} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px', 
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'var(--surface)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input placeholder="Class Name" value={name} onChange={e => setName(e.target.value)} required />
                    <input type="number" placeholder="Student Limit" value={limit} onChange={e => setLimit(parseInt(e.target.value))} required />
                </div>
                
                <select value={supervisor} onChange={e => setSupervisor(e.target.value)} required>
                    <option value="">-- Select Supervisor --</option>
                    {users.map(u => (
                        <option key={u.username} value={u.username}>{u.username} ({u.roles.join(', ')})</option>
                    ))}
                </select>

                <div style={{ border: '1px solid var(--border)', padding: '10px', borderRadius: '4px' }}>
                    <strong>Roster (Students)</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '5px', maxHeight: '150px', overflowY: 'auto', marginTop: '5px' }}>
                        {users.filter(u => u.roles.includes('student')).map(u => (
                            <label key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedStudents.includes(u.username)} 
                                    onChange={() => toggleStudent(u.username)}
                                    disabled={!selectedStudents.includes(u.username) && selectedStudents.length >= limit}
                                />
                                {u.username}
                            </label>
                        ))}
                    </div>
                    <small>{selectedStudents.length} / {limit} students</small>
                </div>

                <div style={{ border: '1px solid var(--border)', padding: '10px', borderRadius: '4px' }}>
                    <strong>Schedule</strong>
                    <div style={{ display: 'flex', gap: '5px', margin: '10px 0' }}>
                        {days.map(d => (
                            <button type="button" key={d} onClick={() => addScheduleDay(d)} style={{ padding: '5px', fontSize: '0.8em' }}>
                                + {d.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                    {schedule.map(s => (
                        <div key={s.day} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px', backgroundColor: 'var(--surface-light)', padding: '5px', borderRadius: '4px' }}>
                            <span style={{ minWidth: '80px' }}>{s.day}:</span>
                            {s.times.map((t, i) => (
                                <input key={i} type="time" value={t} onChange={e => updateScheduleTime(s.day, i, e.target.value)} style={{ padding: '2px' }} />
                            ))}
                            <button type="button" onClick={() => addTimeSlot(s.day)} style={{ padding: '2px 5px' }}>+ Time</button>
                            <button type="button" onClick={() => removeDay(s.day)} style={{ marginLeft: 'auto', color: '#ff5252' }}>X</button>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 1 }}>{editingClassId ? 'Update Class' : 'Create Class'}</button>
                    {editingClassId && <button type="button" onClick={resetForm} style={{ backgroundColor: 'transparent' }}>Cancel</button>}
                </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {classes.map(c => (
                    <div key={c.id} style={{ backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>{c.name}</h3>
                        <p><strong>Supervisor:</strong> {c.supervisor}</p>
                        <p><strong>Students:</strong> {c.roster.length} / {c.studentLimit}</p>
                        <div style={{ fontSize: '0.9em' }}>
                            <strong>Schedule:</strong>
                            {c.schedule.map(s => (
                                <div key={s.day}>{s.day}: {s.times.join(', ')}</div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button onClick={() => handleEdit(c)}>Edit</button>
                            <button onClick={async () => {
                                if (confirm('Delete class?')) {
                                    await fetch(`/api/classes/${c.id}`, { method: 'DELETE' });
                                    fetchData();
                                }
                            }} style={{ color: '#ff5252' }}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminClasses;

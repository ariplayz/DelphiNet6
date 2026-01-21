import { useState, useEffect } from 'react';
import type { User } from './App';

interface StudentProgram {
    id: string;
    studentUsername: string;
    templateId: string;
    programName: string;
    schoolDays: number;
    courses: { name: string; status: 'not-started' | 'in-progress' | 'completed'; startDate?: string }[];
}

function Programs({ }: { user: User }) {
    const [programs, setPrograms] = useState<StudentProgram[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPrograms = async () => {
        setLoading(true);
        const res = await fetch('/api/student-programs');
        if (res.ok) {
            setPrograms(await res.json());
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleStartCourse = async (programId: string, courseName: string) => {
        const program = programs.find(p => p.id === programId);
        if (!program) return;

        const newCourses = program.courses.map(c => 
            c.name === courseName ? { ...c, status: 'in-progress', startDate: new Date().toISOString() } : c
        );

        const res = await fetch(`/api/student-programs/${programId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...program, courses: newCourses })
        });

        if (res.ok) fetchPrograms();
    };

    const handleCompleteCourse = async (programId: string, courseName: string) => {
        const program = programs.find(p => p.id === programId);
        if (!program) return;

        const newCourses = program.courses.map(c => 
            c.name === courseName ? { ...c, status: 'completed' } : c
        );

        const res = await fetch(`/api/student-programs/${programId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...program, courses: newCourses })
        });

        if (res.ok) fetchPrograms();
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', width: '100%' }}>
            <h1 style={{ color: 'var(--primary)' }}>My Programs</h1>
            {programs.length === 0 ? (
                <p>You have no programs assigned.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {programs.map(p => (
                        <div key={p.id} style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <h2 style={{ color: 'var(--primary)', marginTop: 0 }}>{p.programName}</h2>
                            <p style={{ color: 'var(--text-dim)' }}>Expected School Days: {p.schoolDays}</p>
                            
                            <h3>Courses:</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {p.courses.map(c => (
                                    <div key={c.name} style={{ backgroundColor: 'var(--surface-light)', padding: '15px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ fontSize: '1.1em' }}>{c.name}</strong>
                                            <span style={{ 
                                                padding: '2px 8px', 
                                                borderRadius: '12px', 
                                                fontSize: '0.8em',
                                                backgroundColor: c.status === 'completed' ? '#4caf50' : c.status === 'in-progress' ? '#2196f3' : '#757575',
                                                color: 'white'
                                            }}>
                                                {c.status.replace('-', ' ')}
                                            </span>
                                        </div>
                                        {c.startDate && <div style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>Started: {new Date(c.startDate).toLocaleDateString()}</div>}
                                        {c.status === 'not-started' && (
                                            <button onClick={() => handleStartCourse(p.id, c.name)} style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Start Course</button>
                                        )}
                                        {c.status === 'in-progress' && (
                                            <button onClick={() => handleCompleteCourse(p.id, c.name)} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Complete Course</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Programs;

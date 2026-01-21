import { useState, useEffect } from 'react';
import type { User } from './App';

interface ProgramTemplate {
    id: string;
    name: string;
    description: string;
    schoolDays: number;
    courses: string[];
}

interface StudentProgram {
    id: string;
    studentUsername: string;
    templateId: string;
    programName: string;
    schoolDays: number;
    courses: { name: string; status: 'not-started' | 'in-progress' | 'completed'; startDate?: string }[];
}

function AdminPrograms({ user }: { user: User }) {
    const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
    const [studentPrograms, setStudentPrograms] = useState<StudentProgram[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Template form
    const [tName, setTName] = useState('');
    const [tDesc, setTDesc] = useState('');
    const [tDays, setTDays] = useState(0);
    const [tCourses, setTCourses] = useState('');

    // Assignment form
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const fetchData = async () => {
        const [tRes, spRes, uRes] = await Promise.all([
            fetch('/api/program-templates'),
            fetch('/api/student-programs'),
            fetch('/api/users')
        ]);
        if (tRes.ok) setTemplates(await tRes.json());
        if (spRes.ok) setStudentPrograms(await spRes.json());
        if (uRes.ok) setUsers(await uRes.json());
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/program-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: tName,
                description: tDesc,
                schoolDays: tDays,
                courses: tCourses.split(',').map(c => c.trim()).filter(c => c)
            })
        });
        if (res.ok) {
            setTName(''); setTDesc(''); setTDays(0); setTCourses('');
            fetchData();
        }
    };

    const handleAssignProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        const template = templates.find(t => t.id === selectedTemplate);
        if (!template || !selectedStudent) return;

        const res = await fetch('/api/student-programs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentUsername: selectedStudent,
                templateId: template.id,
                programName: template.name,
                schoolDays: template.schoolDays,
                courses: template.courses.map(c => ({ name: c, status: 'not-started' }))
            })
        });
        if (res.ok) {
            fetchData();
        }
    };

    const handleRemoveCourse = async (programId: string, courseName: string) => {
        const program = studentPrograms.find(p => p.id === programId);
        if (!program) return;
        const newCourses = program.courses.filter(c => c.name !== courseName);
        const res = await fetch(`/api/student-programs/${programId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...program, courses: newCourses })
        });
        if (res.ok) fetchData();
    };

    const handleDeleteStudentProgram = async (id: string) => {
        if (!confirm('Delete this student program?')) return;
        const res = await fetch(`/api/student-programs/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    };

    return (
        <div style={{ padding: '20px', width: '100%' }}>
            <h1 style={{ color: 'var(--primary)' }}>Program Management</h1>
            
            {user.role === 'admin' && (
                <div style={{ marginBottom: '40px' }}>
                    <h2>Create Program Template</h2>
                    <form onSubmit={handleAddTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <input placeholder="Program Name" value={tName} onChange={e => setTName(e.target.value)} required />
                        <textarea placeholder="Description" value={tDesc} onChange={e => setTDesc(e.target.value)} required />
                        <input type="number" placeholder="School Days to Complete" value={tDays} onChange={e => setTDays(parseInt(e.target.value))} required />
                        <input placeholder="Courses (comma separated)" value={tCourses} onChange={e => setTCourses(e.target.value)} required />
                        <button type="submit">Create Template</button>
                    </form>
                </div>
            )}

            <div style={{ marginBottom: '40px' }}>
                <h2>Assign Program to Student</h2>
                <form onSubmit={handleAssignProgram} style={{ display: 'flex', gap: '10px', backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required>
                        <option value="">Select Student</option>
                        {users.filter(u => u.role === 'student').map(u => (
                            <option key={u.username} value={u.username}>{u.username}</option>
                        ))}
                    </select>
                    <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} required>
                        <option value="">Select Template</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <button type="submit">Assign</button>
                </form>
            </div>

            <div>
                <h2>Student Programs</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {studentPrograms.map(sp => (
                        <div key={sp.id} style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{sp.studentUsername} - {sp.programName}</h3>
                                <button onClick={() => handleDeleteStudentProgram(sp.id)} style={{ color: '#ff5252', padding: '5px 10px' }}>Remove Program</button>
                            </div>
                            <p style={{ color: 'var(--text-dim)' }}>Days: {sp.schoolDays}</p>
                            <h4>Courses:</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {sp.courses.map(c => (
                                    <div key={c.name} style={{ backgroundColor: 'var(--surface-light)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span>{c.name} ({c.status})</span>
                                        <button onClick={() => handleRemoveCourse(sp.id, c.name)} style={{ color: '#ff5252', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminPrograms;

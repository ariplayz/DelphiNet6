import { useState, useEffect } from 'react';
import type { User } from './App';

interface DashboardProps {
    user: User;
}

function Dashboard({ user }: DashboardProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard-stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: '20px' }}>Loading Dashboard...</div>;
    if (!stats) return <div style={{ padding: '20px' }}>Error loading dashboard.</div>;

    const renderStudentDashboard = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Programs Widget */}
            <div className="widget">
                <h3>My Programs</h3>
                {stats.programs.length === 0 ? <p>No programs assigned.</p> : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {stats.programs.map((p: any) => {
                            const completed = p.courses.filter((c: any) => c.status === 'completed').length;
                            const total = p.courses.length;
                            return (
                                <li key={p.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'var(--surface-light)', borderRadius: '4px' }}>
                                    <strong>{p.programName}</strong>
                                    <div style={{ fontSize: '0.9em', color: 'var(--text-dim)' }}>
                                        Progress: {completed}/{total} courses
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '5px' }}>
                                        <div style={{ width: `${(completed / total) * 100}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Attendance Widget */}
            <div className="widget">
                <h3>Attendance</h3>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '3em', color: stats.absences.length > 0 ? '#ff5252' : 'var(--primary)' }}>
                        {stats.absences.length}
                    </div>
                    <p>Total Absences/Lates Recorded</p>
                </div>
            </div>

            {/* Schedule Widget */}
            <div className="widget">
                <h3>Schedule</h3>
                {stats.classes.length === 0 ? <p>No classes assigned.</p> : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {stats.classes.map((c: any) => (
                            <li key={c.id} style={{ marginBottom: '10px' }}>
                                <strong>{c.name}</strong>
                                <div style={{ fontSize: '0.9em', color: 'var(--text-dim)' }}>
                                    {c.schedule?.map((s: any) => `${s.day}: ${s.time}`).join(' | ')}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    const renderSupervisorDashboard = () => {
        const totalPoints = stats.studentStats ? stats.studentStats.reduce((sum: number, s: any) => sum + s.totalPoints, 0) : 0;
        const avgPoints = (stats.studentStats && stats.studentStats.length > 0) ? (totalPoints / stats.studentStats.length).toFixed(1) : 0;
        const totalAbsences = stats.studentStats ? stats.studentStats.reduce((sum: number, s: any) => sum + s.absencesCount, 0) : 0;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="widget">
                    <h3>Student Stats Average</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', color: 'var(--primary)' }}>{avgPoints}</div>
                            <small>Avg Points</small>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', color: '#ff5252' }}>{totalAbsences}</div>
                            <small>Total Absences</small>
                        </div>
                    </div>
                </div>

                <div className="widget">
                    <h3>Recent Roll Calls</h3>
                    {stats.rollcalls.length === 0 ? <p>No roll calls yet.</p> : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {stats.rollcalls.slice(-5).reverse().map((r: any) => (
                                <li key={r.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                    <span>{new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <div style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>Class: {r.classId}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ color: 'var(--primary)', marginBottom: '30px' }}>Dashboard - Welcome, {user.username}!</h1>
            {user.roles.includes('student') ? renderStudentDashboard() : renderSupervisorDashboard()}
            
            <style>{`
                .widget {
                    background-color: var(--surface);
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                }
                .widget h3 {
                    margin-top: 0;
                    color: var(--primary);
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
            `}</style>
        </div>
    );
}

export default Dashboard;
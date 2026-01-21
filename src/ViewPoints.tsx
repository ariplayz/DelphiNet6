import { useState, useEffect, useRef, Fragment } from 'react';

interface PointSlip {
    name: string;
    date: Date;
    points: number;
    hours: number;
}

import type { User } from './App';

interface ViewPointsProps {
    pointsSlips: PointSlip[];
    currentUser: User;
}

function ViewPoints({ pointsSlips, currentUser }: ViewPointsProps) {
    const [selectedStaff, setSelectedStaff] = useState(currentUser.role === 'student' ? currentUser.username : '');
    const [activeTab, setActiveTab] = useState('table');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(todayLocal.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Weekly stats is just for the active person (if selected)
    const statsUser = selectedStaff || currentUser.username;
    const weeklySlips = pointsSlips.filter(p => p.name === statsUser && p.date >= oneWeekAgo);
    
    const totalPointsWeek = weeklySlips.reduce((sum, p) => sum + p.points, 0);
    const totalHoursWeek = weeklySlips.reduce((sum, p) => sum + p.hours, 0);
    const avgPointsWeek = weeklySlips.length > 0 ? Number((totalPointsWeek / weeklySlips.length).toFixed(2)) : 0;
    const avgHoursWeek = weeklySlips.length > 0 ? Number((totalHoursWeek / weeklySlips.length).toFixed(2)) : 0;

    const staffNames = [...new Set(pointsSlips.map(p => p.name))].sort();
    
    const dates: Date[] = [];
    const dateRange = 14; // Default to 14 for desktop view in this version
    for (let i = -dateRange; i <= dateRange; i++) {
        const d = new Date(todayLocal);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }

    useEffect(() => {
        if (activeTab === 'table' && tableContainerRef.current) {
            const container = tableContainerRef.current;
            const todayIndex = dateRange; 
            const scrollAmount = (todayIndex * 160); 
            container.scrollLeft = scrollAmount - (container.clientWidth / 2) + 80;
        }
    }, [activeTab, dateRange]);

    const filteredSlips = pointsSlips
        .filter(p => p.name === selectedStaff)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const maxPoints = Math.max(...filteredSlips.map(p => p.points), 0);

    return (
        <div className="main-content" style={{ alignItems: 'stretch' }}>
            <h1 style={{ color: 'var(--primary)', alignSelf: 'center' }}>View Points</h1>

            <div style={{ alignSelf: 'center', textAlign: 'center', backgroundColor: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--primary)', width: '100%', maxWidth: '600px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 15px 0', color: 'var(--primary)', fontSize: '1.3em' }}>Weekly Stats for {statsUser}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <div>
                        <span style={{ color: 'var(--text-dim)' }}>Total Points:</span> <strong style={{ color: 'var(--text)' }}>{totalPointsWeek.toFixed(1)}</strong><br/>
                        <span style={{ color: 'var(--text-dim)' }}>Total Hours:</span> <strong style={{ color: 'var(--text)' }}>{totalHoursWeek.toFixed(1)}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-dim)' }}>Avg Pts/Slip:</span> <strong style={{ color: 'var(--text)' }}>{avgPointsWeek}</strong><br/>
                        <span style={{ color: 'var(--text-dim)' }}>Avg Hrs/Slip:</span> <strong style={{ color: 'var(--text)' }}>{avgHoursWeek}</strong>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginTop: '20px' }}>
                <button 
                    onClick={() => setActiveTab('table')}
                    style={{ 
                        padding: '12px 24px', 
                        cursor: 'pointer', 
                        border: 'none', 
                        backgroundColor: activeTab === 'table' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'table' ? 'white' : 'var(--text-dim)',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    Table View
                </button>
                <button 
                    onClick={() => setActiveTab('graph')}
                    style={{ 
                        padding: '12px 24px', 
                        cursor: 'pointer', 
                        border: 'none', 
                        backgroundColor: activeTab === 'graph' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'graph' ? 'white' : 'var(--text-dim)',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    Graph View
                </button>
            </div>

            {activeTab === 'table' ? (
                <div ref={tableContainerRef} style={{ overflowX: 'auto', width: '100%', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--surface)' }}>
                    <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid var(--border)', padding: '12px', backgroundColor: 'var(--surface-light)', color: 'var(--primary)', position: 'sticky', left: 0, zIndex: 1 }}>Staff Member</th>
                                {dates.map(date => (
                                    <th key={date.toISOString()} colSpan={2} style={{ 
                                        border: '1px solid var(--border)', 
                                        padding: '12px', 
                                        backgroundColor: date.toDateString() === todayLocal.toDateString() ? 'rgba(1, 108, 74, 0.2)' : 'var(--surface-light)',
                                        color: date.toDateString() === todayLocal.toDateString() ? 'var(--primary)' : 'var(--text)',
                                        minWidth: '150px'
                                    }}>
                                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th style={{ border: '1px solid var(--border)', padding: '5px', backgroundColor: 'var(--surface-light)', position: 'sticky', left: 0, zIndex: 1 }}></th>
                                {dates.map(date => (
                                    <Fragment key={date.toISOString()}>
                                        <th style={{ border: '1px solid var(--border)', padding: '8px', fontSize: '12px', backgroundColor: 'var(--surface)', color: 'var(--text-dim)' }}>Pts</th>
                                        <th style={{ border: '1px solid var(--border)', padding: '8px', fontSize: '12px', backgroundColor: 'var(--surface)', color: 'var(--text-dim)' }}>Hrs</th>
                                    </Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staffNames.map(name => (
                                <tr key={name}>
                                    <td style={{ border: '1px solid var(--border)', padding: '12px', fontWeight: 'bold', backgroundColor: 'var(--surface-light)', color: 'var(--text)', position: 'sticky', left: 0, zIndex: 1 }}>{name}</td>
                                    {dates.map(date => {
                                        const slip = pointsSlips.find(p => p.name === name && p.date.toDateString() === date.toDateString());
                                        return (
                                            <Fragment key={date.toISOString()}>
                                                <td style={{ border: '1px solid var(--border)', padding: '12px', textAlign: 'center', color: 'var(--text)' }}>{slip ? slip.points : '-'}</td>
                                                <td style={{ border: '1px solid var(--border)', padding: '12px', textAlign: 'center', color: 'var(--text)' }}>{slip ? slip.hours : '-'}</td>
                                            </Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--surface)', padding: '30px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label htmlFor="staff-select" style={{ color: 'var(--text-dim)' }}>Select Staff Member:</label>
                        <select
                            id="staff-select"
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            style={{ 
                                padding: '10px', 
                                borderRadius: '4px', 
                                maxWidth: '300px', 
                                backgroundColor: 'var(--surface-light)', 
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                fontSize: '16px'
                            }}
                        >
                            <option value="">--Select a name--</option>
                            {staffNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStaff && filteredSlips.length > 0 ? (
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h2 style={{ color: 'var(--primary)' }}>Points Graph for {selectedStaff}:</h2>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '15px',
                                height: '350px',
                                borderLeft: '2px solid var(--border)',
                                borderBottom: '2px solid var(--border)',
                                padding: '20px',
                                position: 'relative',
                                overflowX: 'auto',
                                backgroundColor: 'rgba(0,0,0,0.1)',
                                borderRadius: '4px'
                            }}>
                                {filteredSlips.map((point, index) => {
                                    const height = (point.points / maxPoints) * 280; 
                                    return (
                                        <div key={index} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            minWidth: '70px'
                                        }}>
                                            <div style={{
                                                width: '100%',
                                                height: `${height}px`,
                                                backgroundColor: 'var(--primary)',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'flex-start',
                                                color: 'white',
                                                paddingTop: '5px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                borderRadius: '4px 4px 0 0',
                                                boxShadow: '0 -2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                {point.points}
                                            </div>
                                            <span style={{ fontSize: '11px', transform: 'rotate(-45deg)', marginTop: '25px', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
                                                {point.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>
                            {selectedStaff ? 'No data available for this staff member.' : 'Please select a staff member to see their performance graph.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default ViewPoints;

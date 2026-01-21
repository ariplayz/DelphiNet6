import { useState } from 'react';

import type { User } from './App';

interface EnterPointsProps {
    addSlip: (newSlip: any) => void;
    userList: any[];
    currentUser: User;
}

function EnterPoints({ addSlip, userList, currentUser }: EnterPointsProps) {
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [name, setName] = useState(currentUser.role === 'student' ? currentUser.username : '');
    const [date, setDate] = useState(getLocalDateString(new Date()));
    const [points, setPoints] = useState('');
    const [hours, setHours] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const suggestions = name ? userList.filter(u => u.username.toLowerCase().includes(name.toLowerCase())) : [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalName = currentUser.role === 'student' ? currentUser.username : name;
        
        if (currentUser.role !== 'student') {
            const matchedUser = userList.find(u => u.username.toLowerCase() === finalName.toLowerCase());
            if (!matchedUser) {
                alert('Please enter a valid user name.');
                return;
            }
        }
        
        if (!date || !points || !hours) {
            alert('Please fill in all fields');
            return;
        }

        const newSlip = {
            name: finalName,
            date: new Date(date + 'T00:00:00'), // Ensure it's treated as local date
            points: parseFloat(points),
            hours: parseFloat(hours)
        };

        addSlip(newSlip);
        if (currentUser.role !== 'student') setName('');
        setPoints('');
        setHours('');
    };

    return (
        <div className="main-content">
            <h1 style={{ color: 'var(--primary)' }}>Enter Points</h1>

            <form onSubmit={handleSubmit} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px', 
                width: '100%', 
                maxWidth: '400px',
                padding: '30px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
                    <label htmlFor="name" style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Name:</label>
                    <input 
                        id="name"
                        type="text" 
                        value={name} 
                        autoComplete="off"
                        onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }} 
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Type name..."
                        disabled={currentUser.role === 'student'}
                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)', color: 'var(--text)', fontSize: '16px', opacity: currentUser.role === 'student' ? 0.7 : 1 }}
                    />
                    {showSuggestions && currentUser.role !== 'student' && suggestions.length > 0 && (
                        <div style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                            backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', 
                            borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' 
                        }}>
                            {suggestions.map(u => (
                                <div key={u.username} onClick={() => { setName(u.username); setShowSuggestions(false); }} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                                    {u.username}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label htmlFor="date" style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Date:</label>
                    <input 
                        id="date"
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)', color: 'var(--text)', fontSize: '16px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label htmlFor="points" style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Points:</label>
                    <input 
                        id="points"
                        type="number" 
                        value={points} 
                        onChange={(e) => setPoints(e.target.value)} 
                        placeholder="Enter points"
                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)', color: 'var(--text)', fontSize: '16px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label htmlFor="hours" style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Hours:</label>
                    <input 
                        id="hours"
                        type="number" 
                        step="0.1"
                        value={hours} 
                        onChange={(e) => setHours(e.target.value)} 
                        placeholder="Enter hours"
                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)', color: 'var(--text)', fontSize: '16px' }}
                    />
                </div>

                <button type="submit" style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginTop: '10px',
                    fontSize: '1em'
                }}>
                    Submit Slip
                </button>
            </form>
        </div>
    );
}

export default EnterPoints;

import React, { useState } from 'react';

interface LoginProps {
    onLogin: (user: any) => void;
}

function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (response.ok) {
                const user = await response.json();
                onLogin(user);
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Login failed. Server might be down.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
            <form onSubmit={handleSubmit} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px', 
                width: '100%', 
                maxWidth: '350px',
                padding: '40px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}>
                <h1 style={{ color: 'var(--primary)', textAlign: 'center', margin: '0 0 10px 0' }}>School Portal Login</h1>
                {error && <p style={{ color: '#ff5252', textAlign: 'center' }}>{error}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Username:</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)', color: 'var(--text)', fontSize: '16px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: 'var(--text-dim)', fontSize: '0.9em' }}>Password:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
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
                    marginTop: '10px'
                }}>
                    Login
                </button>
            </form>
        </div>
    );
}

export default Login;

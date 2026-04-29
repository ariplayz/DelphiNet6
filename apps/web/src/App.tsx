import React from 'react';

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#016745',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#E6F4EE', fontSize: 28, fontWeight: 700 }}>D</span>
      </div>
      <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#E6EDE9' }}>DelphiNet 6</h1>
      <p style={{ margin: 0, color: '#9BA8A2' }}>School Portal — Loading…</p>
    </div>
  );
}

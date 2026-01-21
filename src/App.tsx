import { useState, useEffect } from 'react'
import './App.css'
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Points from "./Points";
import Login from "./Login";
import AdminUsers from "./AdminUsers";
import AdminClasses from "./AdminClasses";
import RollCall from "./RollCall";
import Absences from "./Absences";
import Programs from "./Programs";
import AdminPrograms from "./AdminPrograms";

export interface User {
  username: string;
  role: 'student' | 'staff' | 'admin' | 'courseroom-supervisor';
  isAbsenceChecker?: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar setScreen={setScreen} user={user} onLogout={handleLogout} />
      <div className="main-content">
        {screen === 'dashboard' && <Dashboard user={user} />}
        {screen === 'points' && <Points user={user} />}
        {screen === 'admin-users' && <AdminUsers />}
        {screen === 'admin-classes' && <AdminClasses />}
        {screen === 'roll-call' && <RollCall user={user} />}
        {screen === 'absences' && <Absences />}
        {screen === 'programs' && <Programs user={user} />}
        {screen === 'admin-programs' && <AdminPrograms user={user} />}
      </div>
    </div>
  );
}

export default App

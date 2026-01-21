import { useState } from 'react'
import './App.css'
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Points from "./Points";

function App() {
  const [screen, setScreen] = useState('dashboard');

  return (
    <div className="app-container">
      <Sidebar setScreen={setScreen} />

      {screen === 'dashboard' && <Dashboard />}
      {screen === 'points' && <Points />}
    </div>
  );
}

export default App

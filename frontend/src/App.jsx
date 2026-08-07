import { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

const OUTLETS = ['Outlet-A', 'Outlet-B', 'Outlet-C'];

export default function App() {
  const [outlet, setOutlet] = useState(OUTLETS[0]);

  return (
    <div className="app">
      <header>
        <h1>Real-Time Inventory & Order Sync</h1>
        <select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
          {OUTLETS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </header>
      <Dashboard outlet={outlet} />
    </div>
  );
}

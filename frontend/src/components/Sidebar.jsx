import { IconGrid, IconBox, IconReceipt, IconSettings } from './Icons';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconGrid },
  { id: 'products',  label: 'Products',  icon: IconBox },
  { id: 'orders',    label: 'Orders',    icon: IconReceipt },
  { id: 'settings',  label: 'Settings',  icon: IconSettings, disabled: true },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="brand-name">Stockwise</div>
          <div className="brand-sub">Inventory Sync</div>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => !it.disabled && onNavigate(it.id)}
              disabled={it.disabled}
              style={it.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              <Icon size={18} className="nav-icon" />
              <span>{it.label}</span>
              {it.disabled && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>soon</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <strong style={{ color: 'var(--text)' }}>Real-time</strong>
        <div style={{ marginTop: 4 }}>Updates pushed via Socket.io across every connected outlet.</div>
      </div>
    </aside>
  );
}
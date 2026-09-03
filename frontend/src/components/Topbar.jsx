import { IconSearch } from './Icons';

export default function Topbar({
  crumb,
  title,
  outlet,
  outlets,
  onOutletChange,
  search,
  onSearch,
  connected,
  reconnecting,
  right,
}) {
  const status = reconnecting ? 'reconnecting' : connected ? 'online' : 'offline';
  const statusLabel = reconnecting
    ? 'Reconnecting'
    : connected
    ? 'Live'
    : 'Offline';
  return (
    <header className="topbar">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>

      <div className="topbar-right">
        <div className="search">
          <IconSearch size={16} />
          <input
            type="text"
            value={search}
            placeholder="Search products…"
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>

        <select
          className="outlet-select"
          value={outlet}
          onChange={(e) => onOutletChange(e.target.value)}
          aria-label="Outlet"
        >
          {outlets.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <span
          className={`connection ${status}`}
          aria-live="polite"
          aria-label={`Socket connection ${statusLabel}`}
          title={statusLabel}
        >
          <span className="dot" />
          {statusLabel}
        </span>

        {right}
      </div>
    </header>
  );
}
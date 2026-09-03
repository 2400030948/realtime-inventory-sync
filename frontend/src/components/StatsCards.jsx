export default function StatsCards({ stats }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className={`stat ${s.tone || ''}`}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
          <div className="stat-note">{s.delta || s.note}</div>
        </div>
      ))}
    </div>
  );
}

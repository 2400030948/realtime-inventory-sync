export default function StatsCards({ stats }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className={`stat ${s.tone || ''}`}>
          <div className="label">{s.label}</div>
          <div className="value">{s.value}</div>
          {s.delta && <div className="delta">{s.delta}</div>}
        </div>
      ))}
    </div>
  );
}
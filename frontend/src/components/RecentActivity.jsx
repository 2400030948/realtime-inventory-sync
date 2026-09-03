import { useActivityStore } from '../hooks/useActivity';
import { IconCheck, IconWarning, IconReceipt, IconBox } from './Icons';

const KIND_LABEL = {
  inventory: 'Inventory',
  'low-stock': 'Low stock',
  order: 'Order',
};
const KIND_ICON = {
  inventory: IconBox,
  'low-stock': IconWarning,
  order: IconReceipt,
};
const KIND_CLASS = {
  inventory: 'info',
  'low-stock': 'warn',
  order: 'success',
};

function fmtTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  // Compact relative time so the feed stays readable.
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function RecentActivity({ outlet }) {
  const all = useActivityStore();
  // Filter to the active outlet when an outlet is selected.
  const events = outlet
    ? all.filter((e) => {
        const eOutlet =
          e.product?.outlet ||
          e.order?.outlet ||
          null;
        return eOutlet == null || eOutlet === outlet;
      })
    : all;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Recent activity</h2>
          <div className="sub">
            {events.length === 0
              ? 'Listening for live updates…'
              : `${events.length} event${events.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      <div className="panel-body">
        {events.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><IconCheck size={26} /></div>
            <div className="title">No activity yet</div>
            <div>
              Real-time events from Socket.io will appear here as soon as they arrive.
            </div>
          </div>
        ) : (
          <ul className="activity-list">
            {events.map((ev) => {
              const Icon = KIND_ICON[ev.kind] || IconCheck;
              const tone = KIND_CLASS[ev.kind] || 'info';
              return (
                <li key={ev.id} className={`activity ${tone}`}>
                  <div className="activity-icon"><Icon size={14} /></div>
                  <div className="activity-body">
                    <div className="activity-title">
                      <span className="activity-tag">{KIND_LABEL[ev.kind] || 'Event'}</span>
                      {ev.title}
                    </div>
                    {ev.body && <div className="activity-sub">{ev.body}</div>}
                    <div className="activity-time">{fmtTime(ev.ts)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
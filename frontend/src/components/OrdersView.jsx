import { IconReceipt } from './Icons';

const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function OrdersView({ orders, loading, outlet, compact = false }) {
  if (loading) {
    return (
      <div className="center-loader"><span className="spinner" /> &nbsp; Loading orders…</div>
    );
  }
  if (!orders.length) {
    return (
      <div className="empty">
        <div className="empty-icon"><IconReceipt size={26} /></div>
        <div className="title">No orders yet</div>
        <div>When customers buy something from <strong>{outlet}</strong>, it'll show up here in real time.</div>
      </div>
    );
  }

  const list = compact ? orders.slice(0, 5) : orders;
  return (
    <div className="order-list">
      {list.map((o) => (
        <div className="order" key={o._id}>
          <div className="left">
            <div className="id">#{o._id.slice(-8).toUpperCase()}</div>
            <div className="meta">
              {o.items.length} item{o.items.length !== 1 ? 's' : ''} · {o.outlet} · {fmtTime(o.createdAt)}
            </div>
            <div className="meta" style={{ marginTop: 4 }}>
              {o.items.map((it) => `${it.sku} ×${it.quantity}`).join(', ')}
            </div>
          </div>
          <div className="right">
            <div className="total">${Number(o.totalAmount).toFixed(2)}</div>
            <span className={`badge ${o.status === 'CONFIRMED' ? 'confirmed' : o.status === 'CANCELLED' ? 'cancelled' : 'failed'}`}>
              {o.status.replace('_', ' ').toLowerCase()}
            </span>
          </div>
        </div>
      ))}
      {compact && orders.length > 5 && (
        <div className="sub" style={{ textAlign: 'center', paddingTop: 6 }}>
          +{orders.length - 5} more in the Orders view
        </div>
      )}
    </div>
  );
}
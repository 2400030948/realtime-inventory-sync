import { useMemo } from 'react';
import StatsCards from './StatsCards';
import ProductCard from './ProductCard';
import OrdersView from './OrdersView';
import RecentActivity from './RecentActivity';
import CreateOrderModal from './CreateOrderModal';
import { IconBox, IconWarning, IconCheck, IconReceipt } from './Icons';

// Dashboard is purely derived from props — initial loading is done in App.
export default function DashboardView({
  outlet,
  products,
  loading,
  search,
  orders,
  loadingOrders,
  onAddProduct,
  onPlaceOrder,
  toast,
}) {
  // Filtered & sorted products (low-stock first, then most recently updated).
  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q)
        )
      : products;
    return [...list].sort((a, b) => {
      // Low-stock first, then most recently updated
      const aLow = a.quantity <= a.lowStockThreshold;
      const bLow = b.quantity <= b.lowStockThreshold;
      if (aLow !== bLow) return aLow ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [products, search]);

  // Stats derived from the full list (not filtered)
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold).length;
    const inventoryValue = products.reduce((acc, p) => acc + p.quantity * p.price, 0);
    const outOfStock = products.filter((p) => p.quantity === 0).length;
    const healthy = totalProducts - lowStock;
    return [
      { label: 'Total SKUs', value: totalProducts, tone: 'accent', note: `${healthy} healthy` },
      { label: 'Needs attention', value: lowStock, tone: lowStock > 0 ? 'warn' : 'good', note: lowStock ? 'Below threshold' : 'All stocked' },
      { label: 'Out of stock', value: outOfStock, tone: outOfStock > 0 ? 'danger' : 'good', note: outOfStock ? 'Immediate action' : 'No gaps' },
      {
        label: 'Inventory value',
        value: `$${inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        tone: 'good',
        note: 'Current outlet',
      },
    ];
  }, [products]);

  const lowStockCount = products.filter((p) => p.quantity <= p.lowStockThreshold).length;

  return (
    <>
      <section className="hero-band">
        <div className="hero-copy">
          <div className="eyebrow">Live inventory command</div>
          <h2>{outlet} is ready for the next order.</h2>
          <p>
            Track stock movement, catch low inventory early, and adjust quantities as updates arrive.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-chip">
            <IconCheck size={16} />
            <span>{products.length} products synced</span>
          </div>
          <div className={`metric-chip ${products.some((p) => p.quantity <= p.lowStockThreshold) ? 'warn' : ''}`}>
            <IconWarning size={16} />
            <span>{lowStockCount} low-stock alert{lowStockCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      <StatsCards stats={stats} />

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Inventory · {outlet}</h2>
            <div className="sub">
              {loading
                ? 'Loading…'
                : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}${search ? ` · filtered by "${search}"` : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={onPlaceOrder}>
              <IconReceipt size={16} /> Place order
            </button>
            <button className="btn btn-primary" onClick={onAddProduct}>
              <IconBox size={16} /> Add product
            </button>
          </div>
        </div>

        <div className="panel-body">
          {loading ? (
            <div className="center-loader">
              <span className="spinner" /> &nbsp; Loading products…
            </div>
          ) : (
          <>
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><IconBox size={26} /></div>
              <div className="title">
                {search ? 'No matches' : 'No products yet'}
              </div>
              <div>
                {search
                  ? 'Try a different name or SKU.'
                  : <>Add your first product to start tracking inventory at <strong>{outlet}</strong>.</>}
              </div>
              {!search && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={onAddProduct}
                >
                  <IconBox size={16} /> Create product
                </button>
              )}
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  toast={toast}
                />
              ))}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent orders · {outlet}</h2>
              <div className="sub">
                {loadingOrders
                  ? 'Loading…'
                  : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          <div className="panel-body">
            <OrdersView orders={orders} loading={loadingOrders} outlet={outlet} compact />
          </div>
        </div>

        <RecentActivity outlet={outlet} />
      </div>
    </>
  );
}

// Expose the order creation modal as a static property so callers can render
// <DashboardView.OrderCreator .../> next to the dashboard.
DashboardView.OrderCreator = CreateOrderModal;

import { useEffect, useMemo, useState, useRef } from 'react';
import StatsCards from './StatsCards';
import ProductCard from './ProductCard';
import CreateProductModal from './CreateProductModal';
import { getProducts, adjustStock as apiAdjust } from '../api/api';
import { IconPlus, IconBox } from './Icons';

export default function DashboardView({
  outlet,
  products,
  setProducts,
  search,
  showCreate,
  setShowCreate,
  toast,
}) {
  const [flashing] = useState({}); // reserved for future highlight on update
  const lastIds = useRef(new Set());
  // Note: setFlashing intentionally unused right now — the prop is wired so
  // we can add a "pulse on socket update" animation later without an API change.
  const [loading, setLoading] = useState(false);

  // Initial load + refresh when outlet changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProducts(outlet)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data);
        lastIds.current = new Set(res.data.map((p) => p._id));
      })
      .catch((err) => toast.danger('Failed to load products', err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)
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
    return [
      { label: 'Total products', value: totalProducts, tone: 'accent' },
      { label: 'Low stock',      value: lowStock,       tone: lowStock > 0 ? 'warn' : 'good' },
      { label: 'Out of stock',   value: outOfStock,     tone: outOfStock > 0 ? 'warn' : 'good' },
      {
        label: 'Inventory value',
        value: `$${inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        tone: 'good',
      },
    ];
  }, [products]);

  const handleAdjust = async (id, delta) => {
    // Optimistic update for snappy UI
    const prev = products;
    setProducts((curr) =>
      curr.map((p) => (p._id === id ? { ...p, quantity: p.quantity + delta } : p))
    );
    try {
      await apiAdjust(id, delta);
    } catch (err) {
      setProducts(prev);
      toast.danger('Update failed', err.response?.data?.message || err.message);
    }
  };

  const handleCreated = (newProduct) => {
    setProducts((curr) => {
      // Replace if it already exists, otherwise prepend
      const exists = curr.some((p) => p._id === newProduct._id);
      return exists
        ? curr.map((p) => (p._id === newProduct._id ? newProduct : p))
        : [newProduct, ...curr];
    });
    setShowCreate(false);
    toast.success('Product created', `${newProduct.name} added to ${newProduct.outlet}`);
  };

  return (
    <>
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
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <IconPlus size={16} /> Add product
          </button>
        </div>

        <div className="panel-body">
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="emoji">📦</div>
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
                  onClick={() => setShowCreate(true)}
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
                  onAdjust={handleAdjust}
                  flashing={!!flashing[p._id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateProductModal
          outlet={outlet}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
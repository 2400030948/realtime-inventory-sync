import { useMemo } from 'react';
import ProductCard from './ProductCard';
import CreateProductModal from './CreateProductModal';
import { IconPlus, IconBox } from './Icons';

// Real product catalog for the current outlet. Search and sort are applied
// client-side on top of the data returned by GET /api/products?outlet=.
// The search box that drives `search` lives in the global Topbar.
export default function ProductsView({
  outlet,
  products,
  loading,
  search,
  onAddProduct,
  toast,
}) {
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
      const aLow = a.quantity <= a.lowStockThreshold;
      const bLow = b.quantity <= b.lowStockThreshold;
      if (aLow !== bLow) return aLow ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [products, search]);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Inventory · {outlet}</h2>
          <div className="sub">
            {loading
              ? 'Loading…'
              : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}${
                  search ? ` · filtered by "${search}"` : ''
                }`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={onAddProduct}>
          <IconPlus size={16} /> Add product
        </button>
      </div>

      <div className="panel-body">
        {loading ? (
          <div className="center-loader">
            <span className="spinner" /> &nbsp; Loading products…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <IconBox size={26} />
            </div>
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
              <ProductCard key={p._id} product={p} toast={toast} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Expose the create modal as a static property of the view so callers can
// render <ProductsView.Creator .../> alongside the main panel.
ProductsView.Creator = CreateProductModal;
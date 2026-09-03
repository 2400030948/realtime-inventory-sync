import { useEffect, useRef, useState } from 'react';
import { IconPlus, IconMinus, IconSliders } from './Icons';
import StockAdjustPopover from './StockAdjustPopover';
import { adjustStock } from '../api/api';

// Visualises stock level as a percentage of (threshold * 4) capped at 100%.
function barWidth(qty, threshold) {
  const cap = Math.max(threshold * 4, 20);
  return Math.min(100, Math.max(4, (qty / cap) * 100));
}

export default function ProductCard({ product, toast }) {
  const [flashing, setFlashing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const prevUpdatedAt = useRef(product.updatedAt);
  useEffect(() => {
    if (prevUpdatedAt.current && prevUpdatedAt.current !== product.updatedAt) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 720);
      prevUpdatedAt.current = product.updatedAt;
      return () => clearTimeout(t);
    }
    prevUpdatedAt.current = product.updatedAt;
  }, [product.updatedAt, product._id]);

  const isLow = product.quantity <= product.lowStockThreshold;
  const cls = `product ${isLow ? 'low' : ''} ${flashing ? 'flash' : ''}`;
  const level = barWidth(product.quantity, product.lowStockThreshold);

  const quickAdjust = async (delta) => {
    if (busy) return;
    setBusy(true);
    try {
      await adjustStock(product._id, delta);
    } catch (err) {
      toast.danger('Update failed', err.message || 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cls}>
      <div className="top">
        <div>
          <div className="name">{product.name}</div>
          <div className="outlet">{product.outlet}</div>
        </div>
        <span className="sku">{product.sku}</span>
      </div>

      <div className="stock-row">
        <div>
          <div className={`stock-qty ${isLow ? 'low' : ''}`}>{product.quantity}</div>
          <div className="threshold">Threshold {product.lowStockThreshold}</div>
        </div>
        <div className="price">${Number(product.price).toFixed(2)}</div>
      </div>

      <div className="bar" aria-label="stock level">
        <span style={{ width: `${level}%` }} />
      </div>

      <div className="product-foot">
        <span className={`status-pill ${isLow ? 'danger' : 'good'}`}>
          {isLow ? (product.quantity === 0 ? 'Out of stock' : 'Restock soon') : 'In stock'}
        </span>
        <span className="stock-percent">{Math.round(level)}%</span>
      </div>

      <div className="actions">
        <button
          className="adjust minus"
          onClick={() => quickAdjust(-1)}
          disabled={busy || product.quantity <= 0}
          aria-label="Decrease stock by one"
          title="−1"
        >
          <IconMinus size={14} />
        </button>
        <button
          className="adjust adjust-custom"
          onClick={() => setAdjustOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={adjustOpen}
          aria-label="Open custom stock adjustment"
          title="Adjust"
        >
          <IconSliders size={14} />
        </button>
        <button
          className="adjust plus"
          onClick={() => quickAdjust(1)}
          disabled={busy}
          aria-label="Increase stock by one"
          title="+1"
        >
          <IconPlus size={14} />
        </button>
      </div>

      {adjustOpen && (
        <StockAdjustPopover
          product={product}
          onClose={() => setAdjustOpen(false)}
          onSubmitted={() => setAdjustOpen(false)}
          toast={toast}
        />
      )}
    </div>
  );
}

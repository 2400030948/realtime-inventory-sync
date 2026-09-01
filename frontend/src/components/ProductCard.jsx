import { IconPlus, IconMinus } from './Icons';

// Visualises stock level as a percentage of (threshold * 4) capped at 100%.
function barWidth(qty, threshold) {
  const cap = Math.max(threshold * 4, 20);
  return Math.min(100, Math.max(4, (qty / cap) * 100));
}

export default function ProductCard({ product, onAdjust, flashing }) {
  const isLow = product.quantity <= product.lowStockThreshold;
  const cls = `product ${isLow ? 'low' : ''} ${flashing ? 'flash' : ''}`;
  return (
    <div className={cls}>
      <div className="top">
        <div>
          <div className="name">{product.name}</div>
          <div className="outlet" style={{ marginTop: 4 }}>{product.outlet}</div>
        </div>
        <span className="sku">{product.sku}</span>
      </div>

      <div className="stock-row">
        <div className={`stock-qty ${isLow ? 'low' : ''}`}>
          {product.quantity}
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 6, fontWeight: 500 }}>
            / threshold {product.lowStockThreshold}
          </span>
        </div>
        <div className="price">${Number(product.price).toFixed(2)}</div>
      </div>

      <div className="bar" aria-label="stock level">
        <span style={{ width: `${barWidth(product.quantity, product.lowStockThreshold)}%` }} />
      </div>

      <div className="actions">
        <button
          className="adjust minus"
          onClick={() => onAdjust(product._id, -1)}
          disabled={product.quantity <= 0}
          aria-label="Decrease stock"
        >
          <IconMinus size={14} />
        </button>
        <button
          className="adjust plus"
          onClick={() => onAdjust(product._id, 1)}
          aria-label="Increase stock"
        >
          <IconPlus size={14} />
        </button>
      </div>
    </div>
  );
}
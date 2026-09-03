import { useMemo, useState } from 'react';
import Modal from './Modal';
import { placeOrder } from '../api/api';
import { IconPlus, IconClose } from './Icons';

// Order placement form. Posts to POST /api/orders. We never claim success
// until the backend confirms it (201 with the saved order).
export default function CreateOrderModal({ outlet, outlets = [], products = [], onClose, onCreated }) {
  const [outletChoice, setOutletChoice] = useState(outlet);
  const [lines, setLines] = useState([{ sku: '', quantity: 1 }]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const productBySku = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(p.sku, p);
    return m;
  }, [products]);

  const outletList = outlets && outlets.length ? outlets : [outlet];

  const updateLine = (idx, patch) => {
    setLines((curr) => curr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((curr) => [...curr, { sku: '', quantity: 1 }]);
  const removeLine = (idx) =>
    setLines((curr) => (curr.length > 1 ? curr.filter((_, i) => i !== idx) : curr));

  const totalPreview = lines.reduce((acc, l) => {
    const p = productBySku.get((l.sku || '').trim());
    return acc + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
  }, 0);

  const validate = () => {
    const e = {};
    if (!outletChoice) e.outlet = 'Required';
    if (!lines.length) e._form = 'Add at least one item.';
    lines.forEach((l, i) => {
      const sku = (l.sku || '').trim();
      const q = Number(l.quantity);
      if (!sku) e[`sku_${i}`] = 'Required';
      else if (!productBySku.has(sku)) e[`sku_${i}`] = 'No product with this SKU';
      if (!Number.isFinite(q) || q < 1) e[`qty_${i}`] = 'Must be ≥ 1';
      const p = productBySku.get(sku);
      if (p && p.quantity < q) e[`qty_${i}`] = `Only ${p.quantity} in stock`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setErrors({});
    if (!validate()) return;
    setSubmitting(true);
    try {
      const items = lines.map((l) => ({
        sku: (l.sku || '').trim(),
        quantity: Number(l.quantity),
      }));
      const { data } = await placeOrder(outletChoice, items);
      onCreated(data);
    } catch (err) {
      const msg = err.message || 'Order failed';
      setErrors({ _form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Place order"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-order-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : 'Place order'}
          </button>
        </>
      }
    >
      <form id="create-order-form" onSubmit={submit} noValidate>
        {errors._form && (
          <div className="field-error" style={{ marginBottom: 8 }}>{errors._form}</div>
        )}

        <div className="field">
          <label>Outlet</label>
          <select value={outletChoice} onChange={(e) => setOutletChoice(e.target.value)}>
            {outletList.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Items</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
{lines.map((line, idx) => {
              const product = productBySku.get((line.sku || '').trim());
              return (
                <div key={idx} className="order-line-row">
                  <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                    <input
                      type="text"
                      list={`sku-options-${idx}`}
                      value={line.sku}
                      onChange={(e) => updateLine(idx, { sku: e.target.value })}
                      placeholder="SKU (e.g. ESP-BEAN-1KG)"
                      aria-label={`SKU for item ${idx + 1}`}
                    />
                    <datalist id={`sku-options-${idx}`}>
                      {products.map((p) => (
                        <option key={p._id} value={p.sku}>
                          {p.name} · {p.outlet} · qty {p.quantity}
                        </option>
                      ))}
                    </datalist>
                    {errors[`sku_${idx}`] && (
                      <span className="field-error">{errors[`sku_${idx}`]}</span>
                    )}
                  </div>
                  <div className="field" style={{ marginBottom: 0, width: 90 }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      aria-label={`Quantity for item ${idx + 1}`}
                    />
                    {errors[`qty_${idx}`] && (
                      <span className="field-error">{errors[`qty_${idx}`]}</span>
                    )}
                  </div>
                  <div className="order-line-price">
                    {product
                      ? `$${(Number(product.price) * Number(line.quantity || 0)).toFixed(2)}`
                      : '—'}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost order-line-remove"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    aria-label={`Remove item ${idx + 1}`}
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={addLine}
          >
            <IconPlus size={14} /> Add another item
          </button>
        </div>

        <div className="order-total">
          <span>Estimated total</span>
          <strong>${totalPreview.toFixed(2)}</strong>
        </div>
      </form>
    </Modal>
  );
}
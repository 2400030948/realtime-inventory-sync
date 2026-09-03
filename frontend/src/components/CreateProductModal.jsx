import { useState } from 'react';
import Modal from './Modal';
import { createProduct } from '../api/api';

export default function CreateProductModal({ outlet, outlets = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    outlet,
    quantity: '',
    price: '',
    lowStockThreshold: '5',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.sku.trim()) e.sku = 'Required';
    if (!form.outlet) e.outlet = 'Required';
    const q = Number(form.quantity);
    if (!Number.isFinite(q) || q < 0) e.quantity = 'Must be ≥ 0';
    const p = Number(form.price);
    if (!Number.isFinite(p) || p < 0) e.price = 'Must be ≥ 0';
    const t = Number(form.lowStockThreshold);
    if (!Number.isFinite(t) || t < 0) e.lowStockThreshold = 'Must be ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        outlet: form.outlet,
        quantity: Number(form.quantity),
        price: Number(form.price),
        lowStockThreshold: Number(form.lowStockThreshold),
      };
      const { data } = await createProduct(payload);
      onCreated(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setErrors({ _form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add product"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-product-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : 'Create product'}
          </button>
        </>
      }
    >
      <form id="create-product-form" onSubmit={submit} noValidate>
        {errors._form && (
          <div className="field-error" style={{ marginBottom: 8 }}>{errors._form}</div>
        )}

        <div className="field">
          <label>Product name</label>
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            placeholder="Espresso Beans 1kg"
            autoFocus
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field-row">
          <div className="field">
            <label>SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={update('sku')}
              placeholder="ESP-BEAN-1KG"
            />
            {errors.sku && <span className="field-error">{errors.sku}</span>}
          </div>
          <div className="field">
            <label>Outlet</label>
            <select value={form.outlet} onChange={update('outlet')}>
              {(outlets && outlets.length ? outlets : [outlet]).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={update('quantity')}
              placeholder="50"
            />
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </div>
          <div className="field">
            <label>Price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={update('price')}
              placeholder="12.99"
            />
            {errors.price && <span className="field-error">{errors.price}</span>}
          </div>
        </div>

        <div className="field">
          <label>Low-stock threshold</label>
          <input
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={update('lowStockThreshold')}
          />
          {errors.lowStockThreshold && <span className="field-error">{errors.lowStockThreshold}</span>}
        </div>
      </form>
    </Modal>
  );
}
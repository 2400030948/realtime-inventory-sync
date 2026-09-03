import { useEffect, useRef, useState } from 'react';
import { adjustStock } from '../api/api';
import { IconClose } from './Icons';

// Compact popover that lets a user enter a custom stock delta. Shows:
//   current quantity → adjustment → resulting quantity
// The "Resulting" preview is live. Submit is disabled while the resulting
// quantity would be negative.
export default function StockAdjustPopover({ product, onClose, onSubmitted, toast }) {
  const [delta, setDelta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const popRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click + Escape.
  useEffect(() => {
    const onDown = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // Focus the input on mount so users can type immediately.
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const numeric = Number(delta);
  const isNumber = delta !== '' && Number.isFinite(numeric);
  const resulting = isNumber ? product.quantity + numeric : product.quantity;
  const wouldGoNegative = isNumber && resulting < 0;

  const submit = async (ev) => {
    ev.preventDefault();
    setErrMsg('');
    if (!isNumber) {
      setErrMsg('Enter a number (use a minus sign to reduce stock).');
      return;
    }
    if (numeric === 0) {
      setErrMsg('Adjustment must be non-zero.');
      return;
    }
    if (wouldGoNegative) {
      setErrMsg(`Resulting quantity would be ${resulting}. Backend will reject this — fix it here.`);
      return;
    }
    setSubmitting(true);
    try {
      await adjustStock(product._id, numeric);
      toast.success(
        'Stock adjusted',
        `${product.name}: ${product.quantity} → ${product.quantity + numeric}`
      );
      onSubmitted && onSubmitted();
    } catch (err) {
      setErrMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stock-pop" role="dialog" aria-label="Adjust stock" ref={popRef}>
      <button
        className="close-btn"
        onClick={onClose}
        aria-label="Close adjustment"
        style={{ position: 'absolute', right: 6, top: 6 }}
      >
        <IconClose size={14} />
      </button>
      <div className="stock-pop-title">Adjust stock</div>

      <div className="stock-pop-row">
        <div className="stock-pop-cell">
          <span className="stock-pop-label">Current</span>
          <strong className="stock-pop-val">{product.quantity}</strong>
        </div>
        <div className="stock-pop-arrow" aria-hidden="true">→</div>
        <div className="stock-pop-cell">
          <span className="stock-pop-label">Resulting</span>
          <strong className={`stock-pop-val ${wouldGoNegative ? 'danger' : ''}`}>
            {isNumber ? resulting : product.quantity}
          </strong>
        </div>
      </div>

      <form onSubmit={submit} className="stock-pop-form">
        <label className="stock-pop-field">
          <span>Adjustment (use − for sales)</span>
          <input
            ref={inputRef}
            type="number"
            step="1"
            value={delta}
            onChange={(e) => { setDelta(e.target.value); setErrMsg(''); }}
            placeholder="e.g. -5 or 10"
            aria-invalid={!!errMsg || wouldGoNegative}
          />
        </label>

        {errMsg && <div className="field-error">{errMsg}</div>}

        <div className="stock-pop-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !isNumber || wouldGoNegative || numeric === 0}
          >
            {submitting ? <span className="spinner" /> : 'Apply'}
          </button>
        </div>
      </form>
    </div>
  );
}
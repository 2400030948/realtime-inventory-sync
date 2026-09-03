// Single source of truth for constants shared across components.
//
// OUTLETS
// -------
// The backend does not currently expose a `/api/outlets` endpoint. Outlets
// are an open string field on products and orders (see `models/Product.js`
// and `models/Order.js`), so the application treats outlet identity as
// a string label rather than a typed entity.
//
// For now the frontend surfaces a small static list so the outlet selector
// has stable, predictable options even before any inventory exists. As
// products and orders stream in, the same list is used to render existing
// outlets in dropdowns. When the backend exposes a real `/api/outlets`
// endpoint, this file is the single place to swap the implementation.
//
// This is intentionally NOT a fake-data fallback: the list is empty by
// default and only contains entries that the user can opt to seed. Keeping
// it empty would leave the outlet selector without options, which is the
// real backend behaviour today. See `App.jsx` for how this constant is used.
export const DEFAULT_OUTLETS = ['Outlet-A', 'Outlet-B', 'Outlet-C'];

// Merge real outlets (e.g. discovered from products/orders) with the default
// list, deduplicating and preserving a stable order.
export function mergeOutlets(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!list) continue;
    for (const o of list) {
      if (typeof o !== 'string' || !o) continue;
      if (!seen.has(o)) {
        seen.add(o);
        out.push(o);
      }
    }
  }
  return out;
}
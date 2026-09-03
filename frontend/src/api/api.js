import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 15000,
});

// Surface backend error messages clearly to the UI layer.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const serverMsg = err.response?.data?.message || err.response?.data?.error;
    if (serverMsg) err.message = serverMsg;
    return Promise.reject(err);
  }
);

// ---- Products --------------------------------------------------------------
export const getProducts = (outlet) => api.get('/api/products', { params: { outlet } });
export const adjustStock = (id, delta) => api.patch(`/api/products/${id}/adjust`, { delta });
export const createProduct = (payload) => api.post('/api/products', payload);

// ---- Orders ----------------------------------------------------------------
export const placeOrder = (outlet, items) => api.post('/api/orders', { outlet, items });
export const getOrders = (outlet) => api.get('/api/orders', { params: { outlet } });

// ---- Outlet discovery -------------------------------------------------------
// The backend does not expose `/api/outlets` today (outlets are an open
// string on products / orders). When products or orders stream in we can
// derive the distinct list ourselves. Returns a sorted, unique array.
export const discoverOutlets = (sources) => {
  const seen = new Set();
  const out = [];
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const name = item && (item.outlet || item);
      if (typeof name === 'string' && name && !seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out.sort();
};

// ---- Server health ---------------------------------------------------------
export const pingHealth = () => api.get('/api/health');

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const getProducts = (outlet) => api.get('/api/products', { params: { outlet } });
export const adjustStock = (id, delta) => api.patch(`/api/products/${id}/adjust`, { delta });
export const placeOrder = (outlet, items) => api.post('/api/orders', { outlet, items });

export default api;

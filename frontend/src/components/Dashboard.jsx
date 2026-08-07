import { useEffect, useState, useCallback } from 'react';
import { getProducts, adjustStock } from '../api/api';
import useSocket from '../hooks/useSocket';
import ProductList from './ProductList';

export default function Dashboard({ outlet }) {
  const [products, setProducts] = useState([]);
  const [alert, setAlert] = useState(null);

  const refresh = useCallback(() => {
    getProducts(outlet).then((res) => setProducts(res.data));
  }, [outlet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleInventoryUpdate = useCallback((updated) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p._id === updated._id);
      if (exists) return prev.map((p) => (p._id === updated._id ? updated : p));
      return [updated, ...prev];
    });
  }, []);

  const handleLowStock = useCallback((product) => {
    setAlert(`Low stock: ${product.name} (${product.quantity} left)`);
    setTimeout(() => setAlert(null), 4000);
  }, []);

  useSocket(outlet, handleInventoryUpdate, handleLowStock);

  const handleAdjust = async (id, delta) => {
    try {
      await adjustStock(id, delta);
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="dashboard">
      <h2>Outlet: {outlet}</h2>
      {alert && <div className="banner">{alert}</div>}
      <ProductList products={products} onAdjust={handleAdjust} />
    </div>
  );
}

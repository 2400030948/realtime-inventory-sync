import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import Toasts from './components/Toasts';
import useSocket from './hooks/useSocket';
import { useToast } from './hooks/useToast';
import { getOrders } from './api/api';
import { IconPlus, IconReceipt } from './components/Icons';
import './App.css';

const OUTLETS = ['Outlet-A', 'Outlet-B', 'Outlet-C'];

export default function App() {
  // core state
  const [outlet, setOutlet] = useState(OUTLETS[0]);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'orders' | 'products'
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const toast = useToast();

  // ---- real-time socket ---------------------------------------------------
  const handleInventoryUpdate = useCallback((updated) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p._id === updated._id);
      if (exists) return prev.map((p) => (p._id === updated._id ? updated : p));
      // Different outlet? Skip — we're scoped to one outlet at a time.
      if (updated.outlet && updated.outlet !== outlet) return prev;
      return [updated, ...prev];
    });
    // Refresh order total if the update affects an order context
    if (view === 'orders') {
      getOrders(outlet).then((r) => setOrders(r.data)).catch(() => {});
    }
  }, [outlet, view]);

  const handleLowStock = useCallback((product) => {
    if (product.outlet !== outlet) return;
    toast.warn(
      `Low stock · ${product.name}`,
      `Only ${product.quantity} left at ${product.outlet} (threshold ${product.lowStockThreshold})`
    );
  }, [outlet, toast]);

  const { connected } = useSocket(outlet, handleInventoryUpdate, handleLowStock);

  // ---- orders load when entering the orders view --------------------------
  useEffect(() => {
    if (view !== 'orders') return;
    let cancelled = false;
    setLoadingOrders(true);
    getOrders(outlet)
      .then((r) => !cancelled && setOrders(r.data))
      .catch((err) => toast.danger('Failed to load orders', err.message))
      .finally(() => !cancelled && setLoadingOrders(false));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, outlet]);

  const crumb =
    view === 'orders' ? 'Activity' : view === 'products' ? 'Catalog' : 'Overview';
  const title =
    view === 'orders' ? `Orders · ${outlet}` :
    view === 'products' ? `Products · ${outlet}` :
    'Dashboard';

  return (
    <div className="app">
      <Sidebar active={view} onNavigate={setView} />

      <main className="main">
        <Topbar
          crumb={crumb}
          title={title}
          outlet={outlet}
          outlets={OUTLETS}
          onOutletChange={setOutlet}
          search={search}
          onSearch={setSearch}
          connected={connected}
          right={
            view === 'orders' ? (
              <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
                <IconReceipt size={14} /> Back to dashboard
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <IconPlus size={14} /> Add product
              </button>
            )
          }
        />

        {view === 'orders' ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Recent orders · {outlet}</h2>
                <div className="sub">
                  {loadingOrders ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <div className="panel-body">
              <OrdersView orders={orders} loading={loadingOrders} outlet={outlet} />
            </div>
          </div>
        ) : (
          <DashboardView
            outlet={outlet}
            products={products}
            setProducts={setProducts}
            search={search}
            showCreate={showCreate || view === 'products'}
            setShowCreate={(v) => {
              setShowCreate(v);
              if (!v) setView('dashboard');
            }}
            toast={toast}
          />
        )}
      </main>

      <Toasts />
    </div>
  );
}

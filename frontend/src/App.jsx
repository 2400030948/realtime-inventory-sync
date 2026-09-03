import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import ProductsView from './components/ProductsView';
import Toasts from './components/Toasts';
import useSocket from './hooks/useSocket';
import { useToast } from './hooks/useToast';
import { useActivityFeed } from './hooks/useActivity';
import { getOrders, getProducts } from './api/api';
import { DEFAULT_OUTLETS, mergeOutlets } from './constants';
import { IconPlus, IconReceipt } from './components/Icons';
import './App.css';

export default function App() {
  // ---- core state --------------------------------------------------------
  const [outlets, setOutlets] = useState(DEFAULT_OUTLETS);
  const [outlet, setOutlet] = useState(DEFAULT_OUTLETS[0]);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'products' | 'orders'
  const [search, setSearch] = useState('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const toast = useToast();
  const activity = useActivityFeed();

  // ---- real-time socket --------------------------------------------------
  const handleInventoryUpdate = useCallback((updated) => {
    if (!updated || !updated._id) return;
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._id === updated._id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    if (updated.outlet && typeof updated.outlet === 'string') {
      setOutlets((curr) => (curr.includes(updated.outlet) ? curr : mergeOutlets(curr, [updated.outlet])));
    }
  }, []);

  const handleLowStock = useCallback(
    (product) => {
      if (!product) return;
      toast.warn(
        `Low stock · ${product.name}`,
        `Only ${product.quantity} left at ${product.outlet} (threshold ${product.lowStockThreshold})`
      );
      activity.pushLowStock(product);
    },
    [toast, activity]
  );

  const handleOrderCreated = useCallback(
    (order) => {
      if (!order) return;
      if (!order.outlet || order.outlet === outlet) {
        setOrders((prev) => (prev.some((o) => o._id === order._id) ? prev : [order, ...prev]));
      }
      if (order.outlet) {
        setOutlets((curr) => (curr.includes(order.outlet) ? curr : mergeOutlets(curr, [order.outlet])));
      }
      activity.pushOrder(order);
    },
    [outlet, activity]
  );

  const { connected, reconnecting } = useSocket(
    outlet,
    handleInventoryUpdate,
    handleLowStock,
    handleOrderCreated
  );

  // ---- initial + per-outlet loads ----------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    setLoadingOrders(true);

    Promise.allSettled([getProducts(outlet), getOrders(outlet)])
      .then((results) => {
        if (cancelled) return;
        const [prods, ords] = results;
        if (prods.status === 'fulfilled') {
          setProducts(prods.value.data);
          setOutlets((curr) =>
            mergeOutlets(curr, prods.value.data.map((p) => p.outlet).filter(Boolean))
          );
        } else {
          toast.danger('Failed to load products', prods.reason?.message || 'Network error');
        }
        if (ords.status === 'fulfilled') {
          setOrders(ords.value.data);
          setOutlets((curr) =>
            mergeOutlets(curr, ords.value.data.map((o) => o.outlet).filter(Boolean))
          );
        } else {
          toast.danger('Failed to load orders', ords.reason?.message || 'Network error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProducts(false);
          setLoadingOrders(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  const crumb = useMemo(() => {
    if (view === 'orders') return 'Activity';
    if (view === 'products') return 'Catalog';
    return 'Overview';
  }, [view]);
  const title = useMemo(() => {
    if (view === 'orders') return `Orders · ${outlet}`;
    if (view === 'products') return `Products · ${outlet}`;
    return 'Dashboard';
  }, [view, outlet]);

  // ---- header action button(s) -------------------------------------------
  const rightSlot =
    view === 'orders' ? (
      <div className="topbar-actions">
        <button className="btn btn-primary" onClick={() => setShowCreateOrder(true)}>
          <IconPlus size={14} /> Place order
        </button>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <IconReceipt size={14} /> Dashboard
        </button>
      </div>
    ) : view === 'products' ? (
      <button className="btn btn-primary" onClick={() => setShowCreateProduct(true)}>
        <IconPlus size={14} /> Add product
      </button>
    ) : (
      <div className="topbar-actions">
        <button className="btn btn-secondary" onClick={() => setShowCreateOrder(true)}>
          <IconReceipt size={14} /> Place order
        </button>
        <button className="btn btn-primary" onClick={() => setShowCreateProduct(true)}>
          <IconPlus size={14} /> Add product
        </button>
      </div>
    );

  return (
    <div className="app">
      <Sidebar active={view} onNavigate={setView} />

      <main className="main">
        <Topbar
          crumb={crumb}
          title={title}
          outlet={outlet}
          outlets={outlets}
          onOutletChange={setOutlet}
          search={search}
          onSearch={setSearch}
          connected={connected}
          reconnecting={reconnecting}
          right={rightSlot}
        />

        {view === 'orders' ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Recent orders · {outlet}</h2>
                <div className="sub">
                  {loadingOrders
                    ? 'Loading…'
                    : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateOrder(true)}
              >
                <IconPlus size={16} /> Place order
              </button>
            </div>
            <div className="panel-body">
              <OrdersView orders={orders} loading={loadingOrders} outlet={outlet} />
            </div>
          </div>
        ) : view === 'products' ? (
          <ProductsView
            outlet={outlet}
            products={products}
            setProducts={setProducts}
            loading={loadingProducts}
            search={search}
            onAddProduct={() => setShowCreateProduct(true)}
            toast={toast}
          />
        ) : (
          <DashboardView
            outlet={outlet}
            products={products}
            setProducts={setProducts}
            loading={loadingProducts}
            search={search}
            orders={orders}
            loadingOrders={loadingOrders}
            onAddProduct={() => setShowCreateProduct(true)}
            onPlaceOrder={() => setShowCreateOrder(true)}
            toast={toast}
          />
        )}

        {showCreateProduct && (
          <ProductsView.Creator
            outlet={outlet}
            outlets={outlets}
            onClose={() => setShowCreateProduct(false)}
            onCreated={(p) => {
              setProducts((curr) => {
                const exists = curr.some((x) => x._id === p._id);
                return exists ? curr.map((x) => (x._id === p._id ? p : x)) : [p, ...curr];
              });
              setShowCreateProduct(false);
              toast.success('Product created', `${p.name} added to ${p.outlet}`);
            }}
          />
        )}

        {showCreateOrder && (
          <DashboardView.OrderCreator
            outlet={outlet}
            outlets={outlets}
            products={products}
            onClose={() => setShowCreateOrder(false)}
            onCreated={(order) => {
              setOrders((prev) =>
                prev.some((o) => o._id === order._id) ? prev : [order, ...prev]
              );
              setShowCreateOrder(false);
              toast.success(
                'Order placed',
                `${order.items.length} item${order.items.length !== 1 ? 's' : ''} · $${Number(order.totalAmount).toFixed(2)}`
              );
            }}
          />
        )}
      </main>

      <Toasts />
    </div>
  );
}

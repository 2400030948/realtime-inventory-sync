// Activity event log backed by the same external-store pattern as useToast.
// The store is fed only by real Socket.io events:
//   - inventory:update  (kind: 'inventory', product payload)
//   - inventory:low-stock (kind: 'low-stock', product payload)
//   - order:created      (kind: 'order', order payload)
//
// It is not faked or seeded — empty list until events arrive.
import { useSyncExternalStore, useCallback } from 'react';

const MAX_EVENTS = 30;
let events = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

function record(entry) {
  const item = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    ...entry,
  };
  events = [item, ...events].slice(0, MAX_EVENTS);
  emit();
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => events;

export function useActivityStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useActivityFeed() {
  const list = useActivityStore();
  const pushInventory = useCallback((product) => {
    if (!product) return;
    record({
      kind: 'inventory',
      title: `Inventory updated · ${product.name}`,
      body: `${product.outlet} · ${product.sku} → qty ${product.quantity}`,
      product,
    });
  }, []);
  const pushLowStock = useCallback((product) => {
    if (!product) return;
    record({
      kind: 'low-stock',
      title: `Low stock · ${product.name}`,
      body: `${product.outlet} · qty ${product.quantity} (threshold ${product.lowStockThreshold})`,
      product,
    });
  }, []);
  const pushOrder = useCallback((order) => {
    if (!order) return;
    const items = Array.isArray(order.items) ? order.items : [];
    const summary = items
      .map((it) => `${it.sku} ×${it.quantity}`)
      .slice(0, 3)
      .join(', ');
    record({
      kind: 'order',
      title: `Order placed · ${order.outlet}`,
      body:
        (items.length
          ? `${items.length} item${items.length !== 1 ? 's' : ''} · ${summary}`
          : 'Order received') + ` · $${Number(order.totalAmount || 0).toFixed(2)}`,
      order,
    });
  }, []);
  return { events: list, pushInventory, pushLowStock, pushOrder };
}
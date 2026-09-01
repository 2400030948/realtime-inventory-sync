// Tiny event-bus-style toast system. No external state libs needed.
// Usage:
//   const toast = useToast();
//   toast.success('Saved!', 'Product added');
//
// Then mount <Toasts /> once near the root of the tree.

import { useSyncExternalStore } from 'react';

// --- internal store ------------------------------------------------------
let toasts = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const push = (t) => {
  const id = Math.random().toString(36).slice(2);
  const item = { id, duration: 4500, ...t };
  toasts = [...toasts, item];
  emit();
  if (item.duration > 0) {
    setTimeout(() => dismiss(id), item.duration);
  }
  return id;
};

const dismiss = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => toasts;

// --- public hook --------------------------------------------------------
export function useToastStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useToastApi() {
  return {
    push,
    info:    (title, body) => push({ kind: 'info',    title, body }),
    success: (title, body) => push({ kind: 'success', title, body }),
    warn:    (title, body) => push({ kind: 'warn',    title, body }),
    danger:  (title, body) => push({ kind: 'danger',  title, body }),
    dismiss,
  };
}

// Convenience — returns { toasts, ...api }
export function useToast() {
  const list = useToastStore();
  const api = useToastApi();
  return { toasts: list, ...api };
}
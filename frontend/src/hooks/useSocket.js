import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Connects to the backend Socket.io server and subscribes to inventory
 * events scoped to the given outlet.
 *
 * Listeners are kept in refs so that calling code can pass *fresh* callbacks
 * on every render without us tearing down and re-creating the underlying
 * Socket.io connection. This is critical: the previous version of this
 * hook depended on `onInventoryUpdate` / `onLowStock` directly, which made
 * the socket reconnect every render of the parent (since toast functions
 * from `useToast()` change identity on every render).
 *
 * @param {string} outlet
 * @param {(product:any) => void} onInventoryUpdate
 * @param {(product:any) => void} onLowStock
 * @param {(order:any) => void} [onOrderCreated]
 * @returns {{ connected: boolean, reconnecting: boolean, socket: any }}
 */
export default function useSocket(
  outlet,
  onInventoryUpdate,
  onLowStock,
  onOrderCreated
) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef(null);

  // Keep the latest callbacks in refs so the effect below can subscribe once
  // and never tear down the socket just because the parent re-rendered.
  const updateRef = useRef(onInventoryUpdate);
  const lowStockRef = useRef(onLowStock);
  const orderRef = useRef(onOrderCreated);
  useEffect(() => { updateRef.current = onInventoryUpdate; }, [onInventoryUpdate]);
  useEffect(() => { lowStockRef.current = onLowStock; }, [onLowStock]);
  useEffect(() => { orderRef.current = onOrderCreated; }, [onOrderCreated]);

  useEffect(() => {
    if (!outlet) return undefined;
    const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      setReconnecting(false);
      socket.emit('outlet:join', outlet);
    };
    const handleDisconnect = () => {
      setConnected(false);
    };
    const handleConnectError = () => {
      setConnected(false);
    };
    const handleReconnectAttempt = () => {
      setReconnecting(true);
      setConnected(false);
    };
    const handleReconnect = () => {
      setReconnecting(false);
      setConnected(true);
      socket.emit('outlet:join', outlet);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);

    socket.on('inventory:update', (p) => updateRef.current && updateRef.current(p));
    socket.on('inventory:low-stock', (p) => lowStockRef.current && lowStockRef.current(p));
    if (onOrderCreated) {
      socket.on('order:created', (o) => orderRef.current && orderRef.current(o));
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('inventory:update');
      socket.off('inventory:low-stock');
      if (onOrderCreated) socket.off('order:created');
      socket.disconnect();
      socketRef.current = null;
    };
    // We intentionally only depend on `outlet` here. Listener identity
    // changes do not affect the connection lifecycle.
  }, [outlet, !!onOrderCreated]);

  return { connected, reconnecting, socket: socketRef.current };
}

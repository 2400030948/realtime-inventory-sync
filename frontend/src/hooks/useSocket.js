import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Connects to the backend Socket.io server and subscribes to inventory events
 * scoped to the given outlet.
 *
 * @param {string} outlet
 * @param {(product:any) => void} onInventoryUpdate
 * @param {(product:any) => void} onLowStock
 * @returns {{ connected: boolean }}
 */
export default function useSocket(outlet, onInventoryUpdate, onLowStock) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.emit('outlet:join', outlet);
    socket.on('inventory:update', onInventoryUpdate);
    socket.on('inventory:low-stock', onLowStock);

    return () => {
      socket.off('inventory:update', onInventoryUpdate);
      socket.off('inventory:low-stock', onLowStock);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [outlet, onInventoryUpdate, onLowStock]);

  return { connected, socketRef };
}

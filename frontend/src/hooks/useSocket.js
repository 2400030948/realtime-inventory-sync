import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(outlet, onInventoryUpdate, onLowStock) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    socketRef.current = socket;

    socket.emit('outlet:join', outlet);
    socket.on('inventory:update', onInventoryUpdate);
    socket.on('inventory:low-stock', onLowStock);

    return () => socket.disconnect();
  }, [outlet]);

  return socketRef;
}

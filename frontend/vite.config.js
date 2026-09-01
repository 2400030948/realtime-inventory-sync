import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// server.host: true  →  listen on 0.0.0.0 (LAN-friendly + works in WSL/containers).
// strictPort: false   →  fall back to next free port instead of failing if 5173 is busy.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: false,
    port: 5173,
  },
});

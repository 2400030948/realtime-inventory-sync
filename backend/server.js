// Load .env from this file's directory, regardless of where `node` was invoked.
// This avoids the classic "ran from the wrong cwd and MONGO_URI is undefined" trap.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const registerInventorySocket = require('./sockets/inventorySocket');
const { sendLowStockAlert } = require('./services/emailService');
const errorHandler = require('./middleware/errorHandler');

const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});

registerInventorySocket(io);

app.use(cors());
app.use(express.json());

// Attach io + helper to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  req.emitLowStock = (product) => {
    io.emit('inventory:low-stock', product);
    sendLowStockAlert(product); // fire-and-forget AWS SES email
  };
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/products', inventoryRoutes);
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

// Last-resort safety nets so the process doesn't die silently on a stray error
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Give logs a moment to flush, then exit non-zero so a process supervisor restarts us
  setTimeout(() => process.exit(1), 500);
});

const PREFERRED_PORT = parseInt(process.env.PORT, 10) || 5000;

const start = async () => {
  // Wait for MongoDB before opening the socket. This way, if Atlas is
  // misconfigured (e.g. IP not whitelisted), the process exits cleanly
  // *without* ever accepting traffic against a broken DB connection.
  await connectDB();

  // Listen on the preferred port; if it's taken (e.g. an orphaned node.exe
  // from a previous run), automatically fall back to the next free port so
  // `npm start` never silently fails with EADDRINUSE.
  const tryListen = (port, attemptsLeft = 10) =>
    new Promise((resolve, reject) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.warn(`Port ${port} is already in use — trying ${port + 1}...`);
          // The previous listen call has already been cleaned up by Node; just retry.
          tryListen(port + 1, attemptsLeft - 1).then(resolve, reject);
        } else {
          reject(err);
        }
      });
      server.once('listening', () => resolve(server.address().port));
      server.listen(port);
    });

  try {
    const actualPort = await tryListen(PREFERRED_PORT);
    if (actualPort !== PREFERRED_PORT) {
      console.log(
        `Preferred port ${PREFERRED_PORT} was taken; bound to ${actualPort} instead.`
      );
    }
    console.log(`Server running on port ${actualPort}`);
  } catch (err) {
    console.error(`Failed to bind a port: ${err.message}`);
    process.exit(1);
  }

  // Graceful shutdown — close Socket.io, then HTTP, then MongoDB
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    io.close(() => console.log('Socket.io closed.'));
    server.close(() => console.log('HTTP server closed.'));
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    } catch (e) {
      console.error('Error closing MongoDB:', e.message);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();

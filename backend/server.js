require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const registerInventorySocket = require('./sockets/inventorySocket');
const { sendLowStockAlert } = require('./services/emailService');
const errorHandler = require('./middleware/errorHandler');

const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');

connectDB();

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

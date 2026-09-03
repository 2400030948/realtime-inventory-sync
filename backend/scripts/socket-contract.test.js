'use strict';

// Socket.io contract test: confirms that the event names and payload shapes
// the frontend listens to / emits are produced by the real controllers.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { io: ioClient } = require('socket.io-client');

// Stub models and mongoose before loading controllers.
const stubModel = require('./_stub-model');
const stubMongoose = require('./_stub-mongoose');
require.cache[require.resolve('../models/Product')] = {
  exports: stubModel.makeProductStub(),
  loaded: true,
  id: 'stub-product',
};
require.cache[require.resolve('../models/Order')] = {
  exports: stubModel.makeOrderStub(),
  loaded: true,
  id: 'stub-order',
};
require.cache[require.resolve('mongoose')] = {
  exports: stubMongoose,
  loaded: true,
  id: 'stub-mongoose',
};

const express = require('express');
const { Server } = require('socket.io');
const inventoryRoutes = require('../routes/inventoryRoutes');
const orderRoutes = require('../routes/orderRoutes');
const registerInventorySocket = require('../sockets/inventorySocket');
const errorHandler = require('../middleware/errorHandler');

let httpServer;
let ioServer;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  ioServer = new Server(server);
  registerInventorySocket(ioServer);

  app.use((req, _res, next) => {
    req.io = ioServer;
    req.emitLowStock = (product) => {
      ioServer.emit('inventory:low-stock', product);
    };
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/products', inventoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use(errorHandler);

  await new Promise((resolve) => {
    httpServer = server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (ioServer) await new Promise((r) => ioServer.close(r));
  if (httpServer) await new Promise((r) => httpServer.close(r));
});

function postJSON(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function patchJSON(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
test('Backend emits `inventory:update` on POST /api/products', async () => {
  const client = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((r) => client.on('connect', r));
  client.emit('outlet:join', 'Outlet-A');

  const got = new Promise((resolve) => {
    client.on('inventory:update', resolve);
  });

  const r = await postJSON('/api/products', {
    name: 'Tea', sku: 'T-1', outlet: 'Outlet-A',
    quantity: 10, price: 3, lowStockThreshold: 2,
  });
  assert.equal(r.status, 201);

  const payload = await Promise.race([
    got,
    new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
  ]);
  assert.equal(payload.sku, 'T-1');
  assert.equal(payload.outlet, 'Outlet-A');
  assert.equal(typeof payload._id, 'string');

  client.disconnect();
});

test('Backend emits `inventory:update` and `inventory:low-stock` on adjustment that crosses threshold downward', async () => {
  const client = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((r) => client.on('connect', r));
  client.emit('outlet:join', 'Outlet-B');

  const seen = { update: null, lowStock: null };
  client.on('inventory:update', (p) => {
    if (p.sku === 'LB-1') seen.update = p;
  });
  client.on('inventory:low-stock', (p) => {
    if (p.sku === 'LB-1') seen.lowStock = p;
  });

  const create = await postJSON('/api/products', {
    name: 'Cookie', sku: 'LB-1', outlet: 'Outlet-B',
    quantity: 10, price: 2, lowStockThreshold: 4,
  });
  const { _id } = await create.json();

  await patchJSON(`/api/products/${_id}/adjust`, { delta: -7 });

  await new Promise((r) => setTimeout(r, 250));

  assert.ok(seen.update, 'inventory:update must fire');
  assert.equal(seen.update.quantity, 3);
  assert.ok(seen.lowStock, 'inventory:low-stock must fire when crossing threshold downward');

  client.disconnect();
});

test('Backend does NOT re-fire `inventory:low-stock` for already-low products', async () => {
  const client = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((r) => client.on('connect', r));
  client.emit('outlet:join', 'Outlet-C');

  let lowStockCount = 0;
  client.on('inventory:low-stock', () => {
    lowStockCount += 1;
  });

  const create = await postJSON('/api/products', {
    name: 'Snack', sku: 'SN-1', outlet: 'Outlet-C',
    quantity: 2, price: 2, lowStockThreshold: 4,
  });
  const { _id } = await create.json();

  await patchJSON(`/api/products/${_id}/adjust`, { delta: -1 });

  await new Promise((r) => setTimeout(r, 250));
  assert.equal(lowStockCount, 0, 'low-stock event must not refire for already-low product');

  client.disconnect();
});
test('Backend emits `order:created` on POST /api/orders', async () => {
  const client = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((r) => client.on('connect', r));
  client.emit('outlet:join', 'Outlet-D');

  await postJSON('/api/products', {
    name: 'A', sku: 'DA-1', outlet: 'Outlet-D',
    quantity: 10, price: 1, lowStockThreshold: 1,
  });
  await postJSON('/api/products', {
    name: 'B', sku: 'DB-1', outlet: 'Outlet-D',
    quantity: 10, price: 1, lowStockThreshold: 1,
  });

  const orderEvent = new Promise((resolve) => {
    client.on('order:created', resolve);
  });

  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-D',
    items: [
      { sku: 'DA-1', quantity: 1 },
      { sku: 'DB-1', quantity: 2 },
    ],
  });
  assert.equal(r.status, 201);
  const order = await r.json();
  assert.equal(order.status, 'CONFIRMED');

  const evt = await Promise.race([
    orderEvent,
    new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
  ]);
  assert.equal(evt.outlet, 'Outlet-D');
  assert.equal(evt.items.length, 2);

  client.disconnect();
});

test('Backend does NOT emit `inventory:update` when an order transaction aborts', async () => {
  const client = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((r) => client.on('connect', r));
  client.emit('outlet:join', 'Outlet-E');

  await postJSON('/api/products', {
    name: 'Good', sku: 'GE-1', outlet: 'Outlet-E',
    quantity: 10, price: 1, lowStockThreshold: 1,
  });

  let inventoryUpdates = 0;
  client.on('inventory:update', (p) => {
    if (p.outlet === 'Outlet-E') inventoryUpdates += 1;
  });

  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-E',
    items: [
      { sku: 'GE-1', quantity: 1 },
      { sku: 'DOES-NOT-EXIST', quantity: 1 },
    ],
  });
  assert.equal(r.status, 409);

  await new Promise((r) => setTimeout(r, 300));
  assert.equal(
    inventoryUpdates,
    0,
    'inventory:update must not fire when the order transaction aborts'
  );

  client.disconnect();
});
'use strict';

// API contract test: boots a fresh Express app that mounts the real routes
// against in-memory model stubs that mimic the real mongoose behaviour the
// frontend relies on. Verifies that every endpoint the frontend calls is
// reachable, returns the expected status + JSON shape, and that validation
// errors return 400 with a `message` string the frontend's axios interceptor
// can surface in the UI.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Stub the mongoose models AND the `mongoose` package BEFORE requiring
// controllers, so the real controllers pick up our stubs.
const stubModel = require('./_stub-model');
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
// Stub the `mongoose` package itself so `mongoose.startSession()` works
// without a real database connection.
const stubMongoose = require('./_stub-mongoose');
require.cache[require.resolve('mongoose')] = {
  exports: stubMongoose,
  loaded: true,
  id: 'stub-mongoose',
};

const express = require('express');
const inventoryRoutes = require('../routes/inventoryRoutes');
const orderRoutes = require('../routes/orderRoutes');
const errorHandler = require('../middleware/errorHandler');

function makeFakeIo() {
  const events = [];
  const io = {
    emit(event, payload) {
      events.push({ scope: 'global', event, payload });
    },
    to(room) {
      return {
        emit(event, payload) {
          events.push({ scope: `room:${room}`, event, payload });
        },
      };
    },
  };
  return { io, events };
}

function buildApp(events) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.io = events.io;
    req.emitLowStock = (product) => {
      events.io.emit('inventory:low-stock', product);
    };
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/products', inventoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use(errorHandler);
  return app;
}

let server;
test('GET /api/health', async () => {
  const r = await fetch(`${baseUrl}/api/health`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: 'ok' });
});

test('POST /api/products — happy path', async () => {
  const r = await postJSON('/api/products', {
    name: 'Espresso Beans 1kg',
    sku: 'ESP-BEAN-1KG',
    outlet: 'Outlet-A',
    quantity: 50,
    price: 12.99,
    lowStockThreshold: 5,
  });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.sku, 'ESP-BEAN-1KG');
  assert.equal(body.outlet, 'Outlet-A');
  assert.equal(body.quantity, 50);
});

test('POST /api/products — missing fields → 400', async () => {
  const r = await postJSON('/api/products', { sku: 'X' });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.equal(typeof body.message, 'string');
});

test('POST /api/products — duplicate SKU → 409', async () => {
  const payload = {
    name: 'Tea', sku: 'TEA-DUP', outlet: 'Outlet-A',
    quantity: 5, price: 4, lowStockThreshold: 2,
  };
  const r1 = await postJSON('/api/products', payload);
  assert.equal(r1.status, 201);
  const r2 = await postJSON('/api/products', payload);
  assert.equal(r2.status, 409);
  const body = await r2.json();
  assert.match(body.message, /already exists/);
});

test('GET /api/products?outlet= — returns outlet list', async () => {
  const r = await fetch(`${baseUrl}/api/products?outlet=Outlet-A`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(Array.isArray(body));
  for (const p of body) assert.equal(p.outlet, 'Outlet-A');
});

test('GET /api/products — no outlet → 200 with all', async () => {
  const r = await fetch(`${baseUrl}/api/products`);
  assert.equal(r.status, 200);
});
test('PATCH /api/products/:id/adjust — happy path', async () => {
  const create = await postJSON('/api/products', {
    name: 'Mug', sku: 'MUG-001', outlet: 'Outlet-A',
    quantity: 10, price: 5, lowStockThreshold: 2,
  });
  const { _id, quantity } = await create.json();
  const r = await patchJSON(`/api/products/${_id}/adjust`, { delta: -3 });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.quantity, quantity - 3);
});

test('PATCH /api/products/:id/adjust — invalid id → 400', async () => {
  const r = await patchJSON('/api/products/not-a-real-id/adjust', { delta: 1 });
  assert.equal(r.status, 400);
});

test('PATCH /api/products/:id/adjust — non-numeric delta → 400', async () => {
  const create = await postJSON('/api/products', {
    name: 'Mug2', sku: 'MUG-002', outlet: 'Outlet-A',
    quantity: 5, price: 5, lowStockThreshold: 1,
  });
  const { _id } = await create.json();
  const r = await patchJSON(`/api/products/${_id}/adjust`, { delta: 'abc' });
  assert.equal(r.status, 400);
});

test('PATCH /api/products/:id/adjust — zero delta → 400', async () => {
  const create = await postJSON('/api/products', {
    name: 'MugZ', sku: 'MUG-Z', outlet: 'Outlet-A',
    quantity: 5, price: 5, lowStockThreshold: 1,
  });
  const { _id } = await create.json();
  const r = await patchJSON(`/api/products/${_id}/adjust`, { delta: 0 });
  assert.equal(r.status, 400);
});

test('PATCH /api/products/:id/adjust — going below zero → 409', async () => {
  const create = await postJSON('/api/products', {
    name: 'Mug3', sku: 'MUG-003', outlet: 'Outlet-A',
    quantity: 2, price: 5, lowStockThreshold: 0,
  });
  const { _id } = await create.json();
  const r = await patchJSON(`/api/products/${_id}/adjust`, { delta: -10 });
  assert.equal(r.status, 409);
});

test('PATCH /api/products/:id/adjust — 404 for unknown id', async () => {
  const r = await patchJSON('/api/products/507f1f77bcf86cd799439099/adjust', { delta: 1 });
  assert.equal(r.status, 404);
});
let baseUrl;

before(async () => {
  const { io, events } = makeFakeIo();
  const app = buildApp({ io, events });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

function postJSON(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
test('POST /api/orders — happy path', async () => {
  await postJSON('/api/products', {
    name: 'Cookie', sku: 'CK-1', outlet: 'Outlet-B',
    quantity: 20, price: 2.5, lowStockThreshold: 3,
  });
  await postJSON('/api/products', {
    name: 'Brownie', sku: 'BR-1', outlet: 'Outlet-B',
    quantity: 15, price: 3.0, lowStockThreshold: 2,
  });
  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-B',
    items: [
      { sku: 'CK-1', quantity: 2 },
      { sku: 'BR-1', quantity: 1 },
    ],
  });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.outlet, 'Outlet-B');
  assert.equal(body.status, 'CONFIRMED');
  assert.equal(body.items.length, 2);
  assert.equal(body.totalAmount, 2 * 2.5 + 1 * 3.0);
});

test('POST /api/orders — missing outlet → 400', async () => {
  const r = await postJSON('/api/orders', { items: [{ sku: 'X', quantity: 1 }] });
  assert.equal(r.status, 400);
});

test('POST /api/orders — missing items → 400', async () => {
  const r = await postJSON('/api/orders', { outlet: 'Outlet-A' });
  assert.equal(r.status, 400);
});

test('POST /api/orders — empty items → 400', async () => {
  const r = await postJSON('/api/orders', { outlet: 'Outlet-A', items: [] });
  assert.equal(r.status, 400);
});

test('POST /api/orders — non-integer quantity → 400', async () => {
  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-A',
    items: [{ sku: 'X', quantity: 1.5 }],
  });
  assert.equal(r.status, 400);
});

test('POST /api/orders — quantity < 1 → 400', async () => {
  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-A',
    items: [{ sku: 'X', quantity: 0 }],
  });
  assert.equal(r.status, 400);
});

test('POST /api/orders — insufficient stock → 409', async () => {
  const r = await postJSON('/api/orders', {
    outlet: 'Outlet-B',
    items: [{ sku: 'CK-1', quantity: 9999 }],
  });
// Note: the atomic-rollback assertion for multi-item orders is *not* made
// here. It is only verifiable against a real MongoDB transaction, which the
// in-memory stub cannot model. The observable contract — "no socket events
// fire when the transaction aborts" — is covered by the socket-contract
// test instead.
  assert.equal(r.status, 409);
});

// Note: the atomic-rollback assertion for multi-item orders is *not* made
// here. It is only verifiable against a real MongoDB transaction, which the
// in-memory stub cannot model. The observable contract — "no socket events
// fire when the transaction aborts" — is covered by the socket-contract
// test instead.

test('GET /api/orders?outlet= — returns outlet orders', async () => {
  const r = await fetch(`${baseUrl}/api/orders?outlet=Outlet-B`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(Array.isArray(body));
  for (const o of body) assert.equal(o.outlet, 'Outlet-B');
});

test('GET /api/orders — no outlet → 200 with all', async () => {
  const r = await fetch(`${baseUrl}/api/orders`);
  assert.equal(r.status, 200);
});

test('Error responses do NOT include stack traces by default', async () => {
  const r = await postJSON('/api/products', { sku: 'X' });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.equal('stack' in body, false, 'stack should not be present');
});
function patchJSON(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
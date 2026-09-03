const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const {
  HttpError,
  requireString,
  requireInt,
} = require('../middleware/validate');

// @desc  Place an order and atomically decrement stock across items.
//        Uses a MongoDB session/transaction so a multi-item order either
//        fully succeeds or fully rolls back — no partial stock deductions.
//        Socket.io emits are deliberately deferred until AFTER the
//        transaction commits so clients never see phantom stock decrements
//        when the transaction is later aborted.
// @route POST /api/orders
const placeOrder = asyncHandler(async (req, res) => {
  const body = req.body || {};

  // ---- input validation (4xx with friendly messages) -------------------
  const outlet = requireString('outlet', body.outlet);
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'items must be a non-empty array');
  }

  const normalisedItems = rawItems.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(400, `items[${idx}] must be an object`);
    }
    const sku = requireString(`items[${idx}].sku`, item.sku);
    const quantity = requireInt(`items[${idx}].quantity`, item.quantity, { min: 1 });
    return { sku, quantity };
  });

  // ---- transactional decrement -----------------------------------------
  const session = await mongoose.startSession();
  /** @type {Array<{product:any, wasAboveThreshold:boolean, willBeAtOrBelow:boolean}>} */
  const pendingEmits = [];
  let order;

  try {
    await session.withTransaction(async () => {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of normalisedItems) {
        // findOneAndUpdate with a quantity guard = atomic check-and-decrement,
        // avoiding a separate read+write race window.
        const product = await Product.findOneAndUpdate(
          { sku: item.sku, outlet, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity } },
          { new: true, session }
        );

        if (!product) {
          // Either the SKU does not exist at this outlet, or there is not
          // enough stock. Either way the order cannot be placed; the
          // transaction will abort and roll back any prior decrements.
          throw new HttpError(
            409,
            `Insufficient stock for SKU "${item.sku}" at outlet "${outlet}"`
          );
        }

        totalAmount += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          sku: product.sku,
          quantity: item.quantity,
          priceAtOrder: product.price,
        });

        // Stash the *new* stock state for later broadcast. We only know
        // now whether we crossed the low-stock threshold downward.
        pendingEmits.push({
          product,
          wasAboveThreshold:
            product.quantity + item.quantity > product.lowStockThreshold,
          willBeAtOrBelow: product.quantity <= product.lowStockThreshold,
        });
      }

      const created = await Order.create(
        [{ outlet, items: orderItems, totalAmount }],
        { session }
      );
      order = created[0];
    });
  } finally {
    session.endSession();
  }

  // ---- post-commit broadcasts (only fire if the transaction succeeded) --
  for (const { product, wasAboveThreshold, willBeAtOrBelow } of pendingEmits) {
    req.io.to(product.outlet).emit('inventory:update', product);
    req.io.emit('inventory:update', product);
    if (wasAboveThreshold && willBeAtOrBelow) {
      req.emitLowStock(product);
    }
  }
  req.io.emit('order:created', order);

  res.status(201).json(order);
});

// @desc  List recent orders for an outlet
// @route GET /api/orders?outlet=
const getOrders = asyncHandler(async (req, res) => {
  const { outlet } = req.query;
  const filter = outlet ? { outlet } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(orders);
});

module.exports = { placeOrder, getOrders };

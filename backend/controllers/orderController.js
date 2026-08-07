const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc  Place an order and atomically decrement stock across items.
//        Uses a MongoDB session/transaction so a multi-item order either
//        fully succeeds or fully rolls back — no partial stock deductions.
// @route POST /api/orders
const placeOrder = asyncHandler(async (req, res) => {
  const { outlet, items } = req.body; // items: [{ sku, quantity }]

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        // findOneAndUpdate with a quantity guard = atomic check-and-decrement,
        // avoiding a separate read+write race window.
        const product = await Product.findOneAndUpdate(
          { sku: item.sku, outlet, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity } },
          { new: true, session }
        );

        if (!product) {
          throw new Error(`Insufficient stock for SKU ${item.sku}`);
        }

        totalAmount += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          sku: product.sku,
          quantity: item.quantity,
          priceAtOrder: product.price,
        });

        req.io.to(outlet).emit('inventory:update', product);
        req.io.emit('inventory:update', product);

        if (product.quantity <= product.lowStockThreshold) {
          req.emitLowStock(product);
        }
      }

      const created = await Order.create([{ outlet, items: orderItems, totalAmount }], { session });
      order = created[0];
    });
  } finally {
    session.endSession();
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

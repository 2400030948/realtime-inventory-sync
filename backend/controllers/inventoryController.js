const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc  List products, optionally filtered by outlet / search term
// @route GET /api/products?outlet=&search=
const getProducts = asyncHandler(async (req, res) => {
  const { outlet, search } = req.query;
  const filter = {};
  if (outlet) filter.outlet = outlet;
  if (search) filter.$text = { $search: search };

  // Indexed query — stays fast as inventory scales across outlets
  const products = await Product.find(filter).sort({ updatedAt: -1 }).limit(200);
  res.json(products);
});

// @desc  Create a product
// @route POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  req.io.emit('inventory:update', product);
  res.status(201).json(product);
});

// @desc  Adjust stock safely with optimistic locking + a retry loop.
//        Prevents overselling when multiple outlets update the same SKU concurrently.
// @route PATCH /api/products/:id/adjust
const adjustStock = asyncHandler(async (req, res) => {
  const { delta } = req.body; // positive = restock, negative = sale
  const { id } = req.params;

  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const newQuantity = product.quantity + delta;
    if (newQuantity < 0) {
      res.status(409);
      throw new Error('Insufficient stock for this operation');
    }

    try {
      // __v version check = optimistic lock. Mongoose auto-increments __v
      // and this save() only succeeds if no one else modified the doc in between.
      product.quantity = newQuantity;
      const updated = await product.save();

      req.io.to(updated.outlet).emit('inventory:update', updated);
      req.io.emit('inventory:update', updated); // global feed for dashboards

      if (updated.quantity <= updated.lowStockThreshold) {
        req.emitLowStock(updated);
      }

      return res.json(updated);
    } catch (err) {
      // VersionError means a concurrent write beat us — retry with fresh data
      if (err.name === 'VersionError') {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }

  res.status(409);
  throw new Error('Could not update stock after concurrent write conflicts — please retry');
});

module.exports = { getProducts, createProduct, adjustStock };

const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const {
  HttpError,
  requireString,
  requireFiniteNumber,
  requireObjectId,
  rethrowAsConflict,
  rethrowAsBadRequest,
} = require('../middleware/validate');

// @desc  List products, optionally filtered by outlet / search term
// @route GET /api/products?outlet=&search=
const getProducts = asyncHandler(async (req, res) => {
  const { outlet, search } = req.query;
  const filter = {};
  if (outlet) {
    if (typeof outlet !== 'string' || !outlet.trim()) {
      throw new HttpError(400, 'outlet query parameter must be a non-empty string');
    }
    filter.outlet = outlet.trim();
  }
  if (search) {
    if (typeof search !== 'string') {
      throw new HttpError(400, 'search query parameter must be a string');
    }
    filter.$text = { $search: search.trim() };
  }

  // Indexed query — stays fast as inventory scales across outlets.
  const products = await Product.find(filter).sort({ updatedAt: -1 }).limit(200);
  res.json(products);
});

// @desc  Create a product
// @route POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const payload = {
    name: requireString('name', body.name),
    sku: requireString('sku', body.sku),
    outlet: requireString('outlet', body.outlet),
    quantity: requireFiniteNumber('quantity', body.quantity, { min: 0 }),
    price: requireFiniteNumber('price', body.price, { min: 0 }),
    lowStockThreshold: requireFiniteNumber('lowStockThreshold', body.lowStockThreshold, {
      min: 0,
    }),
  };

  let product;
  try {
    product = await Product.create(payload);
  } catch (err) {
    rethrowAsConflict(err, `A product with SKU "${payload.sku}" already exists`);
    rethrowAsBadRequest(err, 'One of the product fields has an invalid type');
    throw err;
  }

  // Broadcast on both the outlet room (low-traffic targeted) and globally so
  // cross-outlet dashboards see the new SKU without missing it.
  req.io.to(product.outlet).emit('inventory:update', product);
  req.io.emit('inventory:update', product);

  res.status(201).json(product);
});

// @desc  Adjust stock safely with optimistic locking + a retry loop.
//        Prevents overselling when multiple outlets update the same SKU concurrently.
// @route PATCH /api/products/:id/adjust
const adjustStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  requireObjectId('id', id);

  // delta must be a finite number (negative = sale, positive = restock).
  // We deliberately accept non-integers so quick-adjust ±1 from the UI and
  // the custom-delta popover both work without coercion.
  const delta = requireFiniteNumber('delta', (req.body || {}).delta);

  if (delta === 0) {
    throw new HttpError(400, 'delta must be non-zero');
  }

  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    let product;
    try {
      product = await Product.findById(id);
    } catch (err) {
      rethrowAsBadRequest(err, 'id is not a valid product id');
      throw err;
    }
    if (!product) {
      throw new HttpError(404, 'Product not found');
    }

    const newQuantity = product.quantity + delta;
    if (newQuantity < 0) {
      throw new HttpError(409, 'Insufficient stock for this operation');
    }

    // Capture previous state so we can detect whether we *crossed* the
    // low-stock threshold downward (only then should we alert).
    const wasAboveThreshold = product.quantity > product.lowStockThreshold;
    const willBeAtOrBelow = newQuantity <= product.lowStockThreshold;

    try {
      // __v version check = optimistic lock. Mongoose auto-increments __v
      // and this save() only succeeds if no one else modified the doc in between.
      product.quantity = newQuantity;
      const updated = await product.save();

      req.io.to(updated.outlet).emit('inventory:update', updated);
      req.io.emit('inventory:update', updated); // global feed for dashboards

      if (wasAboveThreshold && willBeAtOrBelow) {
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

  throw new HttpError(
    409,
    'Could not update stock after concurrent write conflicts — please retry'
  );
});

module.exports = { getProducts, createProduct, adjustStock };

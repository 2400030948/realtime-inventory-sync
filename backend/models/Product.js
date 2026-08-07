const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, index: true },
    outlet: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    // Optimistic locking version key (Mongoose default: __v)
  },
  { timestamps: true, optimisticConcurrency: true }
);

// Compound index for fast search/filtering as inventory scales
ProductSchema.index({ outlet: 1, name: 'text' });
ProductSchema.index({ outlet: 1, quantity: 1 });

module.exports = mongoose.model('Product', ProductSchema);

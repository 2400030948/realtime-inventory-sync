const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    outlet: { type: String, required: true, index: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED', 'FAILED_STOCK'],
      default: 'CONFIRMED',
    },
  },
  { timestamps: true }
);

OrderSchema.index({ outlet: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);

const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  mrp: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  finalPrice: { type: Number, required: true },
  itemTotal: { type: Number, required: true }
});

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  customerName: { type: String, default: 'Walk-in Customer' },
  items: [billItemSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Bill', billSchema);

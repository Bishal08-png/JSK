const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, required: true, min: 0, max: 100 },
  finalPrice: { type: Number, required: true },
  dateAdded: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

productSchema.pre('save', function (next) {
  this.finalPrice = parseFloat((this.mrp - (this.mrp * this.discountPercent) / 100).toFixed(2));
  next();
});

module.exports = mongoose.model('Product', productSchema);

const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();

// GET /api/products
router.get("/", protect, async (req, res) => {
  try {
    let queryObj = { isActive: true };

    const User = require("../models/User");
    const mainAdminEmail = process.env.ADMIN_EMAIL || "admin@jsk.com";
    const mainAdmin = await User.findOne({
      email: mainAdminEmail.toLowerCase(),
    });

    if (mainAdmin) {
      // All users see the main admin's products
      queryObj.createdBy = mainAdmin._id;
    } else {
      return res.json([]); // Fallback if main admin missing
    }

    const products = await Product.find(queryObj).sort({ dateAdded: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, quantity, mrp, discountPercent, buyingPrice } = req.body;
    if (
      !name ||
      quantity === undefined ||
      !mrp ||
      discountPercent === undefined
    )
      return res.status(400).json({ message: "All fields are required" });

    const mrpNum = Number(mrp);
    const discNum = Number(discountPercent);

    // Backend Calculation (Secure Method)
    const calculatedFinalPrice = parseFloat(
      (mrpNum - (mrpNum * discNum) / 100).toFixed(2),
    );

    // All products are created by the main admin
    const User = require("../models/User");
    const mainAdminEmail = process.env.ADMIN_EMAIL || "admin@jsk.com";
    const mainAdmin = await User.findOne({
      email: mainAdminEmail.toLowerCase(),
    });
    const createdById = mainAdmin ? mainAdmin._id : req.user._id;

    const product = await Product.create({
      name,
      quantity: Number(quantity),
      mrp: mrpNum,
      buyingPrice: Number(buyingPrice || 0),
      discountPercent: discNum,
      finalPrice: calculatedFinalPrice,
      createdBy: createdById,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/products/:id
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    // Get main admin
    const User = require("../models/User");
    const mainAdminEmail = process.env.ADMIN_EMAIL || "admin@jsk.com";
    const mainAdmin = await User.findOne({
      email: mainAdminEmail.toLowerCase(),
    });
    const mainAdminId = mainAdmin ? mainAdmin._id : req.user._id;

    const { name, quantity, mrp, discountPercent, buyingPrice } = req.body;
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: mainAdminId,
    });
    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or unauthorized" });

    if (name !== undefined) product.name = name;
    if (quantity !== undefined) product.quantity = Number(quantity);
    if (mrp !== undefined) product.mrp = Number(mrp);
    if (discountPercent !== undefined)
      product.discountPercent = Number(discountPercent);
    if (buyingPrice !== undefined) product.buyingPrice = Number(buyingPrice);

    // Recalculate finalPrice server-side
    product.finalPrice = parseFloat(
      (product.mrp - (product.mrp * product.discountPercent) / 100).toFixed(2),
    );

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/products/:id  (soft delete)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    // Get main admin
    const User = require("../models/User");
    const mainAdminEmail = process.env.ADMIN_EMAIL || "admin@jsk.com";
    const mainAdmin = await User.findOne({
      email: mainAdminEmail.toLowerCase(),
    });
    const mainAdminId = mainAdmin ? mainAdmin._id : req.user._id;

    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: mainAdminId,
    });
    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or unauthorized" });
    product.isActive = false;
    await product.save();
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

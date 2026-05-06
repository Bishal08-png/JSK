const express = require("express");
const Bill = require("../models/Bill");
const Product = require("../models/Product");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();

// POST /api/bills
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { customerName, items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items in bill" });

    let subtotal = 0,
      totalDiscount = 0;
    const billItems = [];

    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();
    const mainAdminId = mainAdmin ? mainAdmin._id : req.user._id;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        isActive: { $ne: false }
      });
      if (!product)
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      if (product.quantity < item.quantity)
        return res
          .status(400)
          .json({ message: `Insufficient stock for "${product.name}"` });

      const itemTotal = parseFloat(
        (product.finalPrice * item.quantity).toFixed(2),
      );
      const itemMRP = parseFloat((product.mrp * item.quantity).toFixed(2));
      subtotal += itemMRP;
      totalDiscount += parseFloat((itemMRP - itemTotal).toFixed(2));

      billItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        mrp: product.mrp,
        discountPercent: product.discountPercent,
        finalPrice: product.finalPrice,
        itemTotal,
      });

      // Deduct stock
      product.quantity -= item.quantity;
      await product.save();
    }

    // Prefix logic based on isMainAdmin (already calculated above)
    const prefix = isMainAdmin ? "LK-" : "DM-";

    const regex = new RegExp(`^${prefix}`);
    
    // Filter for existing bills: main admin counts own + legacy, others only own
    const countFilter = { billNumber: regex };
    if (isMainAdmin) {
      countFilter.$or = [
        { createdBy: req.user._id },
        { createdBy: { $exists: false } },
        { createdBy: null }
      ];
    } else {
      countFilter.createdBy = req.user._id;
    }

    const allBillsWithPrefix = await Bill.find(countFilter, "billNumber");
    
    let maxNum = 0;
    allBillsWithPrefix.forEach(b => {
      const numStr = b.billNumber.substring(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const nextNum = maxNum + 1;
    const billNumberStr = `${prefix}${String(nextNum).padStart(11, "0")}`;

    const grandTotal = parseFloat((subtotal - totalDiscount).toFixed(2));
    const bill = await Bill.create({
      billNumber: billNumberStr,
      customerName: customerName || "Walk-in Customer",
      items: billItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      grandTotal,
      createdBy: req.user._id,
    });

    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bills
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;

    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();

    // Main admin sees own + legacy, others only own
    const filter = isMainAdmin 
      ? {
          $or: [
            { createdBy: req.user._id },
            { createdBy: { $exists: false } },
            { createdBy: null }
          ]
        }
      : { createdBy: req.user._id };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bills/stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();

    const queryFilter = isMainAdmin
      ? {
          $or: [
            { createdBy: req.user._id },
            { createdBy: { $exists: false } },
            { createdBy: null }
          ]
        }
      : { createdBy: req.user._id };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [allStats] = await Bill.aggregate([
      { $match: queryFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalBills: { $sum: 1 },
        },
      },
    ]);
    const [todayStats] = await Bill.aggregate([
      {
        $match: {
          ...queryFilter,
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          todaySales: { $sum: "$grandTotal" },
          todayBills: { $sum: 1 },
        },
      },
    ]);

    res.json({
      totalBills: allStats?.totalBills || 0,
      totalRevenue: parseFloat((allStats?.totalRevenue || 0).toFixed(2)),
      todaySales: parseFloat((todayStats?.todaySales || 0).toFixed(2)),
      todayBills: todayStats?.todayBills || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bills/daywise
router.get("/daywise", protect, adminOnly, async (req, res) => {
  try {
    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();

    const aggregateFilter = isMainAdmin
      ? {
          $or: [
            { createdBy: req.user._id },
            { createdBy: { $exists: false } },
            { createdBy: null }
          ]
        }
      : { createdBy: req.user._id };

    const groups = await Bill.aggregate([
      { $match: aggregateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalRevenue: { $sum: "$grandTotal" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalBills: { $sum: 1 },
          bills: { $push: "$$ROOT" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    ]);

    const result = groups.map((g) => ({
      date: `${g._id.year}-${String(g._id.month).padStart(2, "0")}-${String(g._id.day).padStart(2, "0")}`,
      totalRevenue: parseFloat(g.totalRevenue.toFixed(2)),
      totalDiscount: parseFloat(g.totalDiscount.toFixed(2)),
      totalBills: g.totalBills,
      bills: g.bills.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/bills/:id  — edit bill items (e.g. product exchange)
router.patch("/:id", protect, adminOnly, async (req, res) => {
  try {
    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();

    const bill = await Bill.findOne({
      _id: req.params.id,
      ...(isMainAdmin 
        ? { $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }, { createdBy: null }] }
        : { createdBy: req.user._id })
    });
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const { customerName, items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    // Restore old stock first
    for (const oldItem of bill.items) {
      await Product.findByIdAndUpdate(oldItem.productId, {
        $inc: { quantity: oldItem.quantity },
      });
    }

    // Recalculate with new items
    let subtotal = 0,
      totalDiscount = 0;
    const billItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        isActive: { $ne: false }
      });
      if (!product)
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      if (product.quantity < item.quantity)
        return res
          .status(400)
          .json({ message: `Insufficient stock for "${product.name}"` });

      const itemTotal = parseFloat(
        (product.finalPrice * item.quantity).toFixed(2),
      );
      const itemMRP = parseFloat((product.mrp * item.quantity).toFixed(2));
      subtotal += itemMRP;
      totalDiscount += parseFloat((itemMRP - itemTotal).toFixed(2));

      billItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        mrp: product.mrp,
        discountPercent: product.discountPercent,
        finalPrice: product.finalPrice,
        itemTotal,
      });

      // Deduct new stock
      product.quantity -= item.quantity;
      await product.save();
    }

    const grandTotal = parseFloat((subtotal - totalDiscount).toFixed(2));

    bill.customerName = customerName || bill.customerName;
    bill.items = billItems;
    bill.subtotal = parseFloat(subtotal.toFixed(2));
    bill.totalDiscount = parseFloat(totalDiscount.toFixed(2));
    bill.grandTotal = grandTotal;
    await bill.save();

    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/bills/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    // Identify main admin
    const mainAdminEmail = (process.env.ADMIN_EMAIL || "admin@jsk.com").toLowerCase();
    let mainAdmin = await User.findOne({ email: mainAdminEmail });
    if (!mainAdmin) {
      mainAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    }
    const isMainAdmin = req.user._id.toString() === mainAdmin?._id.toString();

    const bill = await Bill.findOne({
      _id: req.params.id,
      ...(isMainAdmin 
        ? { $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }, { createdBy: null }] }
        : { createdBy: req.user._id })
    });
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    // Restore stock for each item
    for (const item of bill.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
    }

    await bill.deleteOne();
    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express')
const Product = require('../models/Product')
const { protect, adminOnly } = require('../middleware/auth')
const router = express.Router()

// GET /api/products
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ dateAdded: -1 })
    res.json(products)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/products
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, quantity, mrp, discountPercent } = req.body
    if (!name || quantity === undefined || !mrp || discountPercent === undefined)
      return res.status(400).json({ message: 'All fields are required' })

    const mrpNum = Number(mrp)
    const discNum = Number(discountPercent)
    
    // Backend Calculation (Secure Method)
    const calculatedFinalPrice = parseFloat((mrpNum - (mrpNum * discNum) / 100).toFixed(2))

    const product = await Product.create({
      name,
      quantity: Number(quantity),
      mrp: mrpNum,
      discountPercent: discNum,
      finalPrice: calculatedFinalPrice
    })
    res.status(201).json(product)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/products/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, quantity, mrp, discountPercent } = req.body
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })

    if (name             !== undefined) product.name             = name
    if (quantity         !== undefined) product.quantity         = Number(quantity)
    if (mrp              !== undefined) product.mrp              = Number(mrp)
    if (discountPercent  !== undefined) product.discountPercent  = Number(discountPercent)

    // Recalculate finalPrice server-side
    product.finalPrice = parseFloat((product.mrp - (product.mrp * product.discountPercent) / 100).toFixed(2))

    await product.save()
    res.json(product)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/products/:id  (soft delete)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    product.isActive = false
    await product.save()
    res.json({ message: 'Product removed' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

module.exports = router

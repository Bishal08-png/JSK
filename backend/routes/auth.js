const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')
const router  = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'jsk_secret_2024')

const generateToken = (id) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not configured')
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' })
}

const toAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user._id)
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const exists = await User.findOne({ email: normalizedEmail })
    if (exists) return res.status(400).json({ message: 'Email already registered' })

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'customer'
    })

    res.status(201).json(toAuthResponse(user))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    // Compare the submitted password with the stored hash.
    const match = await user.comparePassword(password)
    if (!match) return res.status(401).json({ message: 'Invalid email or password' })

    res.json(toAuthResponse(user))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/auth/admin/password
router.put('/admin/password', protect, adminOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'Admin account not found' })

    const match = await user.comparePassword(currentPassword)
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' })

    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

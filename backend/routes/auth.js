const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
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

module.exports = router

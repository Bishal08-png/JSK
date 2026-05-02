const jwt  = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'jsk_secret_2024')

const protect = async (req, res, next) => {
  let token

  // Clients should send: Authorization: Bearer <jwt>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) return res.status(401).json({ message: 'Not authorized, no token' })
  if (!JWT_SECRET) return res.status(500).json({ message: 'JWT secret is not configured' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(401).json({ message: 'User not found' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next()
  res.status(403).json({ message: 'Access denied: Admins only' })
}

module.exports = { protect, adminOnly }

require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const mongoose = require('mongoose')
const User     = require('./models/User')

const authRoutes    = require('./routes/auth')
const productRoutes = require('./routes/products')
const billRoutes    = require('./routes/bills')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

// Routes
app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/bills',    billRoutes)

app.get('/', (req, res) => res.json({ message: 'JSK Stationery Shop API Running ✅' }))

// Seed default admin if none exists
const seedAdmin = async () => {
  // Remove any existing admin that may have a double-hashed password
  await User.deleteMany({ role: 'admin' })

  await User.create({
    name: 'JSK Admin',
    email: 'admin@jsk.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',   // Use env var or fallback
    role: 'admin'
  })
  console.log('✅ Default admin seeded: admin@jsk.com')
}

const PORT = process.env.PORT || 5000

// Export app for Vercel
module.exports = app

if (process.env.NODE_ENV !== 'production') {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('✅ MongoDB Atlas connected')
      await seedAdmin()
      app.listen(PORT, () => console.log(`🚀 JSK Server running on http://localhost:${PORT}`))
    })
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err.message)
    })
} else {
  // In Vercel, connection is handled differently or established on first request
  mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ MongoDB connected (Production)')
    seedAdmin()
  })
}

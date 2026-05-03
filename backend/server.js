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

let mongoConnection
let adminSeedPromise

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not configured')
  }

  mongoConnection ||= mongoose.connect(process.env.MONGO_URI)
  await mongoConnection

  adminSeedPromise ||= seedAdmin()
  await adminSeedPromise
}

app.use('/api', async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    res.status(500).json({ message: 'Database connection failed' })
  }
})

app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/bills',    billRoutes)

app.get('/', (req, res) => res.json({ message: 'Lokonath Enterprise API Running' }))

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lokonathenterprise.com'
  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase(), role: 'admin' })
  if (existingAdmin) return

  await User.create({
    name: 'LK Admin',
    email: adminEmail,
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin'
  })
  console.log(`Default admin seeded: ${adminEmail}`)
}

const PORT = process.env.PORT || 5000

module.exports = app

if (process.env.NODE_ENV !== 'production') {
  connectDB()
    .then(async () => {
      console.log('MongoDB Atlas connected')
      app.listen(PORT, () => console.log(`Lokonath Enterprise server running on http://localhost:${PORT}`))
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err.message)
    })
}

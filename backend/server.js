require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const mongoose = require('mongoose')
const User     = require('./models/User')

const authRoutes    = require('./routes/auth')
const productRoutes = require('./routes/products')
const billRoutes    = require('./routes/bills')

const dbConnect = require('./config/db')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

let adminSeedPromise = null

app.use(['/api', '/_/backend/api'], async (req, res, next) => {
  try {
    await dbConnect()
    
    if (!adminSeedPromise) {
      adminSeedPromise = seedAdmin()
    }
    await adminSeedPromise
    
    next()
  } catch (err) {
    console.error('Database initialization failed:', err.message)
    res.status(500).json({ message: 'Database connection failed' })
  }
})

app.use(['/api/auth', '/_/backend/api/auth'], authRoutes)
app.use(['/api/products', '/_/backend/api/products'], productRoutes)
app.use(['/api/bills', '/_/backend/api/bills'], billRoutes)

app.get('/', (req, res) => res.json({ message: 'Lokenath Enterprise API Running' }))

const seedAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jsk.com').toLowerCase()
  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase(), role: 'admin' })
  if (!existingAdmin) {
    await User.create({
      name: 'LK Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    })
    console.log(`Default admin seeded: ${adminEmail}`)
  }

  // Demo Admin 1
  const demoEmail = 'bishal8@gmail.com'
  const existingDemo = await User.findOne({ email: demoEmail.toLowerCase(), role: 'admin' })
  if (!existingDemo) {
    await User.create({
      name: 'Demo Admin',
      email: demoEmail,
      password: 'bjp206',
      role: 'admin'
    })
    console.log(`Demo admin seeded: ${demoEmail}`)
  }

  // Demo Admin 2
  const demo2Email = 'bishal@jsk.com'
  const existingDemo2 = await User.findOne({ email: demo2Email.toLowerCase(), role: 'admin' })
  if (!existingDemo2) {
    await User.create({
      name: 'Demo Admin 2',
      email: demo2Email,
      password: 'bjp207',
      role: 'admin'
    })
    console.log(`Demo admin 2 seeded: ${demo2Email}`)
  }
}

const PORT = process.env.PORT || 5000

module.exports = app

if (process.env.NODE_ENV !== 'production') {
  dbConnect()
    .then(async () => {
      console.log('MongoDB Atlas connected')
      app.listen(PORT, () => console.log(`Lokenath Enterprise server running on http://localhost:${PORT}`))
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err.message)
    })
}

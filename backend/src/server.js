const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const colors = require('colors')
const config = require('./config')
const connectDB = require('./utils/database')
const errorHandler = require('./middleware/error')

// Initialize Express app
const app = express()

// Connect to database
connectDB()

// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Cookie parser
app.use(cookieParser())

// Security middleware
app.use(helmet())

// Enable CORS
app.use(cors())

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use(
    morgan((tokens, req, res) => {
      return [
        colors.cyan(tokens.method(req, res)),
        colors.yellow(tokens.url(req, res)),
        colors.green(tokens.status(req, res)),
        colors.red(tokens['response-time'](req, res) + ' ms'),
      ].join(' ')
    })
  )
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
})
app.use('/api', limiter)

// Routes
// Import and use route files
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/users', require('./routes/users'))
app.use('/api/v1/addresses', require('./routes/addresses'))
app.use('/api/v1/products', require('./routes/products'))
app.use('/api/v1/shops', require('./routes/shops'))
app.use('/api/v1/cart', require('./routes/cart'))
app.use('/api/v1/orders', require('./routes/orders'))
app.use('/api/v1/coupons', require('./routes/coupons'))
app.use('/api/v1/analytics', require('./routes/analytics'))
app.use('/api/v1/location', require('./routes/location'))

// Root route
app.get('/', (req, res) => {
  res.send('Dumpit API Server is running...')
})

// Error handling middleware
app.use(errorHandler)

// Start server
const PORT = config.port
const server = app.listen(PORT, () => {
  console.log(colors.yellow.bold(`Server running in ${config.nodeEnv} mode on port ${PORT}`))
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(colors.red.bold(`Error: ${err.message}`))
  // Close server & exit process
  server.close(() => process.exit(1))
})

const mongoose = require('mongoose')
const config = require('../config')
const colors = require('colors')

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri)

    console.log(colors.cyan.underline(`MongoDB Connected: ${conn.connection.host}`))

    return conn
  } catch (error) {
    console.error(colors.red.bold(`Error connecting to MongoDB: ${error.message}`))
    process.exit(1)
  }
}

module.exports = connectDB

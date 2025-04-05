const Razorpay = require('razorpay')
const crypto = require('crypto')
const config = require('../config')
const ErrorResponse = require('./errorResponse')

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
})

// Create a Razorpay order
const createRazorpayOrder = async (options) => {
  try {
    const order = await razorpay.orders.create({
      amount: options.amount * 100, // Razorpay expects amount in paise
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes || {},
    })

    return order
  } catch (error) {
    throw new ErrorResponse(`Error creating Razorpay order: ${error.message}`, 500)
  }
}

// Verify Razorpay payment signature
const verifyPaymentSignature = (options) => {
  try {
    const {razorpayOrderId, razorpayPaymentId, razorpaySignature} = options

    // Create a signature string
    const signatureString = `${razorpayOrderId}|${razorpayPaymentId}`

    // Create a HMAC with razorpay key_secret
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(signatureString)
      .digest('hex')

    // Compare signatures
    return expectedSignature === razorpaySignature
  } catch (error) {
    throw new ErrorResponse(`Error verifying payment signature: ${error.message}`, 500)
  }
}

// Get payment details from Razorpay
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId)
    return payment
  } catch (error) {
    throw new ErrorResponse(`Error fetching payment details: ${error.message}`, 500)
  }
}

// Refund a payment
const refundPayment = async (options) => {
  try {
    const refund = await razorpay.payments.refund(options.paymentId, {
      amount: options.amount * 100, // Amount in paise
      notes: options.notes || {},
    })

    return refund
  } catch (error) {
    throw new ErrorResponse(`Error refunding payment: ${error.message}`, 500)
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  refundPayment,
}

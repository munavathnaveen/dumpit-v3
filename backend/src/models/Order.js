const mongoose = require('mongoose')
const config = require('../config')

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: true,
      },
      shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
      },
    },
  ],
  shippingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price must be at least 0'],
  },
  status: {
    type: String,
    enum: [
      config.constants.orderStatus.PENDING,
      config.constants.orderStatus.PROCESSING,
      config.constants.orderStatus.COMPLETED,
      config.constants.orderStatus.CANCELLED,
    ],
    default: config.constants.orderStatus.PENDING,
  },
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'cash_on_delivery'],
      required: true,
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: {
      type: String,
      enum: [
        config.constants.paymentStatus.PENDING,
        config.constants.paymentStatus.COMPLETED,
        config.constants.paymentStatus.FAILED,
      ],
      default: config.constants.paymentStatus.PENDING,
    },
  },
  couponApplied: {
    type: String,
    default: null,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt timestamp before save
OrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Order', OrderSchema)

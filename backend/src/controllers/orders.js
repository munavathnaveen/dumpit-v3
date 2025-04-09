const Order = require('../models/Order')
const User = require('../models/User')
const Product = require('../models/Product')
const Coupon = require('../models/Coupon')
const ErrorResponse = require('../utils/errorResponse')
const {sendEmail, emailTemplates} = require('../utils/email')
const {createRazorpayOrder, verifyPaymentSignature} = require('../utils/payment')
const config = require('../config')

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private (Customer: own orders, Vendor: all orders)
exports.getOrders = async (req, res, next) => {
  try {
    let query

    // If user is a customer, get only their orders
    if (req.user.role === config.constants.userRoles.CUSTOMER) {
      query = Order.find({user: req.user.id})
    } else {
      // For vendors, get all orders that include their products
      // First, find all products owned by the vendor
      const products = await Product.find({vendor: req.user.id}).select('_id')
      const productIds = products.map((product) => product._id)

      // Then find orders that include these products
      query = Order.find({
        'items.product': {$in: productIds},
      })
    }

    // Add pagination
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 10
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const total = await Order.countDocuments(query)

    // Execute query with pagination
    const orders = await query
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt')
      .populate([
        {path: 'user', select: 'name email phone'},
        {path: 'items.product', select: 'name'},
        {path: 'items.shop', select: 'name'},
        {path: 'shippingAddress'},
      ])

    // Pagination result
    const pagination = {}

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate([
      {path: 'user', select: 'name email phone'},
      {path: 'items.product', select: 'name images rate discount'},
      {path: 'items.shop', select: 'name'},
      {path: 'shippingAddress'},
    ])

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Check if user is authorized to view this order
    if (req.user.id !== order.user._id.toString() && req.user.role !== config.constants.userRoles.VENDOR) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this order`, 401))
    }

    // If user is a vendor, check if they own any of the products in the order
    if (req.user.role === config.constants.userRoles.VENDOR) {
      const products = await Product.find({vendor: req.user.id}).select('_id')
      const productIds = products.map((product) => product._id.toString())

      const hasVendorProduct = order.items.some((item) => productIds.includes(item.product._id.toString()))

      if (!hasVendorProduct) {
        return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this order`, 401))
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const {shippingAddress, paymentMethod, couponCode, notes} = req.body

    // Get user
    const user = await User.findById(req.user.id).populate({
      path: 'cart.product',
      select: 'name rate discount stock vendor shop',
    })

    // Check if cart is empty
    if (user.cart.length === 0) {
      return next(new ErrorResponse('Your cart is empty', 400))
    }

    // Prepare order items and calculate total price
    const orderItems = []
    let totalPrice = 0

    for (const cartItem of user.cart) {
      // Check if product exists
      if (!cartItem.product) {
        return next(new ErrorResponse('Some products in your cart no longer exist', 400))
      }

      // Check if product is in stock
      if (cartItem.product.stock < cartItem.quantity) {
        return next(
          new ErrorResponse(
            `Insufficient stock for ${cartItem.product.name}. Available: ${cartItem.product.stock}`,
            400
          )
        )
      }

      // Calculate price with discount
      const price = cartItem.product.rate * (1 - cartItem.product.discount / 100)

      // Add to order items
      orderItems.push({
        product: cartItem.product._id,
        quantity: cartItem.quantity,
        price: price,
        shop: cartItem.product.shop,
      })

      // Add to total price
      totalPrice += price * cartItem.quantity
    }

    // Apply coupon if provided
    let discountAmount = 0
    let appliedCoupon = null

    if (couponCode) {
      const coupon = await Coupon.findOne({code: couponCode, isActive: true})

      if (!coupon) {
        return next(new ErrorResponse('Invalid or expired coupon code', 400))
      }

      // Check if coupon is valid
      if (!coupon.isValid()) {
        return next(new ErrorResponse('Coupon is no longer valid', 400))
      }

      // Check minimum order value
      if (totalPrice < coupon.minOrderValue) {
        return next(new ErrorResponse(`Minimum order value for this coupon is ₹${coupon.minOrderValue}`, 400))
      }

      // Calculate discount
      discountAmount = coupon.calculateDiscount(totalPrice)
      totalPrice -= discountAmount
      appliedCoupon = coupon.code

      // Increment coupon usage count
      coupon.usedCount += 1
      await coupon.save()
    }

    // Create order object
    const orderData = {
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      totalPrice,
      status: config.constants.orderStatus.PENDING,
      payment: {
        method: paymentMethod,
      },
      couponApplied: appliedCoupon,
      discountAmount,
      notes,
    }

    // If payment method is Razorpay, create Razorpay order
    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder({
        amount: totalPrice,
        currency: 'INR',
        receipt: `order_${Date.now()}`,
      })

      orderData.payment.razorpayOrderId = razorpayOrder.id
    }

    // Create order
    const order = await Order.create(orderData)

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {stock: -item.quantity},
      })
    }

    // Clear user's cart
    user.cart = []
    await user.save()

    // Send order confirmation email
    const orderDetails = buildOrderDetailsHtml(order)

    try {
      await sendEmail({
        email: user.email,
        subject: 'Order Confirmation - Dumpit',
        message: emailTemplates.orderConfirmation(user.name, order._id, orderDetails),
      })
    } catch (err) {
      console.log('Email could not be sent', err)
    }

    // Add notification to user
    user.notifications.push({
      message: `Your order #${order._id} has been placed successfully`,
    })
    await user.save()

    res.status(201).json({
      success: true,
      data: order,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Update order status
// @route   PUT /api/v1/orders/:id
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const {status} = req.body

    // Check if status is valid
    if (!Object.values(config.constants.orderStatus).includes(status)) {
      return next(new ErrorResponse('Invalid status', 400))
    }

    let order = await Order.findById(req.params.id).populate({
      path: 'user',
      select: 'name email notifications notificationSettings',
    })

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Check if user is authorized to update this order
    if (req.user.role !== config.constants.userRoles.VENDOR) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this order`, 401))
    }

    // Update order status
    order.status = status
    await order.save()

    // Send order status update email
    if (order.user.notificationSettings.email) {
      try {
        await sendEmail({
          email: order.user.email,
          subject: 'Order Status Update - Dumpit',
          message: emailTemplates.orderStatusUpdate(order.user.name, order._id, status),
        })
      } catch (err) {
        console.log('Email could not be sent', err)
      }
    }

    // Add notification to user
    order.user.notifications.push({
      message: `Your order #${order._id} status has been updated to ${status}`,
    })
    await order.user.save()

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Update payment details (Razorpay)
// @route   PUT /api/v1/orders/:id/payment
// @access  Private
exports.updatePayment = async (req, res, next) => {
  try {
    const {razorpayPaymentId, razorpaySignature} = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Check if user is authorized
    if (req.user.id !== order.user.toString()) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this payment`, 401))
    }

    // Check if payment method is Razorpay
    if (order.payment.method !== 'razorpay') {
      return next(new ErrorResponse('This order does not use Razorpay payment', 400))
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId: order.payment.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })

    if (!isValid) {
      return next(new ErrorResponse('Invalid payment signature', 400))
    }

    // Update payment details
    order.payment.razorpayPaymentId = razorpayPaymentId
    order.payment.status = config.constants.paymentStatus.COMPLETED

    // Update order status to processing
    order.status = config.constants.orderStatus.PROCESSING

    await order.save()

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'user',
      select: 'name email notifications notificationSettings',
    })

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Check if user is authorized
    if (req.user.id !== order.user._id.toString() && req.user.role !== config.constants.userRoles.VENDOR) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to cancel this order`, 401))
    }

    // Check if order can be cancelled (only pending or processing orders can be cancelled)
    if (
      order.status !== config.constants.orderStatus.PENDING &&
      order.status !== config.constants.orderStatus.PROCESSING
    ) {
      return next(new ErrorResponse(`Order ${order._id} cannot be cancelled in ${order.status} status`, 400))
    }

    // Update order status to cancelled
    order.status = config.constants.orderStatus.CANCELLED
    await order.save()

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {stock: item.quantity},
      })
    }

    // Send order cancellation email
    if (order.user.notificationSettings.email) {
      try {
        await sendEmail({
          email: order.user.email,
          subject: 'Order Cancelled - Dumpit',
          message: emailTemplates.orderStatusUpdate(order.user.name, order._id, 'cancelled'),
        })
      } catch (err) {
        console.log('Email could not be sent', err)
      }
    }

    // Add notification to user
    order.user.notifications.push({
      message: `Your order #${order._id} has been cancelled`,
    })
    await order.user.save()

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (err) {
    next(err)
  }
}

// Helper function to build order details HTML for email
const buildOrderDetailsHtml = (order) => {
  let html = `
    <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Quantity</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
      </tr>
  `

  order.items.forEach((item) => {
    html += `
      <tr>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${item.product.name || 'Product'}</td>
        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.price * item.quantity).toFixed(
          2
        )}</td>
      </tr>
    `
  })

  // Add discount if applicable
  if (order.discountAmount > 0) {
    html += `
      <tr>
        <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;">Discount (${
          order.couponApplied
        })</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">-₹${order.discountAmount.toFixed(2)}</td>
      </tr>
    `
  }

  // Add total row
  html += `
    <tr style="font-weight: bold;">
      <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</td>
      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${order.totalPrice.toFixed(2)}</td>
    </tr>
  `

  html += '</table>'

  return html
}

// @desc    Get vendor-specific orders
// @route   GET /api/v1/orders/vendor
// @access  Private (Vendor only)
exports.getVendorOrders = async (req, res, next) => {
  try {
    // Find all products owned by the vendor
    const products = await Product.find({ vendor: req.user.id }).select('_id')
    const productIds = products.map(product => product._id)

    // Find orders that contain products from this vendor
    const orders = await Order.find({
      'items.product': { $in: productIds }
    })
    .populate([
      { path: 'user', select: 'name email phone' },
      { path: 'items.product', select: 'name images rate discount' },
      { path: 'items.shop', select: 'name' },
      { path: 'shippingAddress' }
    ])
    .sort('-createdAt')

    // Format the order data for the frontend
    const formattedOrders = orders.map(order => {
      const vendorItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product._id.toString())
      )
      
      return {
        _id: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        user: {
          _id: order.user._id,
          name: order.user.name,
          email: order.user.email,
          phone: order.user.phone
        },
        items: vendorItems.map(item => ({
          product: {
            _id: item.product._id,
            name: item.product.name,
            price: item.price,
            image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : ''
          },
          quantity: item.quantity,
          price: item.price
        })),
        status: order.status,
        total: vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shippingAddress: order.shippingAddress,
        paymentMethod: order.payment.method,
        paymentStatus: order.payment.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    })

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get single vendor order
// @route   GET /api/v1/orders/vendor/:id
// @access  Private (Vendor only)
exports.getVendorOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate([
        { path: 'user', select: 'name email phone' },
        { path: 'items.product', select: 'name images rate discount vendor' },
        { path: 'items.shop', select: 'name' },
        { path: 'shippingAddress' }
      ])

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404))
    }

    // Verify that at least one product in the order belongs to this vendor
    const hasVendorProduct = order.items.some(item => 
      item.product.vendor && item.product.vendor.toString() === req.user.id
    )

    if (!hasVendorProduct) {
      return next(new ErrorResponse('Not authorized to access this order', 403))
    }

    // Filter to only include products from this vendor
    const vendorItems = order.items.filter(item => 
      item.product.vendor && item.product.vendor.toString() === req.user.id
    )
    
    // Format the order data
    const formattedOrder = {
      _id: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      user: {
        _id: order.user._id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone
      },
      items: vendorItems.map(item => ({
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.price,
          image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : ''
        },
        quantity: item.quantity,
        price: item.price
      })),
      status: order.status,
      total: vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.payment.method,
      paymentStatus: order.payment.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }

    res.status(200).json({
      success: true,
      data: formattedOrder
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get vendor order statistics
// @route   GET /api/v1/orders/vendor/stats
// @access  Private (Vendor only)
exports.getVendorOrderStats = async (req, res, next) => {
  try {
    // Find all products owned by the vendor
    const products = await Product.find({ vendor: req.user.id }).select('_id')
    const productIds = products.map(product => product._id)
    
    // Find orders containing vendor products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    })
    
    // Calculate total revenue
    let totalRevenue = 0
    let ordersByStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0
    }
    
    // Process orders to calculate revenue and count by status
    orders.forEach(order => {
      // Count by status
      if (ordersByStatus[order.status.toLowerCase()] !== undefined) {
        ordersByStatus[order.status.toLowerCase()]++
      }
      
      // Calculate revenue from vendor's products only
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product.toString())) {
          totalRevenue += item.price * item.quantity
        }
      })
    })
    
    // Format the stats data
    const formattedStats = {
      totalOrders: orders.length,
      totalRevenue,
      ordersByStatus: [
        { status: 'pending', count: ordersByStatus.pending },
        { status: 'processing', count: ordersByStatus.processing },
        { status: 'completed', count: ordersByStatus.completed },
        { status: 'cancelled', count: ordersByStatus.cancelled }
      ],
      recentOrders: await getRecentOrders(req.user.id, productIds, 5)
    }
    
    res.status(200).json({
      success: true,
      data: formattedStats
    })
  } catch (err) {
    next(err)
  }
}

// Helper function to get recent orders
const getRecentOrders = async (vendorId, productIds, limit = 5) => {
  const orders = await Order.find({
    'items.product': { $in: productIds }
  })
  .populate([
    { path: 'user', select: 'name' },
  ])
  .sort('-createdAt')
  .limit(limit)
  
  return orders.map(order => ({
    id: order._id,
    customerName: order.user ? order.user.name : 'Unknown Customer',
    date: order.createdAt,
    total: order.items.reduce((sum, item) => {
      if (productIds.some(id => id.toString() === item.product.toString())) {
        return sum + (item.price * item.quantity)
      }
      return sum
    }, 0),
    status: order.status
  }))
}

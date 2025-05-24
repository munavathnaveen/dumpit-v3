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

// @desc    Get pending orders
// @route   GET /api/v1/orders/pending
// @access  Private
exports.getOrdersPending = async (req, res, next) => {
  try {
    let query;

    // If user is a customer, get only their pending orders
    if (req.user.role === config.constants.userRoles.CUSTOMER) {
      query = Order.find({
        user: req.user.id,
        status: config.constants.orderStatus.PENDING
      });
    } else {
      // For vendors, get all pending orders that include their products
      const products = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = products.map((product) => product._id);

      query = Order.find({
        'items.product': { $in: productIds },
        status: config.constants.orderStatus.PENDING
      });
    }

    // Execute query
    const orders = await query
      .sort('-createdAt')
      .populate([
        { path: 'user', select: 'name email phone' },
        { path: 'items.product', select: 'name' },
        { path: 'items.shop', select: 'name' },
        { path: 'shippingAddress' },
      ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

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
      const price = cartItem.product.price * (1 - cartItem.product.discount / 100)
      
      // Ensure price is a valid number
      if (isNaN(price) || price < 0) {
        return next(new ErrorResponse(`Invalid price for product ${cartItem.product.name}`, 400))
      }

      // Add to order items
      orderItems.push({
        product: cartItem.product._id,
        quantity: cartItem.quantity,
        price: price,
        shop: cartItem.product.shop,
      })

      // Add to total price
      console.log("debug ",totalPrice,price,cartItem.quantity);
      totalPrice += price * cartItem.quantity
    }

    // Ensure total price is a valid number
    if (isNaN(totalPrice) || totalPrice < 0) {
      return next(new ErrorResponse('Invalid total price calculation', 400))
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
      totalPrice += 40;
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
    if(order.status==='cancelled'){
       return next(new ErrorResponse(`Order Already Cancelled Cannot Update Status `));s
    }
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
    const order = await Order.findById(req.params.id).populate([
      {
        path: 'user',
        select: 'name email notifications notificationSettings',
      },
      {
        path: 'items.product',
        select: 'name stock',
      }
    ]);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized (either the customer who placed the order or a vendor)
    const isCustomer = req.user.id === order.user._id.toString();
    let isVendor = false;

    // Check if vendor has products in this order
    if (req.user.role === config.constants.userRoles.VENDOR) {
      const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
      const vendorProductIds = vendorProducts.map(product => product._id.toString());
      
      isVendor = order.items.some(item => 
        vendorProductIds.includes(item.product._id.toString())
      );
    }

    if (!isCustomer && !isVendor) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to cancel this order`, 401));
    }

    // Check if order can be cancelled based on status
    if (order.status === config.constants.orderStatus.COMPLETED) {
      return next(new ErrorResponse(`Completed orders cannot be cancelled`, 400));
    }
    
    if (order.status === config.constants.orderStatus.CANCELLED) {
      return next(new ErrorResponse(`Order is already cancelled`, 400));
    }

    // Check if order is in delivery or tracking status (for frontend usage)
    const inDelivery = order.tracking && ['in_transit', 'delivered'].includes(order.tracking.status);
    if (inDelivery && order.tracking.status === 'delivered') {
      return next(new ErrorResponse(`Delivered orders cannot be cancelled`, 400));
    }

    // Update order status to cancelled
    order.status = config.constants.orderStatus.CANCELLED;
    
    // Record who cancelled the order (for audit)
    order.notes = order.notes || '';
    order.notes += `\nCancelled by ${isCustomer ? 'customer' : 'vendor'} on ${new Date().toISOString()}`;
    
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: item.quantity },
        });
      }
    }

    // Send notification to user about order cancellation
    try {
      // Add notification to user
      if (order.user && order.user.notifications) {
        order.user.notifications.push({
          title: 'Order Cancelled',
          message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been cancelled`,
          type: 'info',
          createdAt: new Date()
        });
        await order.user.save();
      }
    } catch (err) {
      console.log('Error sending notification:', err);
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
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

// @desc    Update order tracking information
// @route   PUT /api/v1/orders/:id/tracking
// @access  Private (Vendor/Delivery only)
exports.updateOrderTracking = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized (vendor of any product in the order)
    // For now only vendors can update, but this could be extended to delivery personnel
    if (req.user.role === config.constants.userRoles.VENDOR) {
      const products = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = products.map(product => product._id.toString());

      const hasVendorProduct = order.items.some(item => 
        productIds.includes(item.product.toString())
      );

      if (!hasVendorProduct) {
        return next(new ErrorResponse(`User not authorized to update this order tracking`, 403));
      }
    } else {
      return next(new ErrorResponse(`User role not authorized to update tracking`, 403));
    }

    // Get tracking information from request body
    const { latitude, longitude, status, eta, distance, route } = req.body;

    // Update tracking information
    if (latitude && longitude) {
      order.tracking.currentLocation = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    if (status) {
      order.tracking.status = status;
    }

    if (eta) {
      order.tracking.eta = new Date(eta);
    }

    if (distance !== undefined) {
      order.tracking.distance = distance;
    }

    if (route) {
      order.tracking.route = route;
    }

    order.tracking.lastUpdated = Date.now();
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get order tracking information
// @route   GET /api/v1/orders/:id/tracking
// @access  Private
exports.getOrderTracking = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('shippingAddress')
      .populate({
        path: 'items.shop',
        select: 'name location address'
      });

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized (owner, vendor of product in order, or admin)
    const isOrderOwner = order.user.toString() === req.user.id;
    let isVendorOfProduct = false;

    if (req.user.role === config.constants.userRoles.VENDOR) {
      const products = await Product.find({ vendor: req.user.id }).select('_id');
      const productIds = products.map(product => product._id.toString());
      isVendorOfProduct = order.items.some(item => 
        productIds.includes(item.product.toString())
      );
    }

    if (!isOrderOwner && !isVendorOfProduct && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User not authorized to view this order tracking`, 403));
    }

    // Get shop locations for the order items
    const shopLocations = order.items.map(item => {
      const shop = item.shop;
      return {
        shopId: shop._id,
        shopName: shop.name,
        location: shop.location,
        address: shop.address
      };
    });

    // Filter out duplicates
    const uniqueShops = shopLocations.filter((shop, index, self) => 
      index === self.findIndex(s => s.shopId.toString() === shop.shopId.toString())
    );

    // Calculate straight-line distance from current location to destination
    let straightLineDistance = null;
    if (order.tracking?.currentLocation?.coordinates && 
        order.shippingAddress?.location?.coordinates) {
      // Get coordinates
      const currentLng = order.tracking.currentLocation.coordinates[0];
      const currentLat = order.tracking.currentLocation.coordinates[1];
      const destLng = order.shippingAddress.location.coordinates[0]; 
      const destLat = order.shippingAddress.location.coordinates[1];
      
      // Earth's radius in meters
      const R = 6371000;
      
      // Convert to radians
      const lat1 = currentLat * Math.PI / 180;
      const lat2 = destLat * Math.PI / 180;
      const lng1 = currentLng * Math.PI / 180;
      const lng2 = destLng * Math.PI / 180;
      
      // Calculate differences
      const dLat = lat2 - lat1;
      const dLng = lng2 - lng1;
      
      // Haversine formula
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                Math.cos(lat1) * Math.cos(lat2) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      straightLineDistance = Math.round(R * c);
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        status: order.status,
        trackingStatus: order.tracking.status,
        currentLocation: order.tracking.currentLocation,
        eta: order.tracking.eta,
        distance: order.tracking.distance || straightLineDistance, // Use calculated distance as fallback
        straightLineDistance, // Add straight-line distance for client calculation
        route: order.tracking.route,
        lastUpdated: order.tracking.lastUpdated,
        shippingAddress: order.shippingAddress,
        shops: uniqueShops
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Vendor accept/reject order (for COD)
// @route   PUT /api/v1/orders/:id/vendor-action
// @access  Private (Vendor only)
exports.vendorOrderAction = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!action || (action !== 'accept' && action !== 'reject')) {
      return next(new ErrorResponse('Invalid action. Must be either "accept" or "reject"', 400));
    }

    let order = await Order.findById(req.params.id).populate({
      path: 'user',
      select: 'name email notifications notificationSettings',
    });

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized - must be a vendor
    if (req.user.role !== config.constants.userRoles.VENDOR) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to perform this action`, 401));
    }

    // Check if it's a COD order
    if (order.payment.method !== 'cash_on_delivery') {
      return next(new ErrorResponse('This action is only valid for Cash on Delivery orders', 400));
    }

    // Check if order is in pending status
    if (order.status !== config.constants.orderStatus.PENDING) {
      return next(new ErrorResponse(`Order ${order._id} cannot be ${action}ed in ${order.status} status`, 400));
    }

    if (action === 'accept') {
      // Update order status to processing for accepted orders
      order.status = config.constants.orderStatus.PROCESSING;
      // Keep payment status as pending for now - will be updated to completed on delivery
    } else {
      // Update order status to cancelled for rejected orders
      order.status = config.constants.orderStatus.CANCELLED;
      order.payment.status = config.constants.paymentStatus.FAILED;
      
      // Restore product stock for rejected orders
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await order.save();

    // Send email notification to customer
    if (order.user.notificationSettings?.email) {
      try {
        const emailSubject = action === 'accept' 
          ? 'Your Order Has Been Accepted - Dumpit' 
          : 'Your Order Has Been Cancelled - Dumpit';
        
        const emailMessage = action === 'accept'
          ? emailTemplates.orderStatusUpdate(order.user.name, order._id, 'processing')
          : emailTemplates.orderStatusUpdate(order.user.name, order._id, 'cancelled');
        
        await sendEmail({
          email: order.user.email,
          subject: emailSubject,
          message: emailMessage,
        });
      } catch (err) {
        console.log('Email could not be sent', err);
      }
    }

    // Add notification to user
    const notificationMessage = action === 'accept'
      ? `Your order #${order._id} has been accepted and is being processed`
      : `Your order #${order._id} has been rejected by the vendor`;
    
    order.user.notifications.push({
      message: notificationMessage,
    });
    await order.user.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

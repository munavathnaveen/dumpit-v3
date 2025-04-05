const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('express-async-handler')
const {exportToCSV, importFromCSV} = require('../utils/csv')
const Product = require('../models/Product')
const Order = require('../models/Order')
const User = require('../models/User')
const Shop = require('../models/Shop')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

// Configure storage for CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/csv')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
  },
})

// Filter to only allow CSV files
const csvFilter = (req, file, cb) => {
  if (file.mimetype.includes('csv')) {
    cb(null, true)
  } else {
    cb(new Error('Please upload only CSV files'), false)
  }
}

// Initialize upload
exports.upload = multer({
  storage: storage,
  fileFilter: csvFilter,
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB max file size
})

/**
 * @desc    Export products as CSV
 * @route   GET /api/v1/analytics/export/products
 * @access  Private/Vendor
 */
exports.exportProducts = asyncHandler(async (req, res, next) => {
  const shopId = req.query.shop

  // Validate shop ownership if shop ID is provided
  if (shopId) {
    const shop = await Shop.findById(shopId)
    if (!shop) {
      return next(new ErrorResponse('Shop not found', 404))
    }

    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this shop', 403))
    }
  }

  // Build query
  const query = {}
  if (shopId) {
    query.shop = shopId
  }

  // Get all products for the specified shop (or all if admin)
  const products = await Product.find(query).populate('shop', 'name').lean()

  // Define CSV fields
  const fields = [
    {label: 'Product ID', value: '_id'},
    {label: 'Name', value: 'name'},
    {label: 'Description', value: 'description'},
    {label: 'Price', value: 'price'},
    {label: 'Stock', value: 'stock'},
    {label: 'Category', value: 'category'},
    {label: 'Shop', value: 'shop.name'},
    {label: 'Rating', value: 'rating'},
    {label: 'Is Active', value: 'isActive'},
    {label: 'Created At', value: 'createdAt'},
  ]

  // Export data to CSV
  const filePath = await exportToCSV(products, fields, 'products')

  res.status(200).json({
    success: true,
    data: {
      message: 'Products exported successfully',
      filePath: path.basename(filePath),
    },
  })
})

/**
 * @desc    Export orders as CSV
 * @route   GET /api/v1/analytics/export/orders
 * @access  Private/Vendor or Admin
 */
exports.exportOrders = asyncHandler(async (req, res, next) => {
  const shopId = req.query.shop
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null

  // Validate shop ownership if shop ID is provided
  if (shopId && req.user.role !== 'admin') {
    const shop = await Shop.findById(shopId)
    if (!shop) {
      return next(new ErrorResponse('Shop not found', 404))
    }

    if (shop.owner.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this shop', 403))
    }
  }

  // Build query
  let query = {}

  // Filter by shop for vendors
  if (req.user.role === 'vendor') {
    // Get all shops owned by the vendor
    const shops = await Shop.find({owner: req.user.id})
    const shopIds = shops.map((shop) => shop._id)

    // If specific shop is requested, ensure it's in the vendor's shops
    if (shopId) {
      if (!shopIds.includes(shopId)) {
        return next(new ErrorResponse('Not authorized to access this shop', 403))
      }
      // Find orders containing items from this shop
      query = {'items.shop': shopId}
    } else {
      // Find orders containing items from any of the vendor's shops
      query = {'items.shop': {$in: shopIds}}
    }
  } else if (req.user.role === 'admin' && shopId) {
    // Admin can filter by specific shop
    query = {'items.shop': shopId}
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) {
      query.createdAt.$gte = startDate
    }
    if (endDate) {
      query.createdAt.$lte = endDate
    }
  }

  // Get orders
  const orders = await Order.find(query)
    .populate('user', 'name email')
    .populate('items.product', 'name')
    .populate('items.shop', 'name')
    .populate('shippingAddress')
    .lean()

  // Prepare data for CSV
  const csvData = orders.map((order) => {
    // Flatten order items for readability
    const itemsInfo = order.items.map((item) => `${item.product.name} (${item.quantity} x ${item.price})`).join('; ')

    const shippingInfo = order.shippingAddress
      ? `${order.shippingAddress.street}, ${order.shippingAddress.village}, ${order.shippingAddress.district}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`
      : 'Address not available'

    return {
      ...order,
      items: itemsInfo,
      shippingAddress: shippingInfo,
      customerName: order.user ? order.user.name : 'Unknown',
      customerEmail: order.user ? order.user.email : 'Unknown',
    }
  })

  // Define CSV fields
  const fields = [
    {label: 'Order ID', value: '_id'},
    {label: 'Customer', value: 'customerName'},
    {label: 'Email', value: 'customerEmail'},
    {label: 'Items', value: 'items'},
    {label: 'Total Price', value: 'totalPrice'},
    {label: 'Status', value: 'status'},
    {label: 'Payment Method', value: 'payment.method'},
    {label: 'Payment Status', value: 'payment.status'},
    {label: 'Shipping Address', value: 'shippingAddress'},
    {label: 'Created At', value: 'createdAt'},
    {label: 'Updated At', value: 'updatedAt'},
  ]

  // Export data to CSV
  const filePath = await exportToCSV(csvData, fields, 'orders')

  res.status(200).json({
    success: true,
    data: {
      message: 'Orders exported successfully',
      filePath: path.basename(filePath),
    },
  })
})

/**
 * @desc    Import products from CSV
 * @route   POST /api/v1/analytics/import/products
 * @access  Private/Vendor
 */
exports.importProducts = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a CSV file', 400))
  }

  const shopId = req.body.shop

  // Validate shop ownership
  const shop = await Shop.findById(shopId)
  if (!shop) {
    return next(new ErrorResponse('Shop not found', 404))
  }

  if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to add products to this shop', 403))
  }

  // Process the CSV file
  const result = await importFromCSV(req.file.path, async (row) => {
    // Basic validation
    if (!row.name || !row.price) {
      throw new Error('Product name and price are required')
    }

    // Create or update product
    let product
    if (row._id) {
      // Try to find existing product
      product = await Product.findById(row._id)
    }

    if (product) {
      // Update existing product
      product.name = row.name
      product.description = row.description || product.description
      product.price = parseFloat(row.price)
      product.stock = parseInt(row.stock || product.stock)
      product.category = row.category || product.category
      product.isActive = row.isActive === 'true'
      await product.save()
    } else {
      // Create new product
      await Product.create({
        name: row.name,
        description: row.description || '',
        price: parseFloat(row.price),
        stock: parseInt(row.stock || 0),
        category: row.category || 'Other',
        shop: shopId,
        isActive: row.isActive === 'true' || true,
      })
    }
  })

  // Delete the uploaded file
  fs.unlinkSync(req.file.path)

  res.status(200).json({
    success: true,
    data: {
      message: 'Products imported successfully',
      processed: result.processed,
      errors: result.errors,
    },
  })
})

/**
 * @desc    Download CSV export file
 * @route   GET /api/v1/analytics/download/:filename
 * @access  Private
 */
exports.downloadCSV = asyncHandler(async (req, res, next) => {
  const filename = req.params.filename
  const filePath = path.join(__dirname, '../../exports', filename)

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return next(new ErrorResponse('File not found', 404))
  }

  res.download(filePath)
})

/**
 * @desc    Get vendor dashboard analytics
 * @route   GET /api/v1/analytics/vendor-dashboard
 * @access  Private/Vendor
 */
exports.getVendorDashboard = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    
    // Get vendor's products
    const products = await Product.find({ vendor: vendorId });
    const productIds = products.map(product => product._id);
    
    // Get orders containing vendor's products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    }).populate('user', 'name');
    
    // Calculate total revenue
    let totalRevenue = 0;
    
    // Process orders
    orders.forEach(order => {
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product.toString())) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });
    
    // Get order counts by status
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const processingOrders = orders.filter(order => order.status === 'processing').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    
    // Generate daily, weekly, and monthly revenue data
    const revenueData = await generateRevenueData(orders, productIds);
    
    // Get top selling products
    const topProducts = getTopSellingProducts(orders, products, productIds);
    
    // Format recent orders
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        id: order._id,
        customerName: order.user ? order.user.name : 'Unknown Customer',
        date: order.createdAt,
        total: order.items.reduce((sum, item) => {
          if (productIds.some(id => id.toString() === item.product.toString())) {
            return sum + (item.price * item.quantity);
          }
          return sum;
        }, 0),
        status: order.status
      }));
    
    // Compile dashboard data
    const dashboardData = {
      totalRevenue,
      totalOrders: orders.length,
      totalProducts: products.length,
      pendingOrders,
      revenue: revenueData,
      ordersByStatus: [
        { status: 'pending', count: pendingOrders },
        { status: 'processing', count: processingOrders },
        { status: 'completed', count: completedOrders },
        { status: 'cancelled', count: cancelledOrders }
      ],
      topProducts,
      recentOrders
    };
    
    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to generate revenue data for charts
const generateRevenueData = async (orders, productIds) => {
  // Group orders by date
  const ordersByDate = {};
  const ordersByWeek = {};
  const ordersByMonth = {};
  
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dateKey = orderDate.toISOString().split('T')[0];
    const weekKey = getWeekNumber(orderDate);
    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate this order's revenue from vendor's products
    const orderRevenue = order.items.reduce((sum, item) => {
      if (productIds.some(id => id.toString() === item.product.toString())) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
    
    // Add to daily revenue
    if (!ordersByDate[dateKey]) {
      ordersByDate[dateKey] = 0;
    }
    ordersByDate[dateKey] += orderRevenue;
    
    // Add to weekly revenue
    if (!ordersByWeek[weekKey]) {
      ordersByWeek[weekKey] = 0;
    }
    ordersByWeek[weekKey] += orderRevenue;
    
    // Add to monthly revenue
    if (!ordersByMonth[monthKey]) {
      ordersByMonth[monthKey] = 0;
    }
    ordersByMonth[monthKey] += orderRevenue;
  });
  
  // Format data for charts
  const daily = Object.keys(ordersByDate)
    .sort()
    .slice(-7) // Last 7 days
    .map(date => ({
      date: date,
      amount: ordersByDate[date]
    }));
  
  const weekly = Object.keys(ordersByWeek)
    .sort()
    .slice(-4) // Last 4 weeks
    .map(week => ({
      week: `Week ${week.split('-')[1]}`,
      amount: ordersByWeek[week]
    }));
  
  const monthly = Object.keys(ordersByMonth)
    .sort()
    .slice(-6) // Last 6 months
    .map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        amount: ordersByMonth[month]
      };
    });
  
  return { daily, weekly, monthly };
};

// Helper function to get week number
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return `${date.getFullYear()}-${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
};

// Helper function to get top selling products
const getTopSellingProducts = (orders, products, productIds) => {
  // Create a map to track sales and revenue by product
  const productSales = {};
  
  // Initialize with all products
  products.forEach(product => {
    productSales[product._id.toString()] = {
      id: product._id.toString(),
      name: product.name,
      sales: 0,
      revenue: 0
    };
  });
  
  // Count sales from orders
  orders.forEach(order => {
    order.items.forEach(item => {
      const productId = item.product.toString();
      if (productIds.includes(productId) && productSales[productId]) {
        productSales[productId].sales += item.quantity;
        productSales[productId].revenue += item.price * item.quantity;
      }
    });
  });
  
  // Convert to array and sort by sales
  return Object.values(productSales)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5); // Top 5 products
};

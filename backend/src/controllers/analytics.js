const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('express-async-handler')
const { exportToCSV, importFromCSV } = require('../utils/csv')
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
      fs.mkdirSync(dir, { recursive: true })
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
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
    { label: 'Product ID', value: '_id' },
    { label: 'Name', value: 'name' },
    { label: 'Description', value: 'description' },
    { label: 'Price', value: 'price' },
    { label: 'Stock', value: 'stock' },
    { label: 'Category', value: 'category' },
    { label: 'Shop', value: 'shop.name' },
    { label: 'Rating', value: 'rating' },
    { label: 'Is Active', value: 'isActive' },
    { label: 'Created At', value: 'createdAt' },
  ]

  // Export data to CSV
  const filePath = await exportToCSV(products, fields, 'products')
  
  // Read the generated file and send it directly
  const csvData = fs.readFileSync(filePath, 'utf8')
  
  // Set headers for direct download
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=products-export-${Date.now()}.csv`)
  
  // Send the file contents directly
  return res.send(csvData)
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
    const shops = await Shop.find({ owner: req.user.id })
    const shopIds = shops.map((shop) => shop._id)

    // If specific shop is requested, ensure it's in the vendor's shops
    if (shopId) {
      if (!shopIds.includes(shopId)) {
        return next(new ErrorResponse('Not authorized to access this shop', 403))
      }
      // Find orders containing items from this shop
      query = { 'items.shop': shopId }
    } else {
      // Find orders containing items from any of the vendor's shops
      query = { 'items.shop': { $in: shopIds } }
    }
  } else if (req.user.role === 'admin' && shopId) {
    // Admin can filter by specific shop
    query = { 'items.shop': shopId }
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
    { label: 'Order ID', value: '_id' },
    { label: 'Customer', value: 'customerName' },
    { label: 'Email', value: 'customerEmail' },
    { label: 'Items', value: 'items' },
    { label: 'Total Price', value: 'totalPrice' },
    { label: 'Status', value: 'status' },
    { label: 'Payment Method', value: 'payment.method' },
    { label: 'Payment Status', value: 'payment.status' },
    { label: 'Shipping Address', value: 'shippingAddress' },
    { label: 'Created At', value: 'createdAt' },
    { label: 'Updated At', value: 'updatedAt' },
  ]

  // Export data to CSV
  const filePath = await exportToCSV(csvData, fields, 'orders')
  
  // Read the generated file and send it directly
  const csvContent = fs.readFileSync(filePath, 'utf8')
  
  // Set headers for direct download
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.csv`)
  
  // Send the file contents directly
  return res.send(csvContent)
})

/**
 * @desc    Export revenue data as CSV
 * @route   GET /api/v1/analytics/export/revenue
 * @access  Private/Vendor or Admin
 */
exports.exportRevenue = asyncHandler(async (req, res, next) => {
  const shopId = req.query.shop
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null
  const period = req.query.period || 'monthly' // Default to monthly (daily, weekly, monthly)

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

  // Build query to get all vendor's products
  let vendorProducts = []
  if (req.user.role === 'vendor') {
    vendorProducts = await Product.find({ vendor: req.user.id })
  } else if (shopId) {
    vendorProducts = await Product.find({ shop: shopId })
  } else {
    return next(new ErrorResponse('Shop ID is required for revenue export', 400))
  }

  const productIds = vendorProducts.map(product => product._id)

  // Build query for orders
  let query = {
    'items.product': { $in: productIds }
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

  // Get all orders containing the vendor's products
  const orders = await Order.find(query).populate('items.product', 'name price').lean()

  // Prepare data for CSV based on the period
  let csvData = []
  if (period === 'daily') {
    // Group by day
    const dailyRevenue = {}
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const dateKey = orderDate.toISOString().split('T')[0] // YYYY-MM-DD

      if (!dailyRevenue[dateKey]) {
        dailyRevenue[dateKey] = {
          date: dateKey,
          revenue: 0,
          orders: 0,
          items: 0
        }
      }

      // Calculate revenue from this vendor's products only
      let dailyItems = 0
      let dailyRevenue = 0
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product._id.toString())) {
          dailyItems += item.quantity
          dailyRevenue += item.price * item.quantity
        }
      })

      dailyRevenue[dateKey].revenue += dailyRevenue
      dailyRevenue[dateKey].orders += 1
      dailyRevenue[dateKey].items += dailyItems
    })

    // Convert to array for CSV
    csvData = Object.values(dailyRevenue).sort((a, b) => new Date(a.date) - new Date(b.date))
  } else if (period === 'weekly') {
    // Group by week (using ISO week numbering)
    const weeklyRevenue = {}
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const weekKey = getWeekNumber(orderDate)

      if (!weeklyRevenue[weekKey]) {
        weeklyRevenue[weekKey] = {
          week: weekKey,
          weekLabel: `Week ${weekKey.split('-')[1]} of ${weekKey.split('-')[0]}`,
          revenue: 0,
          orders: 0,
          items: 0
        }
      }

      // Calculate revenue from this vendor's products only
      let weeklyItems = 0
      let weekRevenue = 0
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product._id.toString())) {
          weeklyItems += item.quantity
          weekRevenue += item.price * item.quantity
        }
      })

      weeklyRevenue[weekKey].revenue += weekRevenue
      weeklyRevenue[weekKey].orders += 1
      weeklyRevenue[weekKey].items += weeklyItems
    })

    // Convert to array for CSV
    csvData = Object.values(weeklyRevenue).sort((a, b) => {
      const [aYear, aWeek] = a.week.split('-').map(Number)
      const [bYear, bWeek] = b.week.split('-').map(Number)
      return aYear !== bYear ? aYear - bYear : aWeek - bWeek
    })
  } else {
    // Group by month (default)
    const monthlyRevenue = {}
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      const monthName = orderDate.toLocaleString('default', { month: 'long' })

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = {
          month: monthKey,
          monthLabel: `${monthName} ${orderDate.getFullYear()}`,
          revenue: 0,
          orders: 0,
          items: 0
        }
      }

      // Calculate revenue from this vendor's products only
      let monthlyItems = 0
      let monthRevenue = 0
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product._id.toString())) {
          monthlyItems += item.quantity
          monthRevenue += item.price * item.quantity
        }
      })

      monthlyRevenue[monthKey].revenue += monthRevenue
      monthlyRevenue[monthKey].orders += 1
      monthlyRevenue[monthKey].items += monthlyItems
    })

    // Convert to array for CSV
    csvData = Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month))
  }

  // Define CSV fields based on the period
  const periodField = period === 'daily' ? 'date' : period === 'weekly' ? 'weekLabel' : 'monthLabel'
  
  const fields = [
    { label: period === 'daily' ? 'Date' : period === 'weekly' ? 'Week' : 'Month', value: periodField },
    { label: 'Revenue (INR)', value: 'revenue' },
    { label: 'Orders', value: 'orders' },
    { label: 'Items Sold', value: 'items' }
  ]

  // Export data to CSV
  const filePath = await exportToCSV(csvData, fields, `revenue-${period}`)
  
  // Read the generated file and send it directly
  const csvContent = fs.readFileSync(filePath, 'utf8')
  
  // Set headers for direct download
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=revenue-${period}-export-${Date.now()}.csv`)
  
  // Send the file contents directly
  return res.send(csvContent)
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

  // If request is for sample format, provide it
  if (req.query.format === 'sample') {
    const sampleFormat = {
      fields: [
        'name', 'description', 'price', 'stock', 'category',
        'isActive', 'images', 'specifications'
      ],
      sample: 'name,description,price,stock,category,isActive,images,specifications\n' +
        '"Product Name","Product description goes here",299.99,100,"Electronics",true,"https://example.com/image1.jpg,https://example.com/image2.jpg","{"color":"black","weight":"200g"}"\n' +
        '"Another Product","Another description",99.99,50,"Clothing",true,"https://example.com/image3.jpg","{"size":"M","material":"cotton"}"'
    };

    return res.status(200).json({
      success: true,
      data: {
        format: sampleFormat
      }
    });
  }

  // Validate shop ownership
  let shop;
  if (shopId === 'current') {
    // Find the vendor's shop
    const shops = await Shop.find({ owner: req.user.id });
    if (shops.length === 0) {
      return next(new ErrorResponse('No shop found for this vendor', 404));
    }
    shop = shops[0]; // Use the first shop if multiple exist
  } else {
    shop = await Shop.findById(shopId);
    if (!shop) {
      return next(new ErrorResponse('Shop not found', 404));
    }

    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to add products to this shop', 403));
    }
  }

  try {
    // Process the CSV file
    const result = await importFromCSV(req.file.path, async (row) => {
      // Basic validation
      console.log("ROW ", row)
      if (!row.name || !row.price) {
        throw new Error('Product name and price are required');
      }

      // Create new product
      let product = new Product({
        name: row.name,
        description: row.description || '',
        price: parseFloat(row.price),
        type: row.type || 'product',
        stock: parseInt(row.stock || 0),
        units: row.units || 'kg',
        category: row.category || 'Uncategorized',
        isActive: true,
        shop: req.user.shop_id,
        image: row.images,
        vendor: req.user.id,
      });

      // Save the new product
      try {
        await product.save();
      } catch (error) {
        console.log("ERROR ", error)
      }
      return { action: 'created', product };

    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Products imported successfully',
        processed: result.processed
      },
    });
  } catch (error) {
    // If it's a format error, provide the correct format
    if (error.message.includes('format') || error.message.includes('required')) {
      const sampleFormat = {
        fields: [
          'name', 'description', 'price', 'stock', 'category',
          'isActive', 'images', 'specifications'
        ],
        sample: 'name,description,price,stock,category,isActive,images,specifications\n' +
          '"Product Name","Product description goes here",299.99,100,"Electronics",true,"https://example.com/image1.jpg,https://example.com/image2.jpg","{"color":"black","weight":"200g"}"\n' +
          '"Another Product","Another description",99.99,50,"Clothing",true,"https://example.com/image3.jpg","{"size":"M","material":"cotton"}"'
      };

      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid CSV format',
        data: {
          format: sampleFormat
        }
      });
    }

    return next(new ErrorResponse(error.message || 'Error processing CSV file', 400));
  } finally {
    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });
  }
});

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

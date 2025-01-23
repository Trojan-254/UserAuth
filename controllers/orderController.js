const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Helper function to build filter query
const buildFilterQuery = (filterParams, sellerId) => {
  const query = { seller: sellerId };
  
  if (filterParams.status) {
    query.status = filterParams.status;
  }
  
  if (filterParams.dateFrom || filterParams.dateTo) {
    query.createdAt = {};
    if (filterParams.dateFrom) {
      query.createdAt.$gte = new Date(filterParams.dateFrom);
    }
    if (filterParams.dateTo) {
      query.createdAt.$lte = new Date(filterParams.dateTo);
    }
  }
  
  if (filterParams.search) {
    query.$or = [
      { orderNumber: { $regex: filterParams.search, $options: 'i' } },
      { 'customer.name': { $regex: filterParams.search, $options: 'i' } },
      { 'customer.phone': { $regex: filterParams.search, $options: 'i' } }
    ];
  }
  
  return query;
};

exports.getOrders = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build filter query
  const filterQuery = buildFilterQuery(req.query, req.seller._id);
  
  // Get orders with pagination
  const orders = await Order.find(filterQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('customer', 'name phone email')
    .lean();
    
  // Get total counts for different order statuses
  const [
    totalOrders,
    newOrders,
    processingOrders,
    deliveredOrders,
    returnOrders
  ] = await Promise.all([
    Order.countDocuments(filterQuery),
    Order.countDocuments({ ...filterQuery, status: 'new' }),
    Order.countDocuments({ ...filterQuery, status: 'processing' }),
    Order.countDocuments({ ...filterQuery, status: 'delivered' }),
    Order.countDocuments({ ...filterQuery, status: 'returned' })
  ]);
  
  // Calculate pagination info
  const totalPages = Math.ceil(totalOrders / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  // Format orders for display
  const formattedOrders = orders.map(order => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    itemCount: order.items.length,
    totalAmount: order.totalAmount,
    status: order.status,
    date: order.createdAt.toLocaleDateString(),
    items: order.items
  }));
  
  res.render('seller/orders', {
    seller: req.seller,
    orders: formattedOrders,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      totalOrders
    },
    stats: {
      newOrders,
      processingOrders,
      deliveredOrders,
      returnOrders
    },
    filters: req.query
  });
});

// Get single order details
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    seller: req.seller._id
  }).populate('customer', 'name phone email address');
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }
  
  res.render('seller/order-details', {
    seller: req.seller,
    order
  });
});

// Update order status
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!allowedStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }
  
  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.orderId,
      seller: req.seller._id
    },
    {
      status,
      statusUpdatedAt: Date.now()
    },
    { new: true }
  );
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }
  
  // Send notification to customer about status update
  // await notifyCustomer(order);
  
  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// Export orders
exports.exportOrders = catchAsync(async (req, res) => {
  const filterQuery = buildFilterQuery(req.query, req.seller._id);
  
  const orders = await Order.find(filterQuery)
    .sort({ createdAt: -1 })
    .populate('customer', 'name phone email')
    .lean();
  
  // Format orders for CSV
  const csvData = orders.map(order => ({
    'Order Number': order.orderNumber,
    'Customer Name': order.customer.name,
    'Customer Phone': order.customer.phone,
    'Items': order.items.length,
    'Total Amount': order.totalAmount,
    'Status': order.status,
    'Date': order.createdAt.toLocaleDateString()
  }));
  
  // Generate and send CSV file
  const csv = await generateCSV(csvData);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
  res.send(csv);
});

// Middleware to check if seller owns the order
exports.checkOrderOwnership = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    seller: req.seller._id
  });
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }
  
  req.order = order;
  next();
});
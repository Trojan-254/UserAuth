const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const mpesa = require('../utils/mpesa');
const { Product } = require('../models/Product');

// Validation middleware
const validateShippingDetails = (req, res, next) => {
  const required = ['firstName', 'lastName', 'phone', 'email', 'address', 'city', 'county', 'postalCode'];
  const missing = required.filter(field => !req.body[field]);
  
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }
  next();
};

const validateOrder = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');
    
    if (!cart?.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Verify all products are still available
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product ? product.name : 'Product'} is out of stock`
        });
      }
    }

    req.cart = cart;
    next();
  } catch (error) {
    next(error);
  }
};

// Helper functions
const calculateOrderTotals = (cartTotal) => {
  const subtotal = cartTotal;
  const shipping = 0;
  const tax = subtotal * 0.16;
  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax
  };
};

const createOrderFromCart = (config) => {
  const {
    customer,
    cart,
    shippingDetails,
    totals,
    seller,
    orderNumber
  } = config;

  return new Order({
    orderNumber,
    customer,
    seller,
    items: cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,
      status: 'pending'
    })),
    totalAmount: totals.total,
    shipping: {
      address: {
        street: shippingDetails.address,
        city: shippingDetails.city,
        county: shippingDetails.county
      },
      customerShippingDetails: {
        firstName: shippingDetails.firstName,
        lastName: shippingDetails.lastName,
        phone: shippingDetails.phone,
        email: shippingDetails.email
      },
      cost: totals.shipping
    },
    commission: {
      percentage: 10, //get this from seller settings
      amount: totals.total * 0.1
    },
    payment: {
      method: 'mpesa', 
      status: 'pending',
      amount: totals.total
    }
  });
};

// Get checkout page
router.get('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product')
      .lean();

    if (!cart?.items?.length) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/my-cart');
    }

    const totals = calculateOrderTotals(cart.totalAmount);
    res.render('checkout/index', { cart, totals });
  } catch (error) {
    console.error('Checkout page error:', error);
    //req.flash('error', 'Unable to load checkout page');
    res.redirect('/cart');
  }
});

// Process shipping and create order
router.post('/process', [auth, validateShippingDetails, validateOrder], async (req, res) => {
  try {
    const totals = calculateOrderTotals(req.cart.totalAmount);
    const order = createOrderFromCart({
      customer: req.user.id,
      seller: req.cart.items[0].product.seller,
      cart: req.cart,
      shippingDetails: req.body,
      totals: totals,
      orderNumber: 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    });

    await order.save();

    // Clear the cart
    await Cart.findOneAndDelete({ user: req.user.id });

    // Redirect to payment page
    res.json({
      success: true,
      orderId: order._id,
      redirectUrl: `/checkout/zetupay/payment/${order._id}`
    });
  } catch (error) {
    console.error('Order processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process order'
    });
  }
});

// ZetuPay payment page
router.get('/zetupay/payment/:orderId', auth, async (req, res) => {
  // console.log('Order ID: ', req.params.orderId);
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      customer: req.user.id
    }).populate('items.product');

    // console.log("Order is being extracted");
    // console.log("Order: ", order);
    
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/orders/my-orders');
    }

    if (order.paymentStatus === 'completed') {
      req.flash('info', 'This order has already been paid');
      return res.redirect(`/orders/${order._id}`);
    }

    res.render('checkout/payment', { order });
  } catch (error) {
    console.error('Payment page error:', error);
    req.flash('error', 'Unable to load payment page');
    res.redirect('/orders');
  }
});





module.exports = router;

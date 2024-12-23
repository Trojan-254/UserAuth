const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const mpesa = require('../utils/mpesa');

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

// Helper functions
const calculateOrderTotals = (cartTotal) => {
  const subtotal = cartTotal;
  const shipping = 300;
  const tax = subtotal * 0.16;
  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax
  };
};

const createOrderFromCart = (userId, cart, shippingDetails, totals) => {
  return new Order({
    user: userId,
    items: cart.items,
    shippingAddress: shippingDetails,
    totalAmount: totals.total,
    subtotal: totals.subtotal,
    tax: totals.tax,
    shipping: totals.shipping,
    orderStatus: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date()
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
router.post('/process', [auth, validateShippingDetails], async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product')
      .lean();

    if (!cart?.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Verify products are still in stock
    const outOfStock = cart.items.find(item => 
      item.quantity > item.product.stockQuantity
    );

    if (outOfStock) {
      return res.status(400).json({
        success: false,
        message: `${outOfStock.product.name} is out of stock`
      });
    }

    const totals = calculateOrderTotals(cart.totalAmount);
    const order = createOrderFromCart(
      req.user.id,
      cart,
      req.body,
      totals
    );

    await order.save();

    // Generate payment URL
    const zetuPayURL = `/checkout/zetupay/payment/${order._id}`;
    
    // Clear cart after successful order creation
    await Cart.findOneAndDelete({ user: req.user.id });

    res.json({
      success: true,
      orderId: order._id,
      redirectUrl: zetuPayURL
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
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id
    }).populate('items.product');
    
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/orders');
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

// M-Pesa callback URL
router.post('/mpesa/callback', async (req, res) => {
  try {
    const { Body: { stkCallback } } = req.body;
    
    const order = await Order.findOne({
      'mpesaDetails.checkoutRequestID': stkCallback.CheckoutRequestID
    });

    if (!order) {
      console.error('Order not found for CheckoutRequestID:', stkCallback.CheckoutRequestID);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (stkCallback.ResultCode === 0) {
      const mpesaReceipt = stkCallback.CallbackMetadata.Item.find(
        item => item.Name === 'MpesaReceiptNumber'
      )?.Value;

      if (!mpesaReceipt) {
        throw new Error('M-Pesa receipt number not found in callback');
      }

      // Update order status
      order.paymentStatus = 'completed';
      order.orderStatus = 'processing';
      order.mpesaDetails = {
        ...order.mpesaDetails,
        mpesaReceiptNumber: mpesaReceipt,
        paymentCompletedAt: new Date()
      };

      // Update product stock quantities
      await Promise.all(order.items.map(async (item) => {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: -item.quantity }
        });
      }));
    } else {
      order.paymentStatus = 'failed';
      order.mpesaDetails.failureReason = stkCallback.ResultDesc;
    }

    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process payment callback'
    });
  }
});

module.exports = router;

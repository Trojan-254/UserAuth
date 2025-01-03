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
  const shipping = 0;
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

// Initiate M-Pesa payment
router.post('/api/payments/mpesa/initiate', auth, async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body;

    // Validate phone number format
    if (!mpesa.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      paymentStatus: 'pending'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or already paid'
      });
    }

    // Initiate STK push using your existing mpesa utility
    const stkPushResponse = await mpesa.initiateSTKPush(
      phoneNumber,
      order.totalAmount,
      order._id
    );

    // Update order with M-Pesa transaction details
    order.mpesaDetails = {
      checkoutRequestID: stkPushResponse.CheckoutRequestID,
      merchantRequestID: stkPushResponse.MerchantRequestID,
      phoneNumber: phoneNumber,
      amount: order.totalAmount,
      initiatedAt: new Date()
    };

    await order.save();

    res.json({
      success: true,
      message: 'Check your phone for the M-Pesa prompt',
      checkoutRequestID: stkPushResponse.CheckoutRequestID
    });

  } catch (error) {
    console.error('M-Pesa payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to initiate M-Pesa payment'
    });
  }
});


// Update the M-Pesa callback handler to work with the new flow
router.post('/api/mpesa/callback', async (req, res) => {
  try {
    const { Body: { stkCallback } } = req.body;
    
    const order = await Order.findOne({
      'mpesaDetails.checkoutRequestID': stkCallback.CheckoutRequestID
    });

    if (!order) {
      console.error('Order not found for CheckoutRequestID:', stkCallback.CheckoutRequestID);
      return res.status(404).json({ success: false });
    }

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const mpesaReceipt = stkCallback.CallbackMetadata.Item.find(
        item => item.Name === 'MpesaReceiptNumber'
      )?.Value;

      order.paymentStatus = 'completed';
      order.orderStatus = 'processing';
      order.mpesaDetails.mpesaReceiptNumber = mpesaReceipt;
      order.mpesaDetails.paymentCompletedAt = new Date();
    } else {
      // Payment failed
      order.paymentStatus = 'failed';
      order.mpesaDetails.failureReason = stkCallback.ResultDesc;
    }

    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ success: false });
  }
});



router.get('/api/payments/mpesa/status/:checkoutRequestId', auth, async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    // First check if payment is already marked as completed in our database
    const order = await Order.findOne({
      'mpesaDetails.checkoutRequestID': checkoutRequestId,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'completed') {
      return res.json({
        success: true,
        status: 'completed'
      });
    }

    // If not completed, check with M-Pesa
    const statusResponse = await mpesa.checkTransactionStatus(checkoutRequestId);

    if (statusResponse.success) {
      // Update order status if payment is successful
      order.paymentStatus = 'completed';
      order.orderStatus = 'processing';
      await order.save();
    }

    return res.json({
      success: statusResponse.success,
      status: statusResponse.success ? 'completed' : 'pending',
      message: statusResponse.message
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to check payment status'
    });
  }
});



module.exports = router;

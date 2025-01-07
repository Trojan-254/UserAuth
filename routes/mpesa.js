const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const mpesa = require('../utils/mpesa');

// Initiate M-Pesa payment
router.post('/payments/mpesa/initiate', auth, async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body;

    // Validate required fields
    if (!orderId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and phone number are required'
      });
    }

    // Validate phone number format
    if (!mpesa.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      });
    }

    // Find the order
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

    // Initiate STK push
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

// Check payment status
router.get('/payments/mpesa/status/:checkoutRequestId', auth, async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

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

    res.json({
      status: order.paymentStatus,
      orderId: order._id,
      message: order.mpesaDetails?.failureReason || ''
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to check payment status'
    });
  }
});

// Check the transaction status
router.get('/payments/mpesa/transaction/:checkoutRequestId', auth, async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    const status = await mpesa.checkTransactionStatus(checkoutRequestId);

    res.json(status);

  } catch (error) {
    console.error('Transaction status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to check transaction status'
    });
  }
});

module.exports = router;

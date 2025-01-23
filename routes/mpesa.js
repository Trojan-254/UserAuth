const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const mpesa = require('../utils/mpesa');

// Initiate M-Pesa payment
router.post('/payments/mpesa/initiate', auth, async (req, res) => {
  console.log("Initiating payment");
  try {
    const { orderId, phoneNumber } = req.body;
    console.log("Order ID: ", orderId);
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
      customer: req.user.id,
      // payment.status: 'pending'
    });
    // console.log("Order found: ", order);

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

    res.json({
      success: true,
      message: 'Check your phone for the M-Pesa prompt',
      checkoutRequestID: stkPushResponse.CheckoutRequestID
    });
    console.log("Payment initiated successfully");

  } catch (error) {
    console.error('M-Pesa payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to initiate M-Pesa payment'
    });
  }
});

// Combined status check endpoint for polling
router.get('/payments/mpesa/status/:checkoutRequestId', auth, async (req, res) => {
  // console.log("Checking payment status, standby...");

  // Introduce a 5-second delay before executing any logic
  setTimeout(async () => {
    try {
      const { checkoutRequestId } = req.params;
      console.log("Checkout Request ID: ", checkoutRequestId);

      // First check database for completed payment
      const order = await Order.findOne({
        'mpesaDetails.checkoutRequestID': checkoutRequestId,
        customer: req.user.id
      });

      // console.log("Order found: ", order);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // If payment is already marked as completed or failed in database, return that status
      if (order.paymentStatus === 'completed') {
        return res.json({
          success: true,
          status: 'completed',
          orderId: order._id,
          message: 'Payment completed successfully'
        });
      }

      if (order.paymentStatus === 'failed') {
        return res.json({
          success: false,
          status: 'failed',
          orderId: order._id,
          message: order.mpesaDetails?.failureReason || 'Payment failed'
        });
      }

      // If payment is still pending, check with M-Pesa API
      const transactionStatus = await mpesa.checkTransactionStatus(checkoutRequestId);

      // console.log("Transaction status: ", transactionStatus);
      // Handle different status responses
      if (transactionStatus.status === 'completed') {
        // Update order status in database
        order.paymentStatus = 'completed';
        order.orderStatus = 'processing';
        await order.save();

        return res.json({
          success: true,
          status: 'completed',
          orderId: order._id,
          message: 'Payment completed successfully'
        });
      }

      if (transactionStatus.status === 'failed') {
        // Update order status in database
        order.paymentStatus = 'failed';
        order.mpesaDetails.failureReason = transactionStatus.message;
        await order.save();

        return res.json({
          success: false,
          status: 'failed',
          orderId: order._id,
          message: transactionStatus.message
        });
      }

      // If still processing, return 202 status code
      return res.status(202).json({
        success: true,
        status: 'pending',
        orderId: order._id,
        message: 'Payment is being processed'
      });

    } catch (error) {
      console.error('Payment status check error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to check payment status'
      });
    }
  }, 10000); // 5-second delay
});
module.exports = router;
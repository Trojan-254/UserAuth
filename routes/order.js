const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/authMiddleware');

// Get all orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id });
    res.render('order/view', { orders });
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Cancel order
router.put('/cancel-order/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (order.orderStatus !== 'pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }
    order.orderStatus = 'cancelled';
    await order.save();
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

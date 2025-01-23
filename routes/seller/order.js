const router = require('express').Router();
const orderController = require('../../controllers/orderController');
const { verifySeller, auth } = require('../../middleware/authMiddleware');

//routes
router.get('/orders', verifySeller, orderController.getOrders);
router.get('/orders/export', verifySeller, orderController.exportOrders);
router.get('/orders/:orderId', verifySeller, orderController.checkOrderOwnership, orderController.getOrderDetails);
router.patch('/orders/:orderId/status', verifySeller, orderController.checkOrderOwnership, orderController.updateOrderStatus);

//USER ROUTES
router.get('/my-orders', auth, async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user.id });
      res.render('order/view', { orders });
    } catch (error) {
      console.error("Order error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get a single order
  // Get single order
  router.get('/:id', auth, async (req, res) => {
    try {
      // Find the order by ID
      const order = await Order.findById(req.params.id);
  
      // Check if the order exists
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      // Check if the order belongs to the authenticated user
      if (order.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to view this order' });
      }
  
      // Return the order details
      res.json(order);
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
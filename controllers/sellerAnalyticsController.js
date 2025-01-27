const Seller = require('../models/Seller');
const Order = require('../models/Order');
const { Product } = require('../models/Product');


const sellerAnalyticsController = {
    getDashboard: async (req, res) => {
        try {
            // Fetch seller data
            const seller = await Seller.findById(req.seller.id);
            if (!seller) {
                return res.status(404).redirect('/seller/auth/login');
            }
    
            // Get today's date at midnight for comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            // Fetch today's orders
            const todayOrders = await Order.countDocuments({
                seller: req.seller.id,
                createdAt: { $gte: today }
            });
     
            // Calculate today's revenue
            const todayRevenue = await Order.aggregate([
                {
                    $match: {
                        seller: req.seller.id,
                        createdAt: { $gte: today }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);
    
            // Fetch low stock items
            const lowStockItems = await Product.find({
                seller: req.seller.id,
                stock: { $lte: 10 }
            }).limit(5);
    
            // Fetch recent orders with necessary fields
            const recentOrders = await Order.find({ seller: req.seller.id })
                .select('orderNumber customerName totalAmount orderStatus _id createdAt')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()  // Convert to plain JavaScript objects
                .then(orders => orders.map(order => ({
                    ...order,
                    status: order.orderStatus || 'pending',  // Provide default status if undefined
                    customerName: order.customerName || 'Customer',  // Provide default customer name
                    totalAmount: order.totalAmount || 0  // Provide default amount
                })));
    
            // Mock activities for demonstration
            const activities = [
                { 
                    icon: 'shopping-cart',
                    message: 'New order received #1234',
                    time: '2 minutes ago'
                },
                {
                    icon: 'star',
                    message: 'New review from Customer',
                    time: '1 hour ago'
                },
                {
                    icon: 'box',
                    message: 'Product stock updated',
                    time: '3 hours ago'
                }
            ];
    
            // Render dashboard with all required data
            res.render('seller/dashboard', {
                seller,
                todayOrders,
                todayRevenue: todayRevenue[0]?.total || 0,
                lowStockCount: lowStockItems.length,
                lowStockItems,
                recentOrders,
                activities
            });
    
        } catch (error) {
            console.error('Dashboard Error:', error);
            res.status(500).send('Server error occurred');
        }
    }
};

module.exports = sellerAnalyticsController;
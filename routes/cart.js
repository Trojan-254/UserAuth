const express = require('express');
const router = express.Router();
const { Product } = require('../models/Product');
const auth = require('../middleware/authMiddleware');
const Cart = require('../models/Cart');

// Get user Cart
router.get('/my-cart', auth, async (req, res) => {
  try {
    console.log("User data", req.user);
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');

    console.log("Cart found: ", cart);
    if (!cart) {
      console.log("No cart found, creating new cart", req.user.id);
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }
    res.render('cart/view', { cart });
  } catch (error) {
    console.error("Cart error:", error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity, price } = req.body;
    
    // Validate inputs
    if (!productId || !quantity || !price) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const existingItem = cart.items.find(item => 
      item.product.toString() === productId
    );
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      cart.items.push({
        product: productId,
        quantity: parseInt(quantity),
        price: parseFloat(price)
      });
    }

    await cart.save();
    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);

    res.status(201).json({ 
      success: true, 
      message: 'Added to cart successfully', 
      totalItems
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});


// Remove from Cart
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    cart.items = cart.items.filter(item => 
      item.product.toString() !== req.params.productId
    );
    await cart.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;

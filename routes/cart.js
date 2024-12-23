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
    res.status(500).json({ message: error.message });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  console.log("Add to cart request body:", req.body);
  try {
    const { productId, quantity, price } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    console.log("Existing cart:", cart); // Log existing cart
    if (!cart) {
       console.log("Creating new cart");
       cart = new Cart({ user: req.user.id, items: [] });
    }

    const existingItem = cart.items.find(item => 
        item.product.toString() === productId
    );
    if (existingItem) {
       console.log("Updating existing item");
       existingItem.quantity += parseInt(quantity);
    } else {
      console.log("Adding new item");
      cart.items.push({
        product: productId,
        quantity: parseInt(quantity),
        price: parseFloat(price)
     });
    }

   console.log("Cart before save:", cart); // Log cart before saving
    await cart.save();
    console.log("Cart saved successfully");
   
   res.redirect('/cart');
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: error.message });
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

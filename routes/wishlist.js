const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');

// Get user's wishlist
router.get('/', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'products.product',
        select: 'name images price description category inStock'
      });

    if (!wishlist) {
      // Create new wishlist if none exists
      const newWishlist = new Wishlist({ user: req.user.id, products: [] });
      await newWishlist.save();
      return res.render('wishlist/view', { wishlist: newWishlist });
    }

    // Check stock status and price changes for each product
    for (let item of wishlist.products) {
      const currentProduct = await Product.findById(item.product._id);
      if (currentProduct) {
        item.inStock = currentProduct.inStock;
        if (currentProduct.price !== item.price) {
          item.previousPrice = item.price;
          item.price = currentProduct.price;
          item.priceDropAlert = currentProduct.price < item.previousPrice;
        }
      }
    }
    await wishlist.save();

    res.render('wishlist/view', { wishlist });
  } catch (error) {
    console.error('Wishlist error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add product to wishlist
router.post('/add/:productId', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
    }

    // Check if product already exists in wishlist
    if (wishlist.products.some(item => item.product.toString() === req.params.productId)) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    wishlist.products.push({
      product: product._id,
      price: product.price,
      inStock: product.inStock
    });

    await wishlist.save();
    res.json({ message: 'Product added to wishlist' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Remove product from wishlist
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = wishlist.products.filter(
      item => item.product.toString() !== req.params.productId
    );

    await wishlist.save();
    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Share wishlist
router.post('/share', auth, async (req, res) => {
  try {
    const { email, isPublic } = req.body;
    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    if (email) {
      wishlist.sharedWith.push({ email });
    }

    if (typeof isPublic === 'boolean') {
      wishlist.isPublic = isPublic;
    }

    await wishlist.save();
    res.json({ message: 'Wishlist sharing updated' });
  } catch (error) {
    console.error('Share wishlist error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

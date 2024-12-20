// Product routes
const express = require('express');
const router = express.Router();
const { Product } = require('../models/Product');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// Get all products with filtering and pagination
router.get('/', async(req, res) => {
    try{
       const { category, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

       const query = {};
       if (category) query.category = category;
       if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = Number(minPrice);
          if (maxPrice) query.price.$lte = Number(maxPrice);
         }

       const sortOptions = {};
       if (sort) {
          const [field, order] = sort.split(':');
          sortOptions[field] = order === 'desc' ? -1 : 1;
       }

       const products = await Product.find(query)
         .sort(sortOptions)
         .limit(limit * 1)
         .skip((page - 1) * limit)
         .populate('category');

      const count = await Product.countDocuments(query);

      res.render('products/index', {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        category,
        minPrice,
        maxPrice,
        sort
      });
    } catch(error) {
      res.status(500).json({ message: error.message });
    }
});


// Create a new Product. Only admins can do this shit
router.get('/create-new', (req, res)=> {
    res.render('products/create');
});
router.post('/create-new', [auth, admin], async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.redirect('products');
    } catch(error) {
    res.status(400).json({  message: error.message });
    }
});

// Update the product. priviledges to the admin
router.put('/update-product/:id', [auth, admin], async (req, res) => {
    try{
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
});


// Delete product (admin only)
router.delete('/delete-product/:id', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

// Product routes
const mongoose = require('mongoose');
const multer = require('multer');
const express = require('express');
const router = express.Router();
const { Product } = require('../models/Product');
const { Category } = require('../models/Category');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const { body, validationResult } = require('express-validator');

// File uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
       cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({ storage });

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


// Fetch product details
router.get('//:id', async (req, res) => {
    try {
       const product = await Product.findById(req.params.id);
       if (!product) return res.status(404).send('Product not found');
       res.render('/products/show', { product });
    } catch(error) {
       console.error(error);
       res.status(500).send('Error fetching product');
    }
});

//Route to fetch categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});
 

// Create a new Product. Only admins can do this shit
router.get('/create-new', async (req, res) => {
    try {
        const parentCategories = await Category.find({ parentCategory: null }).select('_id name').lean();
        res.render('products/create', { parentCategories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading categories');
    }
});

router.post('/create-new', upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 3 }
]), async (req, res) => {
    try {
      const {
        name,
        parentCategory,
        childCategory,
        price,
        salePrice,
        stock,
        description,
        sku,
        weight
      } = req.body;

      const mainImage = req.files['mainImage']?.[0]?.path;
      const additionalImages = req.files['additionalImages']?.map(file => file.path);

      const product = new Product({
         name,
         parentCategory: parentCategory._id,
         childCategory: childCategory._id,
         price,
         salePrice,
         stock,
         description,
         mainImage,
         additionalImages,
         sku,
         weight
      });
      await product.save();
      res.status(201).json({
        success: true,
        message: 'Product created succesfully',
        redirect: '/products'
      });
    } catch(error) {
       res.status(400).json({
         success: false,
         message: error.message
       });
    }
});



// PUT /products/:id - Update a product
router.put('/:id', auth, upload.fields([{ name: 'mainImage' }, { name: 'additionalImages' }]), async (req, res) => {
    try {
        const updates = req.body;

        if (req.files['mainImage']) updates.mainImage = req.files['mainImage'][0].path;
        if (req.files['additionalImages']) updates.additionalImages = req.files['additionalImages'].map(file => file.path);

        const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!product) return res.status(404).send('Product not found');
        res.redirect(`/products/${product._id}`);
    } catch (err) {
        res.status(500).send('Error updating product');
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

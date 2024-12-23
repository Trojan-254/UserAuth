const express = require('express');
const router = express.Router();
const { Product } = require('../models/Product'); 
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/authMiddleware')

// Multer configuration for file storage uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
       cb(null, `${Date.now()}-${file.originalname}`)
    }
});

// Multer configuration for file uploads
const upload = multer({ 
   storage,
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
   fileFilter: (req, file, cb) => {
     if (file.mimetype.startsWith('image/')) {
       cb(null, true);
     } else {
       cb(new Error('Not an image! Please upload an image.'), false);
     }
   }
 });

/*
 * Route to create a new product
 * This route can only be accessed by admins
*/
router.post('/create-new', auth,
   upload.fields([
      { name: 'mainImage', maxCount: 1 },
      { name: 'additionalImages', maxCount: 3 }
   ]),
   async (req, res) => {
     try {
       const productData = {
        name: req.body.name,
        price: req.body.price,
        salePrice: req.body.salePrice || undefined,
        stock: req.body.stock,
        description: req.body.description,
        mainImage: req.files.mainImage[0].filename,
        additionalImages: req.files.additionalImages ? 
          req.files.additionalImages.map(file => file.filename) : [],
        sku: req.body.sku || undefined,
        weight: req.body.weight || undefined
       };

       const product = new Product(productData);
       await product.save();

       res.redirect('/products');
     } catch(error) {
        console.log(error);
        res.status(400).json({ message: error.message });
     }
});

// Get create product page with categories
router.get('/create', async (req, res) => {
  try {
    res.render('products/create');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all products with filtering and pagination
router.get('/', async(req, res) => {
    try{
       const { minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

       const query = {};
       
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
         .skip((page - 1) * limit);

      const count = await Product.countDocuments(query);

      res.render('products/index', {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        minPrice,
        maxPrice,
        sort
      });
    } catch(error) {
      res.status(500).json({ message: error.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const Category = require('../models/Category');
const Product = require('../models/Product');
const productController = require('../controllers/productController');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Validation middleware
const productValidation = [
    check('name')
        .notEmpty()
        .trim()
        .withMessage('Product name is required'),
    check('description')
        .notEmpty()
        .withMessage('Description is required'),
    check('price')
        .notEmpty()
        .isNumeric()
        .withMessage('Price must be a valid number'),
    check('stock')
        .notEmpty()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    check('category')
        .notEmpty()
        .withMessage('Category is required'),
    // Optional fields
    check('salePrice')
        .optional()
        .isNumeric()
        .withMessage('Sale price must be a valid number'),
    check('weight')
        .optional()
        .isNumeric()
        .withMessage('Weight must be a valid number'),
    check('sku')
        .optional()
        .trim()
];

// Create a new product
router.post('/create-new', [
    authMiddleware.verifySeller,
    upload.single('mainImage'),
    productValidation,
    productController.createProduct
]);

// Get create product page with categories
router.get('/create', async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('products/create', { categories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all products
router.get('/all', productController.getAllProducts);

// Get all products for a seller
router.get('/seller/all', authMiddleware.verifySeller, productController.getSellerProducts);

// Get a single product
router.get('/:id', productController.getProduct);

// Update a product
router.patch('/:id', authMiddleware.verifySeller, productController.updateProduct);

// Delete a product
router.delete('/:id', authMiddleware.verifySeller, productController.deleteProduct);

// Update product stock
router.patch('/:id/stock', [
    authMiddleware.verifySeller,
    check('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    productController.updateStock
]);

module.exports = router;
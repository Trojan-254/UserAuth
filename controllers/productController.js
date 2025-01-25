const { Product } = require('../models/Product');
const { validationResult } = require('express-validator');
const  Category  = require('../models/Category');
const multer = require('multer');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Seller = require('../models/Seller');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/products/uploads');
        console.log('Upload directory:', uploadDir);
        try {
                // Create directory if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }
    },
    filename: (req, file, cb) => {
        // Create unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const productController = {
    // Create a new product
    createProduct: async (req, res) => {
        try {
            console.log('Creating product:', req.body);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if(!req.file) {
                return res.status(400).json({ error: 'Main image is required' });
            }

            const { sku } = req.body;
            
            // Validate SKU
            if (!sku) {
                return res.status(400).json({ error: 'SKU is required' });
            }

            // Check if SKU already exists
            const existingProduct = await Product.findOne({ 'inventory.sku': sku });
            if (existingProduct) {
                return res.status(400).json({ error: 'SKU already exists' });
            }

            console.log(req.body);
            let category;
            const categoryInput = req.body.category;
            console.log('Category input:', categoryInput);

            // Check if categoryInput is an ObjectId
            if (mongoose.Types.ObjectId.isValid(categoryInput)) {
                category = await Category.findById(categoryInput);
            } else {
                // If not an ObjectId, search by name
                category = await Category.findOne({ name: categoryInput });
            }
            
            if (!category) {
                return res.status(400).json({ error: 'Category not found' });
            }

            // Get seller from authenticated user
            const sellerId = req.seller.id;
            console.log('Seller ID:', sellerId);

            // Create product with category ID and seller ID
            const product = new Product({
                ...req.body,
                mainImage: `${req.file.filename}`,
                category: category._id,
                seller: sellerId,
                inventory: {
                    sku: sku
                }
            });

            await product.save();
            res.status(201).json(product);

        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ error: 'Duplicate SKU value' });
            }
            console.error('Error creating product:', error);
            res.status(500).json({ message: 'Error creating product', error: error.message });
        }
    },

    // Get all products with review info
    getAllProducts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;
            const baseUrl = `${req.protocol}://${req.get('host')}`;
    
            // Build query based on filters
            const query = { isActive: true };
            
            if (req.query.category) {
                const category = await Category.findOne({ name: req.query.category });
                if (category) {
                    query.category = category._id;
                }
            }
    
            const products = await Product.find(query)
                .populate('seller', 'businessName location')
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // console.log('Products:', products);
    
            // Transform product data to include full image URLs and handle missing location
            const transformedProducts = products.map(product => ({
                ...product,
                mainImage: product.mainImage ? `/uploads/${product.mainImage}` : null,
                additionalImages: product.additionalImages?.map(img => `/uploads/products/${img}`) || [],
                seller: {
                    ...product.seller,
                    location: product.seller?.location || 'Location not available'
                }
            }));
            
            // console.log('Transformed products:', transformedProducts);
            const total = await Product.countDocuments(query);
            const categories = await Category.find().lean();
    
            res.render('products/index', {
                products: transformedProducts,
                categories,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalProducts: total,
                selectedCategory: req.query.category || ''
            });
    
        } catch (error) {
            res.status(500).render('error', {
                message: error.message
            });
        }
    },

    // Get all products for a seller
    getSellerProducts: async (req, res) => {
        try {
            const seller = await Seller.findById(req.seller.id).select('businessName');
            console.log('Seller:', seller);
            const { page = 1, limit = 10, status, category } = req.query;
            const query = { seller: req.seller.id };

            if (status) query.status = status;
            if (category) query.category = category;

            const products = await Product.find(query)
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            // console.log('Products:', products);

            const total = await Product.countDocuments(query);

            // res.json({
            //     products,
            //     totalPages: Math.ceil(total / limit),
            //     currentPage: page,
            //     total
            // });
            res.render('seller/products', {
                seller: seller.businessName,    
                products,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total,
                query: req.query,
                categories: await Category.find().lean()
            });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({
                message: 'Error fetching products',
                error: error.message
            });
        }
    },

    // Get a single product by ID
    getProduct: async (req, res) => {
        console.log('Product ID:', req.params.id);
        try {
            const product = await Product.findById(req.params.id)
                .populate('seller', 'businessName location rating')
                .populate({
                    path: 'category',
                    select: 'name'
                })
                .lean();


            if (!product) {
                return res.status(404).render('error', {
                    message: 'Product not found'
                });
            }
            console.log('Product:', product);

            // Get paginated reviews
            const page = parseInt(req.query.reviewPage) || 1;
            const reviewsPerPage = 5;
            const skip = (page - 1) * reviewsPerPage;

            const reviews = await Review.find({ product: product._id })
                .populate('user', 'name avatar')
                .sort({ helpful_votes: -1, createdAt: -1 })
                .skip(skip)
                .limit(reviewsPerPage)
                .lean();

            const totalReviews = await Review.countDocuments({ product: product._id });

            // Get review statistics
            const reviewStats = await Review.aggregate([
                { $match: { product: product._id } },
                { 
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Format review statistics
            const ratingDistribution = Array.from({ length: 5 }, (_, i) => {
                const stat = reviewStats.find(s => s._id === i + 1);
                return {
                    rating: i + 1,
                    count: stat ? stat.count : 0,
                    percentage: stat ? (stat.count / totalReviews) * 100 : 0
                };
            }).reverse();

            // Check if user has purchased the product (for review eligibility)
            let canReview = false;
            if (req.user) {
                canReview = await Order.exists({
                    user: req.user._id,
                    'items.product': product._id,
                    status: 'delivered'
                });
            }

            res.render('products/detail', {
                product,
                reviews,
                totalReviews,
                currentReviewPage: page,
                totalReviewPages: Math.ceil(totalReviews / reviewsPerPage),
                ratingDistribution,
                canReview,
                user: req.user || null
            });

        } catch (error) {
            res.status(500).render('error', {
                message: error.message
            });
        }
    },

    // Update a product
    updateProduct: async (req, res) => {
        try {
            const updates = req.body;
            const allowedUpdates = [
                'name', 'description', 'price', 'salePrice',
                'mainImage', 'additionalImages', 'stock',
                'category', 'specifications', 'status',
                'inventory', 'isActive'
            ];

            // Filter out non-allowed updates
            const filteredUpdates = Object.keys(updates)
                .filter(key => allowedUpdates.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updates[key];
                    return obj;
                }, {});

            const product = await Product.findOneAndUpdate(
                { _id: req.params.id, seller: req.seller.id },
                { $set: filteredUpdates },
                { new: true, runValidators: true }
            );

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found'
                });
            }

            res.json({
                message: 'Product updated successfully',
                product
            });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({
                message: 'Error updating product',
                error: error.message
            });
        }
    },

    // Delete a product
    deleteProduct: async (req, res) => {
        try {
            const product = await Product.findOneAndDelete({
                _id: req.params.id,
                seller: req.seller.id
            });

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found'
                });
            }

            res.json({
                message: 'Product deleted successfully',
                product
            });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({
                message: 'Error deleting product',
                error: error.message
            });
        }
    },

    // Update product stock
    updateStock: async (req, res) => {
        try {
            const { stock } = req.body;
            
            const product = await Product.findOneAndUpdate(
                { _id: req.params.id, seller: req.seller.id },
                { 
                    $set: { 
                        stock,
                        'inventory.quantity': stock,
                        status: stock > 0 ? 'active' : 'out_of_stock'
                    }
                },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found'
                });
            }

            res.json({
                message: 'Stock updated successfully',
                product
            });
        } catch (error) {
            console.error('Update stock error:', error);
            res.status(500).json({
                message: 'Error updating stock',
                error: error.message
            });
        }
    }
};

module.exports = productController;
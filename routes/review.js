const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// Validation middleware
const reviewValidation = [
    check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    check('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
    check('review').trim().isLength({ min: 10, max: 1000 }).withMessage('Review must be between 10 and 1000 characters'),
];

// Create a review
router.post(
    '/product/:productId',
    authMiddleware.verifyUser,
    reviewValidation,
    reviewController.createReview
);

// Get reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

// Update a review
router.put(
    '/:reviewId',
    authMiddleware.verifyUser,
    reviewValidation,
    reviewController.updateReview
);

// Delete a review
router.delete(
    '/:reviewId',
    authMiddleware.verifyUser,
    reviewController.deleteReview
);

// Vote review as helpful
router.post(
    '/:reviewId/helpful',
    authMiddleware.verifyUser,
    reviewController.voteReviewHelpful
);

module.exports = router;
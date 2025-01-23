const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

const reviewController = {
    // Create a new review
    createReview: async (req, res) => {
        try {
            const { productId } = req.params;
            const userId = req.user._id;

            // Check if user has purchased the product
            const hasOrdered = await Order.exists({
                user: userId,
                'items.product': productId,
                status: 'delivered'
            });

            // Create the review
            const review = new Review({
                user: userId,
                product: productId,
                rating: req.body.rating,
                title: req.body.title,
                review: req.body.review,
                images: req.body.images || [],
                verified_purchase: hasOrdered
            });

            await review.save();

            res.status(201).json({
                success: true,
                message: 'Review posted successfully',
                review
            });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this product'
                });
            }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get reviews for a product
    getProductReviews: async (req, res) => {
        try {
            const { productId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const reviews = await Review.find({ product: productId })
                .populate('user', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Review.countDocuments({ product: productId });

            res.json({
                success: true,
                reviews,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalReviews: total
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Update a review
    updateReview: async (req, res) => {
        try {
            const { reviewId } = req.params;
            const userId = req.user._id;

            const review = await Review.findOneAndUpdate(
                { _id: reviewId, user: userId },
                {
                    rating: req.body.rating,
                    title: req.body.title,
                    review: req.body.review,
                    images: req.body.images
                },
                { new: true }
            );

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found or unauthorized'
                });
            }

            res.json({
                success: true,
                message: 'Review updated successfully',
                review
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Delete a review
    deleteReview: async (req, res) => {
        try {
            const { reviewId } = req.params;
            const userId = req.user._id;

            const review = await Review.findOneAndDelete({
                _id: reviewId,
                user: userId
            });

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found or unauthorized'
                });
            }

            res.json({
                success: true,
                message: 'Review deleted successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Vote review as helpful
    voteReviewHelpful: async (req, res) => {
        try {
            const { reviewId } = req.params;

            const review = await Review.findByIdAndUpdate(
                reviewId,
                { $inc: { helpful_votes: 1 } },
                { new: true }
            );

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            res.json({
                success: true,
                message: 'Vote recorded successfully',
                helpfulVotes: review.helpful_votes
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = reviewController;
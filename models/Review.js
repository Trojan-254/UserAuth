const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    images: [{
        type: String  // URLs of review images
    }],
    verified_purchase: {
        type: Boolean,
        default: false
    },
    helpful_votes: {
        type: Number,
        default: 0
    },
    reported: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create a compound index for user and product to ensure one review per user per product
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Method to calculate average rating for a product
ReviewSchema.statics.calculateAverageRating = async function(productId) {
    const result = await this.aggregate([
        {
            $match: { product: productId }
        },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                numberOfReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        await mongoose.model('Product').findByIdAndUpdate(productId, {
            'ratings.average': result[0]?.averageRating || 0,
            'ratings.count': result[0]?.numberOfReviews || 0
        });
    } catch (error) {
        console.error('Error updating product ratings:', error);
    }
};

// Update average rating after saving review
ReviewSchema.post('save', function() {
    this.constructor.calculateAverageRating(this.product);
});

// Update average rating after updating review
ReviewSchema.post('remove', function() {
    this.constructor.calculateAverageRating(this.product);
});

const Review = mongoose.model('Review', ReviewSchema);
module.exports = Review;
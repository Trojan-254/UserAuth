const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    inStock: {
      type: Boolean,
      default: true
    },
    price: {
      type: Number,
      required: true
    },
    previousPrice: {
      type: Number
    },
    priceDropAlert: {
      type: Boolean,
      default: false
    }
  }],
  sharedWith: [{
    email: String,
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);

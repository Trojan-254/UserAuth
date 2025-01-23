const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    Original: Number,
    currency: {
      type: String,
      default: 'KES'
    },

    salePrice: {
       type: Number
    },
    mainImage: {
      type: String,
      required: true
    },
    additionalImages: {
      type: [String]
    },
    weight: {
      type: Number
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true 
    },
    inventory: {
      quantity: {
        type: Number,
        default: 0,
        required: true
      },
      sku: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'SKU cannot be empty'
        }
      },
       lowStockAlert: Number
    },
    specifications: [{
      name: String,
      value: String
    }],
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'out_of_stock'],
      default: 'draft'
    },
    ratings: {
      average: {
        type: Number,
        default: 0
      },
      count: Number
    },
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review' 
    }]
}, { timestamps: true });

// module export
const Product = mongoose.model('Product', ProductSchema);
module.exports = { Product };

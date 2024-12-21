const mongoose = require("mongoose");
const { Category } = require("./Category");

const ProductSchema = new mongoose.Schema({
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
    salePrice: {
       type: Number
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    childCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    mainImage: {
      type: String,
      required: true
    },
    additionalImages: {
      type: [String]
    },
    sku: {
     type: String,
     unique: true
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
    }
}, { timestamps: true });

// module export
const Product = mongoose.model('Product', ProductSchema);
module.exports = { Product };

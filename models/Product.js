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
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    images: [{
        url: String,
        altText: String
    }],
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    specifications: [{
        name: String,
        value: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// module export
const Product = mongoose.model('Product', ProductSchema);
module.exports = { Product };

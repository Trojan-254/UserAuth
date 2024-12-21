const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('../models/User');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  slug: {
   type: String,
   unique: true,
   lowercase: true,
   trim: true,
   required: true,
   set: (value) => slugify(value)
  },

  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
   type: mongoose.Schema.Types.ObjectId,
   ref: 'User',
   required: true
  },
  updatedBy: {
   type: mongoose.Schema.Types.ObjectId,
   ref: 'User'
  },
  categoryAttributes: [{
   attributeName: {
     type: String,
     required: true
   },
   attributeValue: {
     type: String,
     required: true
   }
  }]
}, { timestamps: true });

// export the module
const Category = mongoose.model("Category", CategorySchema);
module.exports = { Category };

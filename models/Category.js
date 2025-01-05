const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String },
});


const Category = mongoose.model('Category', CategorySchema);
module.exports = Category;

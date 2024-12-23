const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [CartItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Pre-save middleware to calculate total amount
CartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

// Instance methods
CartSchema.methods.addItem = function(productId, quantity, price) {
  const existingItem = this.items.find(item => item.product.toString() === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, price });
  }

  return this.save();
};

CartSchema.methods.clearCart = function() {
  this.items = [];
  this.totalAmount = 0;
  return this.save();
};

// Export module
module.exports = mongoose.model("Cart", CartSchema);

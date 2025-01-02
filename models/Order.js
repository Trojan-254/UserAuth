const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
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
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    county: String,
    postalCode: String
  },
  mpesaDetails: {
    checkoutRequestID: String,
    merchantRequestID: String,
    phoneNumber: String,
    amount: Number,
    mpesaReceiptNumber: String,
    initiatedAt: Date,
    paymentCompletedAt: Date,
    failureReason: String
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, { timestamps: true });

// module export
module.exports = mongoose.model("Order", OrderSchema);

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },

  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
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
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shipping: {
    address: {
      street: String,
      city: String,
      county: String
    },
    customerShippingDetails: {
      firstName: String,
      lastName: String,
      phone: String,
      email: String
    },
    cost: Number,
    method: String,
    trackingNumber: String
  },
  commission: {
    percentage: Number,
    amount: Number
  },
  totalAmount: Number,
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
  
  payment: {
    method: {
      type: String,
      enum: ['mpesa', 'airtel', 'bank_transfer'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    amount: Number,
    transactionId: String,
    paidAt: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paidAt: Date,
  transactionId: String,
  transactionMessage: String,
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: String,

}, { timestamps: true });

// module export
module.exports = mongoose.model("Order", OrderSchema);

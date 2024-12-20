const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    required: true
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// module export
module.exports = mongoose.model("Payment", PaymentSchema);

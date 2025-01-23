const mongoose = require('mongoose');

// Seller Schema
const sellerSchema = new mongoose.Schema({
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      //required: true
    },
    businessType: {
      type: String,
      enum: ['individual', 'registered_business'],
      required: true
    },
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true // Allows null values while maintaining uniqueness for non-null values
    },
    kra_pin: {
      type: String,
      required: true,
      unique: true
    },
    contactInfo: {
      email: {
        type: String,
        required: true,
        unique: true
      },
      phone: {
        type: String,
        required: true
      },
      whatsapp: String
    },
    location: {
      address: String,
      city: String,
      county: String
      // coordinates: {
      //   type: {
      //     type: String,
      //     enum: ['Point'],
      //     default: 'Point'
      //   },
      //   coordinates: {
      //     type: [Number], // [longitude, latitude]
      //     index: '2dsphere'
      //   }
      // }
    },
    bankInfo: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      branchCode: String
    },
    mpesa: {
      businessNumber: String,
      type: {
        type: String,
        enum: ['till', 'paybill']
      }
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    documents: [{
      type: {
        type: String,
        enum: ['business_permit', 'id_document', 'kra_certificate']
      },
      url: String,
      verified: {
        type: Boolean,
        default: false
      }
    }],
    rating: {
      average: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    },
    metrics: {
      totalOrders: {
        type: Number,
        default: 0
      },
      completedOrders: {
        type: Number,
        default: 0
      },
      cancelledOrders: {
        type: Number,
        default: 0
      },
      totalRevenue: {
        type: Number,
        default: 0
      }
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active'
    },
    commission: {
      percentage: {
        type: Number,
        default: 10
      },
      lastUpdated: Date
    },
    password: {
      type: String,
      required: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
 
    verificationToken: {
       type: String
    },
 
    resetPasswordToken: {
      type: String
    },
 
    resetPasswordExpires: {
      type: Date
    }
  }, {
    timestamps: true
  });

sellerSchema.index({ 'location.coordinates': '2dsphere' });
sellerSchema.index({ businessName: 'text' });

//seller export
module.exports = mongoose.model('Seller', sellerSchema);
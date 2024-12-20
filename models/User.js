const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
   firstName: {
     type: String,
     required: true,
     trim: true,
     minlength: 3,
     maxlength: 50,
   },

   lastName: {
     type: String,
     required: true,
     trim: true,
     minlength: 3,
     maxlength: 50,
   },

   role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'admin'
   },

   addresses: [{
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    isDefault: Boolean
   }],

   email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
   },

   newEmail: {
     type: String,
     default: null
   },

   emailUpdateToken: {
      type: String,
      default: null
   },

   emailUpdateExpires: {
      type: Date,
      default: null
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

}, { timestamps: true });

// Hash the password before saving
UserSchema.pre("save", async function(next) {
   if (!this.isModified("password"))
   return
   next();

   const salt = await bcrypt.genSalt(10);
   this.password = await bcrypt.hash(this.password, salt);
   next();
});

// Methos to generate reset token
UserSchema.methods.generatePasswordResetToken = function() {
   this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
   this.resetPasswordExpires = Date.now() + 3600000;
}

// Methos to generate email update tokem
UserSchema.methods.generateEmailUpdateToken = function() {
   this.emailUpdateToken = crypto.randomBytes(20).toString('hex');
   this.emailUpdateExpires = Date.now() + 3600000;
}
// export user model
module.exports = mongoose.model("User", UserSchema);

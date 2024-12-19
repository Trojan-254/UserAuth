const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    default: 'user'
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


// export user model
module.exports = mongoose.model("User", UserSchema);

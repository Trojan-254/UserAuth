const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
   username: {
     type: String,
     required: true,
     unique: true,
     trim: true,
     minlength: 3,
     maxlength: 50,
   },

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

   password: {
     type: String,
     required: true
   },
   verified: {
     type: Boolean,
     default: false
   },

   verificationToken: {
      type: String
   },

   createdAt: {
     type: Date,
     default: Date.now
   }
});

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

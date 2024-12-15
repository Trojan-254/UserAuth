const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// sign up route
router.post("/signup", async(req, res) => {
   const { username, email, password } = req.body;

   try {
     // Check is user exists
     let user = await User.findOne({ email });
     if (user) return res.status.json({ msg: "User already exists "});
       // Create a new User
       user = new User({ username, email, password });
       await user.save();
       console.log("User has been succesfully saved...");

      const userId = user._id;
      // Generate JWT
      const token = jwt.sign(
         { id: userId },
         process.env.JWT_SECRET,
         { expiresIn: "1h" }
      );
      res.status(201).json({ token });
   } catch (err) {
     res.status(500).json({error: err.message });
   }
});

// Login route
router.post("/login", async(req, res) => {
   const { email, password } = req.body;

   try {
    // find user
    const user = await User.findOne({email});
    if (!user) return res.status(400).json({msg: "User not found!"});

   // check password
   const isMatch = await bcrypt.compare(password, user.password);
   if(!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

   // generajwtconst token = jwt.sign(
   const token = jwt.sign(
         { id: userid },
         process.env.JWT_SECRET,
         { expiresIn: "1h" }
      );
      res.status(201).json({ token });
  } catch(err) {
    res.status(500).json({error: err.message });
  }
});


module.exports = router;

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
      if (user) {
         if (req.headers["content-type"] === "application/json") {
            return res.status(400).json({ msg: "User already exists"});
         } else {
           return res.status(400).send("User already exists. Try logging in!");
         }
      }

       const hashedPassword = await bcrypt.hash(password, 10);

       // Create a new User
       user = new User({ username, email, password: hashedPassword });
       await user.save();
       console.log("A new user has been succesfully registered...");

      // Redirect user to login
      if (req.headers["content-type"] !== "application/json") {
          return res.redirect("/login");
      }

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
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User not found!" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // Generate JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;

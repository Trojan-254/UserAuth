const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const router = express.Router();

dotenv.config();


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
       //console.log("A new user has been succesfully registered...");

      // Redirect user to login
      if (req.headers["content-type"] !== "application/json") {
          return res.redirect("/verify-email/:token");
      }

      const userId = user._id;
      // Generate JWT
      const token = jwt.sign(
         { id: userId },
         process.env.JWT_SECRET,
         { expiresIn: "1h" }
      );

      // Save token to user model
      user.verificationToken = token;
      console.log("A new user has been registered succesfully...");
      res.status(201).json({ msg: "Registration succesfull. Please check you email for verification.!" });
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
        // Check id user's email is verified
        if (!user.verified) {
           return res.status(400).json({ msg: "Please verify your email before you log in."})
        }
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



const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: { 
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
   },
});

const sendVerificationEmail = (email, token) => {
     const verificationUrl = `http://localhost:3000/verify/${token}`;

     const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: "Please verify your email address",
          html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email address.</p>`,
     };

     transporter.sendMail(mailOptions, (error, info) => {
         if (error) {
                console.log("Error sending email:", error);
             } else {
                console.log("Email sent:", info.response);
             }
         });
      };

router.get("/verify-email/:token", async (req, res) => {
   const { token } = req.params;

   try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       const userId = decoded.id;

       // Find the user
       const user = await User.findById(userId);
       if (!user) {
           return res.status(400).json({ msg: "Invalid or expired token" });
       }

       // Check if the token matches
       if (user.verificationToken !== token) {
           return res.status(400).json({ msg: "Invalid or expired token" });
       }

       // Mark the user as verified
       user.verified = true;
       user.verificationToken = null;
       await user.save();

       res.status(200).json({
           msg: "Email has been verified successfully. You can now login."
       });
       return res.redirect("/login");
   } catch (err) {
       console.error(err);
       res.status(500).json({ msg: "Server error" });
   }
});



module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const router = express.Router();
const crypto = require("crypto");

dotenv.config();



// sign up route
router.post("/signup", async(req, res) => {
   const { firstName, lastName, email, password1, password2 } = req.body;
   if (!firstName || !lastName || !email || !password1 || !password2) {
        return res.status(400).json({ message: "All fields are required." });
    }

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

      // Check if password1 resembles password2
      if (password1 !== password2) {
          return res.status(400).json({ msg: "The first password is not same as the second password" });
      }
      // Hash the user password
       const hashedPassword = await bcrypt.hash(password1, 10);
        
      // Create and save new User
       const newUser = new User({
           firstName,
           lastName,
           email,
           password: hashedPassword
       });

      const userId = newUser._id;
      // Generate JWT

      const token = jwt.sign(
         { id: userId },
         process.env.JWT_SECRET,
         { expiresIn: "1h" }
      );

      // Save token to user model
      newUser.verificationToken = token;
      await newUser.save();

      // Send verification email
      sendVerificationEmail(email, token);
      
      console.log("A new user has been registered succesfully...");
      // res.status(201).json({ msg: "Registration succesfull. Please check you email for verification.!" });
      res.render("confirmation", { email });
         } catch (err) {
     console.error('Failed to register user: ', err);
     res.status(500).json({error: err.message });
   }
});

// Login route
// Login route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User not found!" });

        // Check if user's email is verified
        if (!user.emailVerified) {
           return res.status(400).json({ msg: "Please verify your email before you log in." });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const payload = {
            user: {
              id: user._id,
              firstName: user.firstName,
            },
        };

        // Generate JWT
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Send token in an HTTP-only cookie
        res.cookie('authToken', token, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
           sameSite: 'Strict',
           maxAge: 3600000, // Match JWT expiry time (1 hour)
        });
        res.status(200).json({ msg: 'Login successfull', redirectUrl: '/dashboard' }); // Optionally, you can just send success message
    } catch (err) {
        console.error('Failed to login user', err);
        res.status(500).json({ error: err.message });
    }
});


// Logout
router.post('/logout', (req, res) => {
   try {
      res.clearCookie('authToken');
      res.redirect('/login');
      res.json({ success: true, message: 'Logged out successfully' });
   } catch (err) {
     console.error('Failed to logout user', err);
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
     const verificationUrl = `http://localhost:5000/auth/email-verification/${token}`;

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

// Verify email
router.get("/email-verification/:token", async (req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send("<h1>Invalid or expired token</h1>");
        }

        // Check if the token matches
        if (user.verificationToken !== token) {
            return res.status(400).send("<h1>Invalid or expired token</h1>");
        }

        // Mark the user as verified
        user.emailVerified = true;
        user.verificationToken = null;
        await user.save();


        // Redirect to the login page
        return res.render("confirm", { username: user.username });
        // Redirect to the success confirmation page
        return res.render("confirm", { username: user.username});
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
           return res.status(400).send("Invalid token format");
        }
        if (err.name === 'TokenExpiredError') {
           return res.status(400).send("Token has expired");
        }
        console.error(err);
        return res.status(500).send("<h1>Server error</h1>");
    }
});


// Email update request route
router.get('/update-email', async (req, res) => {
   res.render('update-email');
});

router.post('/update-email', auth, async (req, res) => {
    const { currentPassword, newEmail } = req.body;

   try {
     console.log('User ID from token: ', req.user.id)
     const user = await User.findById(req.user.id);

    if (!user) {
      console.error('No user found with ID:', req.user.id);
      return res.status(404).json({ 
        error: 'User not found', 
        details: 'No user exists with the provided ID' 
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if(!isMatch) {
      return res.render('update-email', {
        error: 'Incorrect current password'
     });
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
       return res.render('update-email', {
         error: 'Email is already in use by another account'
       });
    }

    // Generate email update token
    user.newEmail = newEmail;
    user.generateEmailUpdateToken();
    await user.save();

    // create email verification URL
    const verifyURL = `http://${req.headers.host}/verify-email-update/${user.emailUpdateToken}`;

    // Send verification email
    await transporter.sendMail({
      to: newEmail,
      from: process.env.EMAIL,
      subject: 'Verify Email Update',
      html: `
        <p>You requested to update your email address</p>
        <p>Click this link to verify your new email:</p>
        <a href="${verifyURL}">${verifyURL}</a>
        <p>This link will expire in 1 hour.</p>
      `
    });

   // render success page
   res.render('update-email', { 
      message: 'A verification link has been sent to your new email address.' 
    });
   } catch(err) {
     console.error(err);
     res.render('update-email', {
       error: 'An error occured, please try again.'
     });
   }
});

// verify email
router.get("/verify-email-update/:token", async (req, res) => {
    const { token } = req.params;

    try {
      const user = await User.findOne({
        emailUpdateToken: token,
        emailUpdateExpires: { $gt: Date.now() }
     });

     if (!user) {
       return res.render('error', {
         message: 'Email update token is invalid or has expired.'
       });
     }

    // Update email
    user.email = user.newEmail;
    user.newEmail = null;
    user.emailUpdateToken = null;
    user.emailUpdateExpires = null;

    await user.save(); 

   // Send confirmation email to old email address
    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Email Address Updated',
      html: '<p>Your email address has been successfully updated.</p>'
    });
    
    // Redirect to profile or dashboard
    res.render('login', { 
      message: 'Email address updated successfully. Please log in.' 
    });
    } catch (err) {
        console.error(err);
        res.status('error', {
           message: 'An error occure. Please try again.'
        });
    }
});

// Final password update
router.post('/new-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword)
       return res.status(400).json({ message: 'Passwords do not match '});

    try {
       const user = await User.findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: Date.now() }
       });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token'});

   // Hash the new password
   const salt =  await bcrypt.genSalt(10);
   user.password = await bcrypt.hash(password, salt);

   // Clear and reset token
   user.resetPasswordToken = undefined;
   user.resetPasswordExpires = undefined;

   // Save the updated user
   await user.save();

   res.redirect('/login');
   } catch(err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Reset password route
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    try {
      const user = await User.findOne({
         resetPasswordToken: token,
         resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) return res.status(400).json({ message: 'Invalid or expired token'});

      // Render reset password form
      res.render('reset-password', { token: req.params.token });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error"});
    }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Generate reset token
        user.generatePasswordResetToken();
        await user.save();

       // Send reset email
       const resetLink = `http://localhost:5000/auth/reset-password/${user.resetPasswordToken}`;
       await transporter.sendMail ({
           to: user.email,
           subject: 'Password Reset Request',
           html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
       });

       res.render('success-password', { email });
    } catch (err) {
       console.log(err);
       res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;

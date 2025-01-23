const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const router = express.Router();
const crypto = require("crypto");

dotenv.config();

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
   service: 'gmail',
   auth: { 
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
   },
});

const sendVerificationEmail = async (email, token, username = '') => {
    try {
        const verificationUrl = `http://localhost:5000/auth/email-verification/${token}`;
        
        const mailOptions = {
            from: {
                name: 'ZetuCart',
                address: process.env.EMAIL
            },
            to: email,
            subject: "Verify Your ZetuCart Account",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verify Your Email</title>
                    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Poppins:wght@600&display=swap" rel="stylesheet">
                    <style>
                        .email-container {
                            max-width: 600px;
                            margin: 0 auto;
                            font-family: 'Lato', 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333333;
                        }
                        .header {
                            background: linear-gradient(135deg, #FF6B35 0%, #FFB563 100%);
                            padding: 24px;
                            text-align: center;
                            border-radius: 8px 8px 0 0;
                        }
                        .logo {
                            color: white;
                            font-family: 'Poppins', sans-serif;
                            font-size: 28px;
                            font-weight: 600;
                            letter-spacing: 1px;
                        }
                        .content {
                            padding: 32px 24px;
                            background-color: #ffffff;
                            border-left: 1px solid #FFE1D0;
                            border-right: 1px solid #FFE1D0;
                        }
                        .content h2 {
                            font-family: 'Poppins', sans-serif;
                            color: #FF6B35;
                            margin-bottom: 24px;
                        }
                        .button {
                            display: inline-block;
                            padding: 14px 28px;
                            background: linear-gradient(to right, #FF6B35, #FFB563);
                            color: white;
                            text-decoration: none;
                            border-radius: 50px;
                            margin: 24px 0;
                            font-weight: bold;
                            font-family: 'Poppins', sans-serif;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            font-size: 14px;
                            box-shadow: 0 4px 6px rgba(255, 107, 53, 0.2);
                        }
                        .footer {
                            padding: 24px;
                            text-align: center;
                            font-size: 14px;
                            color: #666666;
                            background-color: #FFF9F5;
                            border-radius: 0 0 8px 8px;
                            border: 1px solid #FFE1D0;
                        }
                        .verification-code {
                            background-color: #FFF9F5;
                            padding: 16px;
                            border-radius: 8px;
                            font-family: monospace;
                            margin: 16px 0;
                            border: 1px dashed #FFB563;
                            color: #FF6B35;
                        }
                        .decorative-pattern {
                            height: 4px;
                            background: repeating-linear-gradient(
                                45deg,
                                #FF6B35,
                                #FF6B35 10px,
                                #FFB563 10px,
                                #FFB563 20px
                            );
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <div class="logo">ZetuCart</div>
                        </div>
                        <div class="content">
                            <div class="decorative-pattern"></div>
                            <h2>Verify Your Email Address</h2>
                            <p>Hello ${username || 'there'},</p>
                            <p>Thank you for creating a ZetuCart account. To ensure the security of your account and activate all features, please verify your email address by clicking the button below:</p>
                            
                            <center><a href="${verificationUrl}" class="button">Verify Email Address</a></center>
                            
                            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                            <div class="verification-code">
                                ${verificationUrl}
                            </div>
                            
                            <p>This verification link will expire in 24 hours for security reasons.</p>
                            
                            <p>If you didn't create a ZetuCart account, please ignore this email or contact our support team if you have concerns.</p>
                            <div class="decorative-pattern"></div>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} ZetuCart. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully:", info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error("Failed to send verification email");
    }
};

// Example usage:
// sendVerificationEmail("user@example.com", "verification-token-123", "John");

// Sign up route
router.post("/signup", async(req, res) => {
   const { firstName, lastName, email, password } = req.body;
   if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

   try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
         if (req.headers["content-type"] === "application/json") {
            return res.status(400).json({ msg: "User already exists"});
         } else {
           return res.status(400).send("User already exists. Try logging in!");
         }
      }

      // Hash the user password
       const hashedPassword = await bcrypt.hash(password, 10);

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
      console.log("A new user has been registered successfully...");

      // Send a success page to user
      res.status(201).json({ success: true, message: 'Signup success', email: newUser.email });
   } catch (err) {
     console.error('Failed to register user: ', err);
     res.status(500).json({error: err.message });
   }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        } else if (user.emailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        } else {
            sendVerificationEmail(email, user.verificationToken);
            return res.status(200).json({ message: 'Verification email sent' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//signup success
router.get('/signup-success', (req, res) => {
   const email = decodeURIComponent(req.query.email);
   if (!email) {
      return res.status(400).send("Email is required");
   }
   res.render('confirmation', { email: email });
});

// Login route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User not found!" });

        if (!user.emailVerified) {
           return res.status(400).json({ msg: "Please verify your email before you log in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const payload = {
            user: {
              id: user._id,
              firstName: user.firstName,
            },
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie('authToken', token, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'Strict',
           maxAge: 3600000,
        });
        res.status(200).json({ msg: 'Login successful', redirectUrl: '/dashboard' });
    } catch (err) {
        console.error('Failed to login user', err);
        res.status(500).json({ error: err.message });
    }
});

// Logout route
router.post('/logout', auth, (req, res) => {
   res.clearCookie('authToken');
   return res.json({ success: true, message: 'Logged out successfully' });
});

// Email verification route
router.get("/email-verification/:token", async (req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).send("<h1>Invalid or expired token</h1>");
        }

        if (user.verificationToken !== token) {
            return res.status(400).send("<h1>Invalid or expired token</h1>");
        }

        user.emailVerified = true;
        user.verificationToken = null;
        await user.save();

        return res.render("confirm", { username: user.username });
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

// Email update routes
router.get('/update-email', auth, (req, res) => {
   res.render('update-email');
});

router.post('/update-email', auth, async (req, res) => {
    const { currentPassword, newEmail } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('update-email', { error: 'Incorrect current password' });
        }

        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.render('update-email', { error: 'Email is already in use' });
        }

        user.newEmail = newEmail;
        user.generateEmailUpdateToken();
        await user.save();

        const verifyURL = `http://${req.headers.host}/verify-email-update/${user.emailUpdateToken}`;

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

        res.render('update-email', { message: 'Verification link sent to new email' });
    } catch (err) {
        console.error(err);
        res.render('update-email', { error: 'An error occurred' });
    }
});

// Password reset routes
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        user.generatePasswordResetToken();
        await user.save();

        const resetLink = `http://localhost:5000/auth/reset-password/${user.resetPasswordToken}`;
        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
        });

        res.render('success-password', { email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        res.render('reset-password', { token: req.params.token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/new-password/:token', async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
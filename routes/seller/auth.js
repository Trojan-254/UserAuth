const express = require('express');
const router = express.Router();
const  { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seller = require('../../models/Seller');
const { auth } = require('../../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Send verification email
const sendVerificationEmail = (email, token) => {
  const verificationUrl = `https://zetucartmain-e896aac1d742.herokuapp.com//seller/auth/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'ZetuCart - Verify Your Email Address',
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
                            <p>Hello there,</p>
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  }
  );
};



const registerValidation = [
    check('businessName').trim().notEmpty().withMessage('Business name is required'),
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  check('phone').notEmpty().withMessage('Phone number is required'),
  check('businessType')
    .isIn(['individual', 'registered_business'])
    .withMessage('Invalid business type'),
  check('kra_pin').notEmpty().withMessage('KRA PIN is required')
];

router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('seller/register', {
                errors: errors.array(),
                data: req.body,
            });
        }

        const {
            businessName,
            email,
            password,
            phone,
            businessType,
            kra_pin,
            address,
            city,
            county
          } = req.body;
      
          // Check if seller already exists
          let seller = await Seller.findOne({ 'contactInfo.email': email });
          if (seller) {
            return res.status(400).render('seller/register', {
              errors: [{ msg: 'Seller already exists with this email' }],
              data: req.body
            });
          }
      
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
      
          // Create new seller
          newSeller = new Seller({
            businessName,
            businessType,
            kra_pin,
            contactInfo: {
              email,
              phone
            },
            location: {
              address,
              city,
              county
            },
            verificationStatus: 'pending',
            password: hashedPassword
          });
      
          // await seller.save();
          const sellerId = newSeller._id;
      
          // Create JWT token
          const token = jwt.sign(
            { seller: { id: sellerId } },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
      
          // Set token in cookie 
          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          });

          // Set token in seller model
          newSeller.verificationToken = token;
          await newSeller.save();

          // Send verification email
          sendVerificationEmail(email, token);
          // console.log('Verification email sent to:', email);

      
          res.status(201).json({
              success: true,
              message: 'Signup success',
              email: email 
          });
          // res.render('seller/register-success', { email }); 
    } catch (error) {
        console.error(error);
        res.status(500).render('seller/register', {
           errors: [{ msg: 'Server error occurred' }],
           data: req.body
        });
    }
});

// Seller registration success route
router.get('/register-success', (req, res) => {
  const email = decodeURIComponent(req.query.email);
  console.log('Email received:', email); 
  if (!email) {
     return res.status(400).send("Email is required");
  }
  res.render('seller/register-success', { email: email });
});

// Seller email verification router
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const seller = await Seller.findById(decoded.seller.id);
    if (!seller) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    seller.verificationStatus = 'verified';
    seller.emailVerified = true;
    seller.verificationToken = undefined; 
    await seller.save();
    console.log('Seller', seller);
    res.render('seller/confirmation-redirect', { businessName: seller.businessName });

    // res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
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

// Login route
router.post('/login', async (req, res) => {
  try {
      // console.log('Login request:', req.body);
      const { email, password } = req.body;
      // console.log('Email:', email);
  
      // Find seller
      const seller = await Seller.findOne({ 'contactInfo.email': email });
      if (!seller) {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid credentials'
          });
      }
      // console.log('extracting seller....');
      // console.log('Seller:', seller);
      // Check password
      const isMatch = await bcrypt.compare(password, seller.password);
      if (!isMatch) {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid credentials'
          });
      }
  
      // Create token
      const token = jwt.sign(
          { seller: { id: seller._id, role: 'seller' } },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
      );
      // console.log('Token:', token);
      // Set token in cookie
      res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000
      });
      // console.log('Login successful');
      const responseData = {
        statusCode: 200,
        success: true,
        message: 'Login successful',
        redirectUrl: '/seller/dashboard'
      }
     
      console.log('Response data:', responseData);
      res.json(responseData);
      
  } catch (err) {
      console.error(err);
      res.status(500).json({ 
          success: false, 
          message: 'Server error occurred' 
      });
  }
});
  
  // Logout route
  router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/seller/login');
  });
  
  module.exports = router;
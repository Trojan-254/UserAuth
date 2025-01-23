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

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Send verification email
const sendVerificationEmail = (email, token) => {
  const verificationUrl = `http://localhost:5000/seller/auth/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Please verify your email address',
    html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email address</p>`
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
          seller = new Seller({
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
      
          // Create JWT token
          const token = jwt.sign(
            { seller: { id: seller.id } },
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
          seller.verificationToken = token;
          await seller.save();

          // Send verification email
          sendVerificationEmail(email, token);
          console.log('Verification email sent to:', email);
      
          res.status(201).json({ success: true, message: 'Seller created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).render('seller/register', {
           errors: [{ msg: 'Server error occurred' }],
           data: req.body
        });
    }
});

router.get('/register-success', (req, res) => {
    const email = decodeURIComponent(req.query.email);
    if (!email) {
      return res.status(400).send('Email is required');
    }
    res.render('confirmation', { email });
  }
);

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

    res.status(200).json({ message: 'Email verified successfully' });
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
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/authMiddleware');
const util = require('util');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendVerificationEmail = (email, token) => {
  const verificationUrl = `http://localhost:5000/auth/updated-email-verification/${token}`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Please verify your email address",
    html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email address</p>`
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending mail:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

// Get user profile
router.get('/user-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
       return res.status(404).json({ error: 'User not found' });
    }

    res.render('profile', {
        firstname: user.firstName,
        lastname: user.lastName,
        email: user.email,
        verified: user.emailVerified,
        userId: user._id,
    });
  } catch (err) {
    console.error('Failed to get user profile: ', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user details for updating
router.get('/update', auth, (req, res) => {
  res.render('update-profile', { user: req.user });  
});

// Update user profile
router.put('/update-user', auth, async (req, res) => {
  const { username, email } = req.body;

  try {
    console.log('Update request received for user ID:', req.user.id);
    console.log('Request body:', req.body);

    // Check if the username already exists
    if (username) {
      console.log('Checking for existing username:', username);
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        console.log('Username already exists:', username);
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Check if the email already exists
    if (email) {
      console.log('Checking for existing email:', email);
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== req.user.id) {
        console.log('Email already exists:', email);
        return res.status(400).json({ error: 'Email already in use' });
      }

      // Generate a verification token
      const token = jwt.sign(
        { id: req.user.id, newEmail: email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      console.log('Generated verification token:', token);
      
      // Update user with new email and token
      await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: {
            newEmail: email,
            email: email,
            verificationToken: token,
            emailVerified: false,
          }
        },
        { new: true }
      );

      // Send verification email
      sendVerificationEmail(email, token);
      console.log('Verification email sent to:', email);

      return res.json({
        message: `Verification email sent to ${email}. Please verify.`,
        forceLogout: true,
      });
    }

    // Update username if provided
    if (username) {
      console.log('Updating username to:', username);
      await User.findByIdAndUpdate(
        req.user.id,
        { $set: { username } },
        { new: true }
      );
    }

    console.log('Profile update completed successfully.');
    return res.json({
      message: 'Profile updated successfully.',
      forceLogout: false,
    });
  } catch (err) {
    console.error('Error occurred while updating user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update User password
router.put('/change-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
       const user = await User.findById(req.user.id);
       if (!user) {
         return res.status(404).json({ error: 'User not found' });
       }

       // Verify the old password
       const isMatch = await bcrypt.compare(oldPassword, user.password);
       if (!isMatch) {
         return res.status(400).json({ error: 'Incorrect current password' });
       }

       // Hash the new password
       const salt = await bcrypt.genSalt(10);
       user.password = await bcrypt.hash(newPassword, salt);
       await user.save();

       res.json({ message: 'Password updated successfully' }); 
    } catch (err) {
        console.error('Failed to change user password: ', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
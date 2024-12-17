const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const util = require('util');
/*
 * @path: 
 *
*/
router.get('/user-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
       return res.status(404).json({ error: 'user not found' });
    }

    res.render('profile', {
        username: user.username,
        email: user.email,
        verified: user.verified,
        userId: user._id,
    });
    // res.json(user);
  } catch (err) {
    console.error('Failed to get user profile: ', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user details for uodating
router.get('/update', auth, (req, res) => {
  res.render('update-profile', { user: req.user });  
});

// Update user profile
router.put('/update-user', auth, async (req, res) => {
  const { username, email } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the new username already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Check if the new email already exists
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Save token and new email to user model
      user.emailVerificationToken = token;
      user.newEmail = email;
      await user.save();

      // Send verification email
      sendVerificationEmail(email, token);

      return res.json({
        message: `Verification email sent to ${email}. Please verify.`,
        forceLogout: true, // Indicate logout on frontend
      });
    }

    // Save updates to the user model
    await user.save();

    // Respond with success message and forceLogout flag
    res.json({
      message: 'Profile updated successfully.',
      forceLogout: true,
    });
  } catch (err) {
    console.error('Failed to update user: ', err);
    res.status(500).json({ error: 'Server error' });
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

// Update User password
router.put('/change-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
       const user = await User.findById(req.user.id);

       // Verify the old password
       const isMatch = await bcrypt.compare(oldPassword, user.password);
       if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password'});
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated succesfully' }); 
    } catch (err) {
        console.error('Failed to change user password: ', err);
        res.status(500).json({ error: 'Server error' });
     }
});


module.exports = router;

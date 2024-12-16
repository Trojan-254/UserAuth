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
    res.json(user);
  } catch (err) {
    console.error('Failed to get user profile: ', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Update user profile
router.put('/update', auth, async (req, res) => {
  const { username, email } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being updated
    if (email && email !== user.email) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      user.newEmail = email;
      await user.save();

      // Send verification email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const verificationUrl = `${process.env.BASE_URL}/verify-email/${verificationToken}`;
      await transporter.sendMail({
        from: 'no-reply@example.com',
        to: email,
        subject: 'Verify your new email address',
        html: `<p>Click the link below to verify your new email:</p>
               <a href="${verificationUrl}">${verificationUrl}</a>`,
      });

      return res.json({
        message: `Verification email sent to ${email}. Please verify.`,
        forceLogout: true, // Indicate logout on frontend
      });
    }

    // Update username if provided
    if (username) {
      user.username = username;
    }

    await user.save();

    // Respond with forceLogout flag
    res.json({
      message: 'Profile updated successfully.',
      forceLogout: true,
    });
  } catch (err) {
    console.error('Failed to update user: ', err);
    res.status(500).json({ error: 'Server error' });
  }
});


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

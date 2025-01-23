// const { getMaxListeners } = require('npm');
const Seller = require('../models/Seller');
const { validationResult } = require('express-validator');

const sellerAuthController = {
    // Register our new amazing seller
    register: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                businessName,
                email,
                password,
                phone,
                businessType,
                kra_pin,
            } = req.body;

            // Let's us check if our amazing seller exists already??
            const existingSeller = await Seller.findOne({
                $or: [
                    { 'contactInfo.email': email },
                    {'kra_pin': kra_pin}
                ]
            });

            if (existingSeller) {
                return res.status(400).json({ message: 'Seller already exists' });
            }

            // Now let's create our new amazing seller
            const newSeller = new Seller({
                businessName,
                contactInfo: { email, phone },
                password,
                businessType,
                kra_pin,
                owner: req.user.id // Here we are assuming the user is aleady authenticated.
            });

            await newSeller.save();
            console.log("New seller:", newSeller);
            const token = await newSeller.generateToken();

            res.status(201).json({ 
                token,
                message: 'Seller created successfully',
                seller: newSeller.getPublicProfile()
            });
        } catch (error) {
            console.error("Seller registration error:", error);
            res.status(500).json({ 
                error: error.message,
                message: 'Error registering seller' 
            });
        }
    },


    // Login the seller
    login: async (req, res) => {
        try {
          const { email, password } = req.body;
    
          // Find seller
          const seller = await Seller.findOne({ 'contactInfo.email': email });
          if (!seller) {
            return res.status(401).json({
              message: 'Invalid login credentials'
            });
          }
    
          // Check password
          const isMatch = await seller.comparePassword(password);
          if (!isMatch) {
            return res.status(401).json({
              message: 'Invalid login credentials'
            });
          }
    
          // Check if seller is active
          if (seller.status !== 'active') {
            return res.status(403).json({
              message: 'Your account is currently inactive. Please contact support.'
            });
          }
    
          const token = jwt.sign(
            { seller: { id: seller._id, role: 'seller' } },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          // Set token in cookie
          res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
          })
    
          res.json({
            message: 'Login successful',
            token,
            seller: seller.getPublicProfile()
          });
    
        } catch (error) {
          console.error('Seller login error:', error);
          res.status(500).json({
            message: 'Error logging in',
            error: error.message
          });
        }
      },
    
      // Get seller profile
      getProfile: async (req, res) => {
        try {
          const seller = await Seller.findById(req.seller.id)
            .select('-password');
    
          if (!seller) {
            return res.status(404).json({
              message: 'Seller not found'
            });
          }
    
          res.json(seller);
    
        } catch (error) {
          console.error('Get profile error:', error);
          res.status(500).json({
            message: 'Error fetching profile',
            error: error.message
          });
        }
      },
    
      // Update seller profile
      updateProfile: async (req, res) => {
        try {
          const updates = req.body;
          const allowedUpdates = [
            'businessName',
            'contactInfo',
            'location',
            'bankInfo',
            'mpesa'
          ];
    
          // Filter out non-allowed updates
          const filteredUpdates = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
              obj[key] = updates[key];
              return obj;
            }, {});
    
          const seller = await Seller.findByIdAndUpdate(
            req.seller.id,
            { $set: filteredUpdates },
            { new: true, runValidators: true }
          ).select('-password');
    
          res.json({
            message: 'Profile updated successfully',
            seller
          });
    
        } catch (error) {
          console.error('Update profile error:', error);
          res.status(500).json({
            message: 'Error updating profile',
            error: error.message
          });
        }
      }
};

module.exports = sellerAuthController;
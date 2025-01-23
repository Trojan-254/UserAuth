// sellerAuthRoutes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const sellerAuthController = require('../../controllers/sellerAuthController');
const { auth, verifySeller }  = require('../../middleware/authMiddleware');
const productController = require('../../controllers/productController');

              
// Validation middleware
const registerValidation = [
  check('businessName').notEmpty().trim(),
  check('email').isEmail(),
  check('password').isLength({ min: 6 }),
  check('phone').notEmpty(),
  check('businessType').isIn(['individual', 'registered_business']),
  check('kra_pin').notEmpty()
];

// console.log(registerValidation);
// Routes

router.post('/register', 
  auth,
  registerValidation, 
  sellerAuthController.register
);

router.post('/login', sellerAuthController.login);

router.get('/profile',
  verifySeller,
  sellerAuthController.getProfile
);


router.get('/products', 
  verifySeller,
  productController.getSellerProducts
);

router.patch('/profile/update',
  verifySeller,
  sellerAuthController.updateProfile
);

module.exports = router;
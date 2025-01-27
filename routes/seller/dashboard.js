const express = require('express');
const router = express.Router();
// const { check } = require('express-validator');
const  sellerAnalyticsController = require('../../controllers/sellerAnalyticsController');
console.log(sellerAnalyticsController);
const { auth, verifySeller }  = require('../../middleware/authMiddleware');

// Get seller dashboard
router.get('/', verifySeller, sellerAnalyticsController.getDashboard);

module.exports = router;  
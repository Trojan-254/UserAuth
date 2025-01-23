// utils/mpesa.js
const axios = require('axios');
const Order = require('../models/Order');

class MpesaAPI {
  constructor() {
    // Ensure all required env variables are present
    const required = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'BASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.baseURL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 10000 // 10 second timeout
        }
      );
      
      if (!response.data.access_token) {
        throw new Error('Invalid access token response');
      }
      
      return response.data.access_token;
    } catch (error) {
      const errorMessage = error.response?.data?.errorMessage || error.message;
      console.log(errorMessage);
      throw new Error(`M-Pesa access token error: ${errorMessage}`);
    }
  }

  generatePassword(timestamp) {
    return Buffer.from(this.shortcode + this.passkey + timestamp).toString('base64');
  }

  async initiateSTKPush(phoneNumber, amount, orderId) {
    try {
      // Input validation
      if (!this.validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format. Use 254XXXXXXXXX');
      }
      
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = this.generatePassword(timestamp);

      // Format phone number
      const formattedPhone = phoneNumber.replace(/^(0|\+254)/, '254');


      if (!process.env.BASE_URL || !process.env.BASE_URL.startsWith('https://')) {
         throw new Error('Invalid BASE_URL. Must be a valid HTTPS URL');
      }

      const requestData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: `ZetuCart-${orderId}`,
        TransactionDesc: `Payment for order ${orderId}`
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeoutback
        }
      );

      if (!response.data.CheckoutRequestID) {
        throw new Error('Invalid STK push response');
      }

      // Save M-Pesa transaction details to order
      const order = await Order.findById(orderId);
      order.mpesaDetails = {
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        phoneNumber: formattedPhone,
        amount: amount,
        initiatedAt: new Date()
      };

      await order.save();

      return response.data;
      
    } catch (error) {
      // Handle different types of errors
      if (error.response?.data?.errorMessage) {
        throw new Error(`M-Pesa Error: ${error.response.data.errorMessage}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('M-Pesa request timed out. Please try again.');
      }
      throw error;
    }
  }

  async checkTransactionStatus(checkoutRequestId) {
    try {
      console.log(`Checking transaction status for ${checkoutRequestId}`);

      // First check database for completed payment
      const order = await Order.findOne({
        'mpesaDetails.checkoutRequestID': checkoutRequestId
      });
      // console.log("Order exists: ", order);

      // If payment is already completed in database, return success
      if (order?.paymentStatus === 'completed') {
        return {
          success: true,
          status: 'completed',
          message: 'Payment completed successfully',
          checkoutRequestId
        };
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = this.generatePassword(timestamp);

      

      const requestData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      // console.log("Request data: ", requestData);

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          validateStatus: status => status === 200 || status === 500
        }
      );

      // console.log("Response data received from checking status: ", response.data);

      // Handle different response scenarios
      if (response.status === 500) {
        const errorMessage = response.data?.errorMessage?.toLowerCase() || '';
        
        // Check for specific error messages indicating processing
        if (errorMessage.includes('being processed') || 
            errorMessage.includes('internal request') ||
            response.data?.errorCode === '500.001.1001') {
          return {
            success: false,
            status: 'processing',
            message: 'Transaction is being processed',
            isProcessing: true,
            checkoutRequestId
          };
        }
      }

      // Check for successful completion
      if (response.data?.ResponseCode === '0') {
        // Update order status in database
        if (order) {
          order.paymentStatus = 'completed';
          order.orderStatus = 'processing';
          await order.save();
        }

        return {
          success: true,
          status: 'completed',
          message: response.data.ResultDesc,
          checkoutRequestId
        };
      }

      // Handle specific failure codes
      const failureMessage = this.getFailureMessage(response.data?.ResultCode);
      
      // Update order status for definitive failures
      if (order && failureMessage !== 'processing') {
        order.paymentStatus = 'failed';
        order.mpesaDetails.failureReason = failureMessage;
        await order.save();
      }

      return {
        success: false,
        status: failureMessage === 'processing' ? 'processing' : 'failed',
        message: failureMessage,
        code: response.data?.ResultCode,
        isProcessing: failureMessage === 'processing',
        checkoutRequestId
      };

    } catch (error) {
      console.error('M-Pesa status check error:', {
        error: error.message,
        checkoutRequestId
      });

      const isTemporaryError = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ECONNRESET' || 
        error.response?.status >= 500;

      return {
        success: false,
        status: isTemporaryError ? 'processing' : 'failed',
        message: isTemporaryError ? 
          'Payment system is temporarily unavailable' : 
          'Payment status check failed',
        isProcessing: isTemporaryError,
        error: error.message,
        checkoutRequestId
      };
    }
  }

  validatePhoneNumber(phone) {
    return /^254[17]\d{8}$/.test(phone);
  }

  getFailureMessage(resultCode) {
    const failureCodes = {
      1: 'Payment cancelled by user',
      1001: 'Payment failed - insufficient funds, Please load you account and try again',
      1002: 'Payment failed - transaction timed out',
      1003: 'Payment failed - invalid PIN',
      1004: 'Payment failed - invalid transaction',
      1005: 'Payment failed - transaction limit exceeded',
      1006: 'Payment failed - user account restricted',
      1007: 'Payment failed - wrong PIN format',
    };

    return failureCodes[resultCode] || 'Payment failed - please try again';
  }
  
}

  


module.exports = new MpesaAPI();

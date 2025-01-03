// utils/mpesa.js
const axios = require('axios');

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
      
      const requestData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
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
          timeout: 15000 // 15 second timeout
        }
      );

      if (!response.data.CheckoutRequestID) {
        throw new Error('Invalid STK push response');
      }

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
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = this.generatePassword(timestamp);

    const requestData = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    const response = await axios.post(
      `${this.baseURL}/mpesa/stkpushquery/v1/query`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return {
      success: response.data.ResultCode === 0,
      message: response.data.ResultDesc
    };
  } catch (error) {
    throw new Error(`Payment status check failed: ${error.message}`);
  }
}
  validatePhoneNumber(phone) {
    return /^254[17]\d{8}$/.test(phone);
  }
}

module.exports = new MpesaAPI();

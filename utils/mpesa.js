// utils/mpesa.js
const axios = require('axios');

class MpesaAPI {
  constructor() {
    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.BASE_URL) {
      throw new Error('Missing required environment variables for M-Pesa integration');
    }

    // Sandbox credentials
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    this.shortcode = '174379';
    this.baseURL = 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  generatePassword(timestamp) {
    const buffer = Buffer.from(this.shortcode + this.passkey + timestamp);
    return buffer.toString('base64');
  }

  async initiateSTKPush(phoneNumber, amount, orderId) {
    try {
      // Validate inputs
      if (!phoneNumber || !amount || !orderId) {
        throw new Error('Phone number, amount, and orderId are required');
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = this.generatePassword(timestamp);

      // Format phone number (remove leading 0 or +254 if present)
      const formattedPhone = phoneNumber.replace(/^(0|\+254)/, '254');
      
      // Construct callback URL
      const callbackUrl = `${process.env.BASE_URL}/api/mpesa/callback`;

      const requestData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "ZetuCart",
        TransactionDesc: `Order ${orderId}`
      };

      console.log('Initiating STK Push with data:', {
        ...requestData,
        CallBackURL: callbackUrl,
        PhoneNumber: formattedPhone
      });

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('STK Push successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('STK Push Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Provide more specific error messages
      if (error.response?.data?.errorMessage) {
        throw new Error(`M-Pesa Error: ${error.response.data.errorMessage}`);
      }
      throw error;
    }
  }

  // Helper method to validate phone number format
  validatePhoneNumber(phone) {
    const regex = /^254\d{9}$/;
    return regex.test(phone);
  }
}

module.exports = new MpesaAPI();

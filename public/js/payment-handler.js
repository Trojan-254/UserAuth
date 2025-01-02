// public/js/payment-handler.js
class PaymentHandler {
  constructor() {
    this.mpesaForm = document.getElementById('mpesaForm');
    this.phoneInput = document.getElementById('mpesaNumber');
    this.submitButton = this.mpesaForm.querySelector('button[type="submit"]');
    this.cancelButton = document.getElementById('cancelPayment');
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.mpesaForm.addEventListener('submit', (e) => this.handleSubmit(e));
    this.phoneInput.addEventListener('input', (e) => this.handlePhoneInput(e));
    this.cancelButton.addEventListener('click', () => this.handleCancel());
  }

  handlePhoneInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (!value.startsWith('254')) {
      value = '254' + value;
    }
    value = value.slice(0, 12);
    e.target.value = value;
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const phoneNumber = this.phoneInput.value.trim();
    if (!/^254[17]\d{8}$/.test(phoneNumber)) {
      this.showError('Please enter a valid M-Pesa number (254XXXXXXXXX)');
      return;
    }

    try {
      this.setLoading(true);
      const response = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: window.orderId, // Set this in your EJS template
          phoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      this.showSuccess();
      this.startPolling(data.checkoutRequestID);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async startPolling(checkoutRequestID) {
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3 seconds = 60 seconds total
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestID}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          window.location.href = `/orders/${data.orderId}?status=success`;
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          this.showError('Payment failed: ' + data.message);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        this.showError('Payment status check timed out. Please check your order status.');
      }
    }, 3000);
  }

  setLoading(isLoading) {
    this.submitButton.disabled = isLoading;
    this.submitButton.innerHTML = isLoading ? 
      '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...' : 
      'Submit Payment';
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-4';
    errorDiv.innerHTML = `<p>${message}</p>`;
    
    const existing = this.mpesaForm.querySelector('.bg-red-100');
    if (existing) existing.remove();
    
    this.mpesaForm.appendChild(errorDiv);
  }

  showSuccess() {
    const successDiv = document.createElement('div');
    successDiv.className = 'bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-4';
    successDiv.innerHTML = `
      <p class="font-bold">Payment Initiated!</p>
      <p>Please check your phone for the M-Pesa prompt and enter your PIN to complete payment.</p>
    `;
    
    const existing = this.mpesaForm.querySelector('.bg-green-100, .bg-red-100');
    if (existing) existing.remove();
    
    this.mpesaForm.appendChild(successDiv);
  }

  handleCancel() {
    if (confirm('Are you sure you want to cancel this payment?')) {
      window.location.href = '/cart/my-cart';
    }
  }
}

// Initialize payment handler when document loads
document.addEventListener('DOMContentLoaded', () => {
  new PaymentHandler();
});

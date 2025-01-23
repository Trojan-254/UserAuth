class PaymentHandler {
    constructor() {
        // Initialize DOM elements
        this.form = document.getElementById('mpesaForm');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.cancelButton = document.getElementById('cancelPayment');
        this.phoneInput = document.getElementById('mpesaNumber');
        
        // Initialize state
        this.messageContainer = this.createMessageContainer();
        this.messageTimeout = null;
        this.pollingInterval = null;
        
        // Bind event listeners
        this.initializeEventListeners();
    }

    createMessageContainer() {
        const container = document.createElement('div');
        container.className = 'fixed top-4 right-4 max-w-sm z-50';
        document.body.appendChild(container);
        return container;
    }

    showMessage(message, type = 'info') {
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Remove existing message if any
        const existingMessage = this.messageContainer.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageElement = document.createElement('div');
        messageElement.className = `message p-4 rounded-lg shadow-lg mb-4 animate-fade-in ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        messageElement.textContent = message;

        // Add message to container
        this.messageContainer.appendChild(messageElement);

        // Set timeout to remove message
        this.messageTimeout = setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    async checkPaymentStatus(checkoutRequestId) {
        try {
            const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
      
            if (!response.ok) {
                throw new Error('Failed to check payment status');
            }
      
            const data = await response.json();
            console.log('data received:', data);
      
            // Handle different status cases
            switch (data.status) {
                case 'completed':
                    this.stopPolling();
                    this.showMessage('Payment successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/orders/my-orders';
                    }, 2000);
                    break;
      
                case 'failed':
                    this.stopPolling();
                    this.showMessage(data.message || 'Payment failed. Please try again.', 'error');
                    this.enableForm();
                    break;
      
                case 'processing':
                    // Continue polling
                    this.showMessage('Payment is being processed...', 'info');
                    break;
      
                default:
                    this.stopPolling();
                    this.showMessage('Unknown payment status. Please check your orders.', 'error');
                    this.enableForm();
            }
        } catch (error) {
            console.error('Payment status check failed:', error);
            // Don't stop polling for temporary errors
            if (error.message !== 'Failed to fetch') {
                this.stopPolling();
                this.showMessage('Error checking payment status. Please check your orders.', 'error');
                this.enableForm();
            }
        }
    }

    startPolling(checkoutRequestId) {
        let attempts = 0;
        const maxAttempts = 24; // 2 minutes (24 * 5 seconds)

        // Check immediately
        this.checkPaymentStatus(checkoutRequestId);

        // Poll every 5 seconds
        this.pollingInterval = setInterval(() => {
            attempts++;
            if (attempts > maxAttempts) {
                this.stopPolling();
                this.showMessage('Payment timed out. Please check your orders.', 'error');
                this.enableForm();
                return;
            }
            this.checkPaymentStatus(checkoutRequestId);
        }, 5000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    validatePhoneNumber(phone) {
        return /^254[17]\d{8}$/.test(phone);
    }

    disableForm() {
        this.submitButton.disabled = true;
        this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        this.phoneInput.disabled = true;
    }

    enableForm() {
        this.submitButton.disabled = false;
        this.submitButton.innerHTML = 'Submit Payment';
        this.phoneInput.disabled = false;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const phoneNumber = this.phoneInput.value.trim();
        const orderId = window.orderId; // Assuming orderId is set on window object

        // Validate phone number
        if (!this.validatePhoneNumber(phoneNumber)) {
            this.showMessage('Invalid phone number format. Use format: 254XXXXXXXXX', 'error');
            return;
        }

        try {
            this.disableForm();

            // Initiate payment
            const response = await fetch('/api/payments/mpesa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    phoneNumber
                })
            });
            console.log(response);


            const data = await response.json();
            console.log(data);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to initiate payment');
            }

            // Show success message and start polling
            this.showMessage('Please check your phone for the M-Pesa prompt', 'info');
            this.startPolling(data.checkoutRequestID);

        } catch (error) {
            this.showMessage(error.message, 'error');
            this.enableForm();
        }
    }

    handleCancel() {
        if (confirm('Are you sure you want to cancel this payment?')) {
            this.stopPolling();
            window.location.href = '/orders/my-orders';
        }
    }

    handlePaymentMethodChange(e) {
        if (e.target.value === 'mpesa') {
            this.form.style.display = 'block';
        } else {
            this.form.style.display = 'none';
            this.showMessage('Only M-Pesa payments are currently supported', 'info');
        }
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.cancelButton.addEventListener('click', this.handleCancel.bind(this));

        const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', this.handlePaymentMethodChange.bind(this));
        });
    }

    cleanup() {
        this.stopPolling();
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
    }
}

// Initialize the payment handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});
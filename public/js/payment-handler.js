// payment-handler.js
class PaymentHandler {
    constructor() {
        this.form = document.getElementById('mpesaForm');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.cancelButton = document.getElementById('cancelPayment');
        this.messageTimeout = null;
        this.messageContainer = this.createMessageContainer();
        
        this.initializeEventListeners();
    }

    createMessageContainer() {
        const container = document.createElement('div');
        container.className = 'fixed top-4 right-4 max-w-sm';
        document.body.appendChild(container);
        return container;
    }

    showMessage(message, type = 'info') {
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        const existingMessage = this.messageContainer.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message p-4 rounded-lg shadow-lg mb-4 animate-fade-in ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        messageElement.textContent = message;

        this.messageContainer.appendChild(messageElement);

        this.messageTimeout = setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    async checkPaymentStatus(checkoutRequestId) {
        const maxAttempts = 10;
        const delayBetweenAttempts = 6000;
        let attempts = 0;

        const checkStatus = async () => {
            if (attempts >= maxAttempts) {
                throw new Error('Payment status check timed out. Please check your order status.');
            }

            try {
                const response = await fetch(`/checkout/api/payments/mpesa/status/${checkoutRequestId}`);
                if (!response.ok) {
                    throw new Error('Failed to check payment status');
                }

                const data = await response.json();

                if (data.success && data.status === 'completed') {
                    this.showMessage('Payment successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = `/orders/${window.orderId}`;
                    }, 2000);
                    return true;
                }

                attempts++;
                this.showMessage(`Checking payment status... Attempt ${attempts}/${maxAttempts}`, 'info');
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
                return checkStatus();
            } catch (error) {
                this.showMessage(error.message, 'error');
                return false;
            }
        };

        return checkStatus();
    }

    validatePhoneNumber(phone) {
        return /^254[17]\d{8}$/.test(phone);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const phoneNumber = document.getElementById('mpesaNumber').value.trim();
        
        if (!this.validatePhoneNumber(phoneNumber)) {
            this.showMessage('Invalid phone number format. Use format: 254XXXXXXXXX', 'error');
            return;
        }

        try {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
            
            const response = await fetch('/checkout/api/payments/mpesa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: window.orderId,
                    phoneNumber: phoneNumber
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to initiate payment');
            }

            if (!data.success) {
                throw new Error(data.message);
            }

            this.showMessage('Please check your phone for the M-Pesa prompt', 'info');
            await this.checkPaymentStatus(data.checkoutRequestID);

        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = 'Submit Payment';
        }
    }

    handleCancel() {
        if (confirm('Are you sure you want to cancel this payment?')) {
            window.location.href = '/order/my-orders';
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
}

// Initialize the payment handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});

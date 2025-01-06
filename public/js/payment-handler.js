// payment-handler.js
class PaymentHandler {
    constructor() {
        this.form = document.getElementById('mpesaForm');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.cancelButton = document.getElementById('cancelPayment');
        this.messageTimeout = null;
        this.messageContainer = this.createMessageContainer();
        this.checkingPayment = false;
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
        const maxAttempts = 20;
        const delayBetweenAttempts = 10000;
        let attempts = 0;

        const checkStatus = async () => {
            if (attempts >= maxAttempts) {
                this.showMessage(
                    'Payment verification is taking longer than expected. The payment might still be processing.',
                    'info'
                );

                // Add retry button to message container
                const retryButton = document.createElement('button');
                retryButton.className = 'bg-white text-blue-500 px-4 py-2 rounded mt-2';
                retryButton.textContent = 'Check Again';
                retryButton.onclick = () => {
                    attempts = 0; // Reset attempts
                    this.checkPaymentStatus(checkoutRequestId);
                };

                const messageElement = this.messageContainer.querySelector('.message');
                if (messageElement) {
                    messageElement.appendChild(retryButton);
                }

                return false;
            }

            try {
                // Add timestamp to prevent caching
                const timestamp = new Date().getTime();
                const response = await fetch(
                    `/checkout/api/payments/mpesa/status/${checkoutRequestId}?t=${timestamp}`,
                    {
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Network response was not ok');
                }

                const data = await response.json();

                if (data.status === 'completed') {
                    this.showMessage('Payment successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = `/orders/${window.orderId}`;
                    }, 2000);
                    return true;
                }

                if (data.status === 'failed') {
                    this.showMessage(data.message || 'Payment failed. Please try again.', 'error');
                    return false;
                }

                attempts++;
                this.showMessage(
                    `Verifying payment... (Attempt ${attempts}/${maxAttempts})`,
                    'info'
                );
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
                return checkStatus();

            } catch (error) {
                console.error('Payment status check error:', error);

                // If it's a network error, show specific message
                if (!navigator.onLine || error.name === 'NetworkError') {
                    this.showMessage('Network connection issue. Retrying...', 'error');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return checkStatus();
                }

                // For other errors, increment attempts and continue
                attempts++;
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
                return checkStatus();
            }
        };

        if (this.checkingPayment) {
            return false;
        }

        this.checkingPayment = true;
        try {
            return await checkStatus();
        } finally {
            this.checkingPayment = false;
        }
    }

    async checkInitialPaymentStatus(orderId) {
        try {
            const response = await fetch(`/orders/${orderId}`);
            const data = await response.json();

            if (data.paymentStatus === 'completed') {
                this.showMessage('Payment already completed! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = `/orders/${orderId}`;
                }, 2000);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking initial payment status:', error);
            return false;
        }
    }

    validatePhoneNumber(phone) {
        return /^254[17]\d{8}$/.test(phone);
    }

    async handleSubmit(e) {
        e.preventDefault();

        const phoneNumber = document.getElementById('mpesaNumber').value.trim();

        // Check if payment is already completed
        const isCompleted = await this.checkInitialPaymentStatus(window.orderId);
        if (isCompleted) {
            return;
        }

        if (!this.validatePhoneNumber(phoneNumber)) {
            this.showMessage('Invalid phone number format. Use format: 254XXXXXXXXX', 'error');
            return;
        }

        try {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

            const response = await fetch('/api/payments/mpesa/initiate', {
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
}

// Initialize the payment handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});

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
        this.eventSource = null;
        
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

    setupEventSource(orderId) {
        // Close existing connection if any
        if (this.eventSource) {
            this.eventSource.close();
        }

        // Create new EventSource connection
        this.eventSource = new EventSource(
            `https://zetucartcallback-eee8ec216ed4.herokuapp.com/payments/mpesa/events?orderId=${orderId}`
        );

        // Handle incoming messages
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.status === 'completed') {
                this.showMessage('Payment successful! Redirecting...', 'success');
                this.eventSource.close();
                setTimeout(() => {
                    window.location.href = `/orders/${data.orderId}`;
                }, 2000);
            } else if (data.status === 'failed') {
                this.showMessage(data.message || 'Payment failed. Please try again.', 'error');
                this.eventSource.close();
                this.enableForm();
            }
        };

        // Handle connection errors
        this.eventSource.onerror = () => {
            console.error('SSE connection failed');
            this.eventSource.close();
            this.showMessage('Connection lost. Please check your payment status in your orders.', 'error');
        };
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
                    orderId: window.orderId,
                    phoneNumber: phoneNumber
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to initiate payment');
            }

            // Show success message and setup SSE
            this.showMessage('Please check your phone for the M-Pesa prompt', 'info');
            this.setupEventSource(window.orderId);

        } catch (error) {
            this.showMessage(error.message, 'error');
            this.enableForm();
        }
    }

    handleCancel() {
        if (confirm('Are you sure you want to cancel this payment?')) {
            if (this.eventSource) {
                this.eventSource.close();
            }
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
        if (this.eventSource) {
            this.eventSource.close();
        }
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
    }
}

// Initialize the payment handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});
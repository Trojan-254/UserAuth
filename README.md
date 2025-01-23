# ZetuCart - Your Premier Shopping Destination
![ZetuCart Banner](https://i.pinimg.com/736x/46/82/0d/46820ddf3ac929d0c61e35ee74eb6700.jpg "ZetuCart - Shop Smart")

Welcome to ZetuCart, Kenya's premier ecommerce platform. We offer a seamless online shopping experience with top-notch products, exclusive deals, and fast delivery.

## 🌟 Features

- **User-Friendly Interface**: Intuitive navigation for a seamless shopping experience
- **Popular Categories**: Electronics, Fashion, Home & Living, Beauty, and more
- **Hot Deals**: Exclusive discounts, flash sales, and bundle offers
- **Secure Payments**: Multiple payment options, including M-Pesa integration
- **Fast Delivery**: Next-day delivery in major cities across Kenya
- **Easy Returns**: Hassle-free returns within 7 days
- **Partner Brands**: Trusted collaborations with Mpesa, KCB Bank, Airtel Money, and more

## 📂 Project Structure

```
ZetuCart/
├── index.js              # Entry point for the server
├── package.json          # Project dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── views/                # EJS templates for frontend rendering
├── public/              # Static files (CSS, JS, Images)
├── controllers/         # Controllers(product, order, review, seller)
├── routes/              # Backend routes
├── models/              # Database schemas
├── middleware/          # Custom middleware functions
├── uploads/             # Directory for user-uploaded content
├── utils/               # Utility functions
├── seedCategories/              # Seed categories code
└── README.md            # Project documentation
```

## 🛠️ Tech Stack

- **Frontend**: EJS, Tailwind CSS, FontAwesome
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Payment Integration**: M-Pesa API
- **Hosting**: Heroku

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- MongoDB set up locally or on the cloud

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Trojan-254/ZetuCart.git
cd ZetuCart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=<your_mongodb_uri>
MPESA_CONSUMER_KEY=<your_consumer_key>
MPESA_CONSUMER_SECRET=<your_consumer_secret>
MONGO_URL=<your_mongodb_url>
JWT_SECRET=<your_jwt_passkey>
EMAIL=<your_service_email>
PASSWORD=<your_service_email_password>
MPESA_CALLBACK_URL=<your_callback_url>
MPESA_BASE_URL=<mpesa_base_url>
MPESA_PASSKEY=<your_mpesa_passkey>
NEW_DB_PASSWORD=<your_mongo_db_password>
MPESA_SHORTCODE=<your_mpesa_shortcode>
```

4. Start the development server:
```bash
npm start
```

5. Visit the app:
```
http://localhost:5000
```

## 📄 Key Pages

- **Homepage**: A dynamic interface featuring categories, deals, and testimonials
- **Products**: Explore popular product groups
- **Deals**: Access hot sales and bundle offers
- **User Profiles**: Secure account management for personalized experiences

## 🤝 Trusted Partners

ZetuCart collaborates with leading Kenyan brands:
- Mpesa
- KCB Bank
- Airtel Money
- Kenya Airways
- And more!

## 🧪 Testing

Run unit tests:
```bash
npm test
```

## 🙌 Community and Contributions

We welcome contributions! Here's how:

1. Fork the repository
2. Create a new branch:
```bash
git checkout -b feature/new-feature
```

3. Commit your changes:
```bash
git commit -m "Add a new feature"
```

4. Push to your branch:
```bash
git push origin feature/new-feature
```

5. Create a Pull Request

## 📧 Contact

For inquiries or support:
- **Email**: support@zetucart.com
- **Twitter**: @zetucart

## ⚖️ License

This project is licensed under the MIT License.

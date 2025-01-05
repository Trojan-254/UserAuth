const mongoose = require('mongoose');
const Category = require('./models/Category'); // Adjust the path to your Category model

// Connect to MongoDB
mongoose.connect('mongodb+srv://simiyu:misiyu254@zetucart.1gtqj.mongodb.net/?retryWrites=true&w=majority&appName=ZetuCart', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Connection error:', error));

// Categories to insert
const categories = [
    { name: 'Home Décor', description: 'Decorative items for your home', icon: 'fas fa-gem' },
    { name: 'Fashion & Textiles', description: 'Clothing and textile products', icon: 'fas fa-tshirt' },
    { name: 'Dairy Products', description: 'Fresh dairy items', icon: 'fas fa-cheese' },
    { name: 'Art & Collectibles', description: 'Unique artworks and collectibles', icon: 'fas fa-paint-brush' },
    { name: 'Beauty & Personal Care', description: 'Beauty and self-care products', icon: 'fas fa-heart' },
];

// Insert categories into the database
const loadCategories = async () => {
    try {
        await Category.deleteMany(); // Optional: Clears existing categories
        await Category.insertMany(categories);
        console.log('Categories have been successfully inserted!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error inserting categories:', error);
        mongoose.connection.close();
    }
};

// Run the function
loadCategories();

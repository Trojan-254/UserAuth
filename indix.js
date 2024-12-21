require("dotenv").config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connection to database has been established...");

    // Create a top-level category
    const electronics = await Category.create({
      name: "Electronics",
      description: "Devices and gadgets",
    });

    console.log("Created Category:", electronics);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
})();


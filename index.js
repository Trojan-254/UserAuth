require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const productRoutes = require("./routes/product");
const checkoutRoutes = require("./routes/checkout");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const w = require("./routes/wishlist");
const mpesaRoutes = require('./routes/mpesa');
const errorHandler = require("./middleware/errorMiddleware");
const auth = require("./middleware/authMiddleware");
const exphbs = require('express-handlebars');
const app = express();
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const cors = require('cors');


// App middlewares
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Allow ngrok
app.use(cors());

// Error handling middleware
app.use(errorHandler);

// Handle bars
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    helpers: {
        eq: function (a, b) { return a === b; }
    }
}));

//app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended: true}));
// EJS Template engine
app.set('view engine', 'ejs', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Mongodb connection
mongoose.connect(process.env.MONGO_URL, {
    UseNewUrlParser: true,
    UseUnifiedTopology: true
}).then(() => {
   console.log("Connection to database has been established...");
}).catch(err => {
   console.log(err)
});

// Routes
//app.use(auth);
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use('/api', mpesaRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/wishlist", w);
app.use("/email-verification/:token", authRoutes);
app.get('/', (req, res) => {
    res.render('landing', { isAuthenticated: req.isAuthenticated });
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.get("/confirmation", (re, res) => {
   res.sendFile(path.join(__dirname, "views", "confirmation.html"));
});

app.get("/login", (req, res) => {
   res.sendFile(path.join(__dirname, "views", "login.html"));
});

//app.get("/logout", auth, (req, res) => {
//    res.clearCookie('authToken');
//    res.redirect('/login');
//});

app.get("/dashboard", auth, (req, res) => {
     try {
        console.log('User object', req.user);
        res.render('dashboard', { username: req.user.username });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});




// Start the fucking damned server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.clear();
    console.log(`
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                                                           ┃
    ┃                                                           ┃
    ┃               🚀🚀  Zetu Cart Server is Live!   🚀🚀      ┃
    ┃                                                           ┃
    ┃                                                           ┃
    ┃ --------------------------------------------------------- ┃
    ┃ 🌐        Listening on: http://localhost:${PORT}          ┃
    ┃             📡 Connecting to database... 📡               ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    `);
});


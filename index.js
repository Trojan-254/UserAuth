require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const app = express();
const cookieParser = require('cookie-parser');

// App middlewares
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, 'public')));
// EJS Template engine
app.set('view engine', 'ejs');
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
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/email-verification/:token", authRoutes);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "landing.html"));
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

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

// Start the damned server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("");
    console.log("++++++++++++++++++++++++ Hello welcome +++++++++++++++++")
    console.log(`Server is Up and running listening on port ${PORT}.....`);
    console.log("Connecting to database.......")
})

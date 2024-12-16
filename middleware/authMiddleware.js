const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;  // Attach the decoded user data to req.user
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        res.status(401).json({ error: 'Token is not valid' });
    }
};

module.exports = auth;

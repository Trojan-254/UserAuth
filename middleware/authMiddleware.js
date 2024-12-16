const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.cookies.authToken;  // Get token from cookies

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify the token
        req.user = decoded.user;  // Attach the decoded user data to req.user
        next();
    } catch (err) {
        console.error('Token verification failed:', err);  // Log error if token verification fails
        res.status(401).json({ error: 'Token is not valid' });
    }
};

module.exports = auth;


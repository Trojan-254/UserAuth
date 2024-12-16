const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Get token from headers
    const token = req.header('x-auth-token');

    if (!token) {
       return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'token is not valid' });
    }
};

module.exports = auth;

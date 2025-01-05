const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.cookies.authToken;

    // Helper function to determine if request expects JSON
    const isApiRequest = req.xhr || 
       req.headers.accept?.includes('application/json') ||
       req.path.startsWith('/api/');

    if (!token) {
        req.isAuthenticated = false;

        // For API requests, still return JSON
        if (isApiRequest) {
           return res.status(401).json({
               error: 'No token, authorization denied'
           });
        }

        // For regular requests, return user to login.
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        req.user = decoded.user;  // Attach the decoded user data to req.user
        req.isAuthenticated = true;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        req.isAuthenticated = false;

        // For API requests, return JSON error
        if (isApiRequest) {
           return res.status(401).json({
             error: 'Token is not valid'
           });
        }

        return res.redirect('/login');
    }
};

module.exports = auth;

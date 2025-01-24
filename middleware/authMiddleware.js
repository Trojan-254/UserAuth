const jwt = require('jsonwebtoken');

// General authentication middleware
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
                success: false,
               error: 'No token, authorization denied',
               redirectUrl: '/login'
           });

        }

        // For regular requests, return user to login
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// Seller verification middleware
const verifySeller = (req, res, next) => {
    const token = req.cookies.authToken;
    
    const isApiRequest = req.xhr || 
       req.headers.accept?.includes('application/json') ||
       req.path.startsWith('/api/');

    if (!token) {
        req.isAuthenticated = false;
        
        if (isApiRequest) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }
        return res.redirect('/seller/login');  // Changed from commented out to active
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.seller || decoded.seller.role !== 'seller') {
            if (isApiRequest) {
                return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
            }
            return res.redirect('/seller/login');
        }

        req.seller = decoded.seller;  // Attach the seller data
        req.isAuthenticated = true;
        console.log('Seller verified:', decoded.seller);
        next();
    } catch (err) {
        console.error('Seller verification failed:', err);
        req.isAuthenticated = false;
        
        if (isApiRequest) {
            return res.status(401).json({ error: 'Token is not valid' });
        }
        return res.redirect('/seller/login');
    }
};

module.exports = {
    auth,
    verifySeller
};
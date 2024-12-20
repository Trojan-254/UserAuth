

const admin = async (req, res, next) => {
    try {
        // auth middleware should be used before this middleware
        // so we can assume req.user exists
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = admin;

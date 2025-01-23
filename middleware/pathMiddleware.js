const pathMiddleware = (req, res, next) => {
    res.locals.path = req.path; // Makes path available to all views
    next();
};

module.exports = pathMiddleware;
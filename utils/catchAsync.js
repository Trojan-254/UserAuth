/**
 * Wraps an async function and catches any errors, passing them to Express error handler
 * @param {Function} fn - Async function to be wrapped
 * @returns {Function} Express middleware function
 */
const catchAsync = fn => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  module.exports = catchAsync;
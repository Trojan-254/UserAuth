// flashMiddleware.js
const createFlashMiddleware = (options = {}) => {
    return (req, res, next) => {
      if (!req.session) {
        throw new Error('Flash middleware requires session middleware');
      }
  
      // Initialize flash messages in session if they don't exist
      req.session.flash = req.session.flash || {};
  
      // Add flash method to request object
      req.flash = (type, message) => {
        if (!message) {
          // If only one argument, return and clear messages of that type
          const messages = req.session.flash[type] || [];
          delete req.session.flash[type];
          return messages;
        }
        
        // Store the message
        req.session.flash[type] = req.session.flash[type] || [];
        req.session.flash[type].push(message);
      };
  
      // Add flash messages to response locals for template access
      res.locals.flash = req.session.flash;
      
      // Clear flash messages after response
      res.on('finish', () => {
        req.session.flash = {};
      });
  
      next();
    };
  };
  
  module.exports = createFlashMiddleware;
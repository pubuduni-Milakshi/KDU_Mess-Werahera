const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload to request object
    req.user = decoded;
    
    // Continue to next middleware or route handler
    next();
  } catch (error) {
    // Token is invalid
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Export as both named and default export for flexibility
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.authenticate = authMiddleware; // alias for compatibility
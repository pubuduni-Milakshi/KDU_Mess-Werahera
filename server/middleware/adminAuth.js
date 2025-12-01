// Middleware to check if user is Admin
// Must be used AFTER auth middleware
module.exports = function(req, res, next) {
  // Check if user object exists (should be set by auth middleware)
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  // Check if user role is Admin
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }

  // User is admin, continue
  next();
};
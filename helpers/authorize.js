function authorize(...roles) {
    return (req, res, next) => {
        // Check if user is authenticated (from JWT middleware)
        if (!req.auth) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized - No token provided' 
            });
        }

        // Check if user has required role
        const userIsAdmin = req.auth.isAdmin;
        
        // If roles specified and user doesn't have permission
        if (roles.length && !roles.includes(userIsAdmin ? 'admin' : 'user')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden - Insufficient permissions' 
            });
        }

        // User is authorized, proceed
        next();
    };
}

// Convenience middleware for common scenarios
const authorize_admin = () => authorize('admin');
const authorize_user = () => authorize('user', 'admin');

module.exports = {
    authorize,
    authorize_admin,
    authorize_user
};

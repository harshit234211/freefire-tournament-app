const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token in request headers
const authenticate = function (req, res, next) {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretkey');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Check if user has permission (role verification)
const restrictTo = function (...allowedRoles) {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ msg: `Access denied. Authorized roles: ${allowedRoles.join(', ')}` });
            }

            next();
        } catch (err) {
            res.status(500).send('Server authorization error');
        }
    };
};

module.exports = {
    authenticate,
    restrictTo
};

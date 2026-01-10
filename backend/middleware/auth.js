/**
 * @fileoverview Authentication and Authorization Middleware.
 *
 * This file contains middleware functions to protect API endpoints.
 * - `auth`: Verifies a JSON Web Token (JWT) to authenticate a user.
 * - `authorize`: Checks if the authenticated user has the required role(s) to access a resource.
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Authentication middleware to verify a JWT token.
 * It expects the token to be provided in the 'Authorization' header with the 'Bearer' scheme.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The next middleware function.
 */
const auth = async (req, res, next) => {
  try {
    // 1. Extract the token from the 'Authorization' header.
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token is provided, deny access.
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied. No authentication token was provided.'
      });
    }

    // 2. Verify the token using the JWT secret.
    // This will throw an error if the token is invalid or expired.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Validate the user from the token against the database.
    // This ensures the user still exists and is active.
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, role, status FROM users WHERE id = ? AND status = "active"',
      [decoded.id]
    );

    // If no matching active user is found, the token is considered invalid.
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication Failed. The user associated with this token could not be found or is inactive.'
      });
    }

    // 4. Attach the user object to the request for use in subsequent route handlers.
    req.user = users[0];
    
    // Proceed to the next middleware or route handler.
    next();
  } catch (error) {
    // Handle specific JWT errors for clearer client feedback.
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication Failed. The provided token is invalid.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication Failed. The provided token has expired.'
      });
    }
    
    // For any other errors during the process, return a generic server error.
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during authentication.'
    });
  }
};

/**
 * Authorization middleware that creates a role-based access control check.
 * This is a higher-order function that takes a list of roles and returns a middleware.
 *
 * @param {...string} roles - A list of roles that are permitted to access the resource (e.g., 'admin', 'manager').
 * @returns {function} An Express middleware function.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // This middleware assumes the `auth` middleware has already run and attached `req.user`.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in to access this resource.'
      });
    }

    // Check if the user's role is included in the list of allowed roles.
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access Forbidden. You do not have the required permissions. Required role(s): ${roles.join(' or ')}.`
      });
    }

    // If the user has the required role, proceed to the next middleware or route handler.
    next();
  };
};

module.exports = { auth, authorize };

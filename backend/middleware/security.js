/**
 * @fileoverview Security Middleware for Cybersecurity Hardening
 * 
 * This file contains multiple layers of security protection for the application:
 * 1. Rate Limiting: To prevent brute-force attacks and Denial-of-Service (DoS).
 * 2. Input Sanitization: To protect against Cross-Site Scripting (XSS) attacks.
 * 3. Environment Validation: To ensure the server starts with a valid configuration.
 * 4. Error Sanitization: To prevent leaking sensitive information in error messages.
 */

const rateLimit = require('express-rate-limit');

// =====================================================
// RATE LIMITERS
// =====================================================

/**
 * Rate limiter specifically for the login endpoint.
 * This helps prevent brute-force attacks by limiting the number of login attempts
 * from a single IP address within a specific time window.
 */
const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2-minute window.
  max: 5, // Allows a maximum of 5 login attempts per IP within the window.
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 2 minutes.'
  },
  standardHeaders: true, // Returns rate limit info in the `RateLimit-*` headers.
  legacyHeaders: false, // Disables the `X-RateLimit-*` headers.
  // The rate limiter is skipped in development mode to not hinder testing.
  skip: (req) => process.env.NODE_ENV === 'development',
});

/**
 * A general-purpose rate limiter for all other API endpoints.
 * This provides a baseline of protection against spamming and DoS attacks.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window.
  max: 100, // Allows a maximum of 100 requests per minute per IP.
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  },
  // Skips the rate limit for localhost requests during development.
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1',
});

/**
 * A specific rate limiter for webhook endpoints.
 * Webhooks can be high-traffic, so they get a separate, more lenient limit
 * to prevent legitimate traffic from being blocked.
 */
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window.
  max: 30, // Allows a maximum of 30 webhook calls per minute.
  message: {
    success: false,
    message: 'Webhook rate limit exceeded. Please slow down your requests.'
  }
});

// =====================================================
// INPUT SANITIZATION
// =====================================================

/**
 * Middleware to sanitize user input from the request body, query, and params.
 * This is a crucial security measure to prevent Cross-Site Scripting (XSS) attacks.
 * It recursively iterates over the input objects and removes potentially malicious code.
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    // Iterate over all keys in the object.
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // If the value is a string, apply sanitization rules.
        // This regex-based approach removes script tags, iframes, javascript protocols, and event handlers.
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // If the value is another object, recurse into it.
        sanitize(obj[key]);
      }
    });
  };

  // Sanitize all major parts of the request where user input can be found.
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next(); // Pass control to the next middleware.
};

// =====================================================
// ENVIRONMENT VALIDATION
// =====================================================

/**
 * Validates that all required environment variables are present on server startup.
 * It also checks the strength of the JWT secret.
 * This prevents the application from starting with a critical misconfiguration.
 */
const validateEnv = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ FATAL SECURITY ERROR: Missing critical environment variables:', missing.join(', '));
    process.exit(1); // Terminate the process if any required variable is missing.
  }
  
  // A weak JWT secret can compromise the entire authentication system.
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  SECURITY WARNING: The provided JWT_SECRET is weak and should be at least 32 characters long!');
  }
};

// =====================================================
// ERROR SANITIZATION
// =====================================================

/**
 * Global error handling middleware.
 * It catches errors and formats the response, ensuring that sensitive information
 * like stack traces is not leaked to the client in a production environment.
 */
const errorSanitizer = (err, req, res, next) => {
  // Log the full error internally for debugging purposes.
  console.error('Internal Server Error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    // In production, send a generic, non-informative error message.
    res.status(err.status || 500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    });
  } else {
    // In development, send a detailed error message including the stack trace.
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: err.stack // The stack trace is useful for debugging.
    });
  }
};

module.exports = {
  loginLimiter,
  apiLimiter,
  webhookLimiter,
  sanitizeInput,
  validateEnv,
  errorSanitizer
};

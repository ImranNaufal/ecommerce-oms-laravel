/**
 * Security Middleware - Cybersecurity Hardening
 * 
 * This file contains multiple layers of security protection:
 * 1. Rate limiting (prevent brute force)
 * 2. Input sanitization (prevent XSS)
 * 3. Request validation
 * 4. IP blocking (optional)
 */

const rateLimit = require('express-rate-limit');

// Rate Limiter untuk Login (Prevent Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minit
  max: 5, // Max 5 attempts per IP
  message: {
    success: false,
    message: 'Terlalu banyak cubaan login. Sila cuba selepas 15 minit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter untuk API umum (Prevent DDoS)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minit
  max: 100, // Max 100 requests per minit per IP
  message: {
    success: false,
    message: 'Terlalu banyak request. Sila cuba sebentar lagi.'
  },
  skip: (req) => {
    // Skip rate limit untuk localhost development
    return req.ip === '::1' || req.ip === '127.0.0.1';
  }
});

// Rate Limiter untuk Webhook (Prevent Spam)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // Max 30 webhook calls per minit
  message: {
    success: false,
    message: 'Webhook rate limit exceeded'
  }
});

// Input Sanitization - Buang script tags dan dangerous characters
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove HTML tags and dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    });
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// Validate Environment Variables (Prevent misconfiguration)
const validateEnv = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ SECURITY ERROR: Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  // Check JWT secret strength
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long!');
  }
};

// Hide Sensitive Error Details dari Response (Prevent Info Leakage)
const errorSanitizer = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Jangan expose internal error details dalam production
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      success: false,
      message: 'An error occurred. Please try again later.',
      // NO stack trace or internal details
    });
  } else {
    // Development mode - show details untuk debugging
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: err.stack
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

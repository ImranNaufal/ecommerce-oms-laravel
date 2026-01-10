/**
 * @fileoverview Authentication routes for user registration, login, and profile management.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth'); // Auth middleware for protected routes

const router = express.Router();

// =====================================================
// ROUTE: POST /api/auth/register
// =====================================================
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (staff or affiliate).
 * @access  Public
 */
router.post('/register', [
  // --- Validation and Sanitization Middleware ---
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('role').optional().isIn(['staff', 'affiliate']).withMessage('Invalid role specified. Must be "staff" or "affiliate".')
], async (req, res) => {
  try {
    // --- Input Validation ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, full_name, role = 'staff' } = req.body;

    // --- Check for Existing User ---
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ // 409 Conflict is more appropriate here
        success: false,
        message: 'A user with this email or username already exists.'
      });
    }

    // --- Password Hashing ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Database Insertion ---
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name, role]
    );
    const newUserId = result.insertId;

    // --- Post-Registration Logic (e.g., for Affiliates) ---
    if (role === 'affiliate') {
      // Create a default commission configuration for the new affiliate.
      await pool.query(
        'INSERT INTO commission_configs (user_id, commission_type, commission_value, effective_from) VALUES (?, ?, ?, CURDATE())',
        [newUserId, 'percentage', 5.00] // Default 5% commission
      );
    }

    // --- Success Response ---
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      userId: newUserId
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during registration.'
    });
  }
});

// =====================================================
// ROUTE: POST /api/auth/login
// =====================================================
/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and return a JWT.
 * @access  Public
 */
router.post('/login', [
  // --- Validation and Sanitization ---
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
], async (req, res) => {
  try {
    // --- Input Validation ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // --- User Lookup ---
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ // 401 Unauthorized for security (avoids user enumeration)
        success: false,
        message: 'Invalid credentials. Please check your email and password.'
      });
    }
    const user = users[0];

    // --- Account Status Check ---
    if (user.status !== 'active') {
      return res.status(403).json({ // 403 Forbidden
        success: false,
        message: 'This account is currently inactive or has been suspended.'
      });
    }

    // --- Password Verification ---
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email and password.'
      });
    }

    // --- JWT Generation ---
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' } // Token expires in 7 days or as configured
    );

    // --- Success Response ---
    // Do not send the hashed password back to the client.
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.'
    });
  }
});

// =====================================================
// ROUTE: GET /api/auth/me
// =====================================================
/**
 * @route   GET /api/auth/me
 * @desc    Get the profile of the currently authenticated user.
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // The `auth` middleware has already verified the token and attached the user to `req.user`.
    // We fetch fresh, detailed data from the database.
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.phone, u.created_at,
              cc.commission_type, cc.commission_value, cc.tier
       FROM users u
       LEFT JOIN commission_configs cc ON u.id = cc.user_id AND cc.is_active = TRUE
       WHERE u.id = ?`,
      [req.user.id] // Use the user ID from the authenticated token payload
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred while fetching the user profile.'
    });
  }
});

module.exports = router;

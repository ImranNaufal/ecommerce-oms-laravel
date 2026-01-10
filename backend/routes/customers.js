const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const { search, customer_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (customer_type) {
      query += ' AND customer_type = ?';
      params.push(customer_type);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [customers] = await pool.query(query, params);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single customer with order history
router.get('/:id', auth, async (req, res) => {
  try {
    const [customers] = await pool.query(
      'SELECT * FROM customers WHERE id = ?',
      [req.params.id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customers[0];

    // Get recent orders
    const [orders] = await pool.query(
      `SELECT id, order_number, total, status, payment_status, created_at
       FROM orders
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    customer.recent_orders = orders;

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create customer
router.post('/', [
  auth,
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('phone').optional().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      email, full_name, phone, address, city, state,
      postal_code, country = 'Malaysia', customer_type = 'retail'
    } = req.body;

    // Check if customer already exists
    const [existing] = await pool.query(
      'SELECT id FROM customers WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO customers 
       (email, full_name, phone, address, city, state, postal_code, country, customer_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, full_name, phone, address, city, state, postal_code, country, customer_type]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customerId: result.insertId
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update customer
router.put('/:id', [
  auth,
  authorize('admin', 'staff')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if customer exists
    const [existing] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Build dynamic update query
    const allowedFields = ['full_name', 'phone', 'address', 'city', 'state', 
                           'postal_code', 'country', 'customer_type'];
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(id);
    await pool.query(
      `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

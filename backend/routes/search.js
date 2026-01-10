const express = require('express');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Universal quick search - searches across orders, products, customers, affiliates
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          orders: [],
          products: [],
          customers: [],
          affiliates: []
        }
      });
    }

    const searchTerm = `%${q}%`;

    // Search Orders (limit 5)
    const [orders] = await pool.query(
      `SELECT 
         o.id, 
         o.order_number, 
         o.total, 
         o.status,
         c.full_name as customer_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.order_number LIKE ?
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [searchTerm]
    );

    // Search Products (limit 5)
    const [products] = await pool.query(
      `SELECT 
         id, 
         sku, 
         name, 
         price, 
         stock_quantity
       FROM products
       WHERE name LIKE ? OR sku LIKE ?
       LIMIT 5`,
      [searchTerm, searchTerm]
    );

    // Search Customers (limit 5)
    const [customers] = await pool.query(
      `SELECT 
         id, 
         full_name, 
         email, 
         total_orders
       FROM customers
       WHERE full_name LIKE ? OR email LIKE ?
       LIMIT 5`,
      [searchTerm, searchTerm]
    );

    // Search Affiliates (admin only)
    let affiliates = [];
    if (req.user.role === 'admin') {
      const [result] = await pool.query(
        `SELECT 
           u.id, 
           u.full_name, 
           u.email,
           cc.commission_value,
           cc.tier
         FROM users u
         LEFT JOIN commission_configs cc ON u.id = cc.user_id AND cc.is_active = TRUE
         WHERE u.role = 'affiliate' 
         AND (u.full_name LIKE ? OR u.email LIKE ?)
         LIMIT 5`,
        [searchTerm, searchTerm]
      );
      affiliates = result;
    }

    res.json({
      success: true,
      data: {
        orders,
        products,
        customers,
        affiliates
      }
    });
  } catch (error) {
    console.error('Quick search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

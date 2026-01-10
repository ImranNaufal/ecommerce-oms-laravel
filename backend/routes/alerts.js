const express = require('express');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get system alerts (low stock, pending orders, etc)
router.get('/', auth, async (req, res) => {
  try {
    const alerts = [];

    // Low Stock Alert (Admin/Staff only)
    if (['admin', 'staff'].includes(req.user.role)) {
      const [lowStock] = await pool.query(
        `SELECT 
           COUNT(*) as count,
           GROUP_CONCAT(name SEPARATOR ', ') as products
         FROM products
         WHERE stock_quantity <= low_stock_threshold 
         AND stock_quantity > 0
         AND status = 'active'
         LIMIT 10`
      );

      if (lowStock[0].count > 0) {
        alerts.push({
          id: 'low_stock',
          type: 'warning',
          title: `${lowStock[0].count} Low Stock Products`,
          message: `The following products need restocking: ${lowStock[0].products}`,
          priority: 'medium',
          action_url: '/products',
          action_label: 'View Products'
        });
      }
    }

    // Out of Stock Alert
    if (['admin', 'staff'].includes(req.user.role)) {
      const [outStock] = await pool.query(
        'SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND status = "active"'
      );

      if (outStock[0].count > 0) {
        alerts.push({
          id: 'out_stock',
          type: 'danger',
          title: `${outStock[0].count} Out of Stock Products`,
          message: 'There are products that need immediate restocking',
          priority: 'high',
          action_url: '/products',
          action_label: 'Manage Stock'
        });
      }
    }

    // Pending Orders Alert
    const [pendingOrders] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE status = 'pending' 
       AND DATE(created_at) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ${req.user.role === 'staff' ? 'AND assigned_staff_id = ?' : ''}`,
      req.user.role === 'staff' ? [req.user.id] : []
    );

    if (pendingOrders[0].count > 0) {
      alerts.push({
        id: 'pending_orders',
        type: 'info',
        title: `${pendingOrders[0].count} Pending Orders`,
        message: 'There are orders waiting to be processed',
        priority: 'medium',
        action_url: '/orders?status=pending',
        action_label: 'View Orders'
      });
    }

    // Pending Commission Approval (Admin only)
    if (req.user.role === 'admin') {
      const [pendingCommissions] = await pool.query(
        `SELECT 
           COUNT(*) as count,
           SUM(amount) as total_amount
         FROM commission_transactions
         WHERE status = 'pending'`
      );

      if (pendingCommissions[0].count > 0) {
        alerts.push({
          id: 'pending_commissions',
          type: 'warning',
          title: `${pendingCommissions[0].count} Commissions Pending Approval`,
          message: `Total amount: RM ${parseFloat(pendingCommissions[0].total_amount).toFixed(2)}`,
          priority: 'medium',
          action_url: '/commissions',
          action_label: 'Review Commissions'
        });
      }
    }

    // Unpaid Orders Alert (24 hours+)
    const [unpaidOrders] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE payment_status = 'pending' 
       AND DATE(created_at) < DATE_SUB(NOW(), INTERVAL 1 DAY)
       ${req.user.role === 'staff' ? 'AND assigned_staff_id = ?' : ''}`,
      req.user.role === 'staff' ? [req.user.id] : []
    );

    if (unpaidOrders[0].count > 0) {
      alerts.push({
        id: 'unpaid_orders',
        type: 'warning',
        title: `${unpaidOrders[0].count} Unpaid Orders`,
        message: 'Orders over 24 hours without payment',
        priority: 'high',
        action_url: '/orders?payment_status=pending',
        action_label: 'Take Action'
      });
    }

    // Sort by priority (high > medium > low)
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({
      success: true,
      data: {
        alerts,
        total_count: alerts.length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

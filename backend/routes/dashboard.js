const express = require('express');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics (OPTIMIZED)
router.get('/stats', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    // Role-based statistics
    if (userRole === 'admin') {
      // Admin sees everything - Single optimized query with all metrics
      const [orders] = await pool.query(
        `SELECT 
           COUNT(*) as total_orders,
           SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
           SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_revenue,
           SUM(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) as recent_orders,
           AVG(CASE WHEN payment_status = 'paid' THEN total END) as avg_order_value,
           SUM(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY) AND payment_status = 'paid' THEN total ELSE 0 END) as recent_revenue
         FROM orders`,
        [period, period]
      );
      
      // Calculate total profit (NEW!)
      const [profit] = await pool.query(
        `SELECT 
           SUM(oi.profit) as total_profit,
           SUM(oi.subtotal) as total_sales
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.payment_status = 'paid'`
      );
      
      const profitMargin = profit[0].total_sales > 0 
        ? ((profit[0].total_profit / profit[0].total_sales) * 100).toFixed(1)
        : 0;
      
      orders[0].total_profit = profit[0].total_profit || 0;
      orders[0].profit_margin = profitMargin;

      const [products] = await pool.query(
        `SELECT 
           COUNT(*) as total_products,
           SUM(stock_quantity) as total_stock,
           COUNT(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 END) as low_stock_items
         FROM products`
      );

      const [customers] = await pool.query(
        `SELECT 
           COUNT(*) as total_customers,
           COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as new_customers
         FROM customers`,
        [period]
      );

      const [commissions] = await pool.query(
        `SELECT 
           SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_commissions,
           SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_commissions,
           SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_commissions
         FROM commission_transactions
         WHERE DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [period]
      );

      stats = {
        orders: orders[0],
        products: products[0],
        customers: customers[0],
        commissions: commissions[0]
      };

    } else if (userRole === 'staff') {
      // Staff sees their assigned orders
      const [orders] = await pool.query(
        `SELECT 
           COUNT(*) as total_orders,
           SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
           SUM(CASE WHEN status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) as pending_fulfillment,
           SUM(staff_commission) as total_commission
         FROM orders
         WHERE assigned_staff_id = ? AND DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [userId, period]
      );

      stats = {
        orders: orders[0]
      };

    } else if (userRole === 'affiliate') {
      // Affiliate sees their referred orders
      const [orders] = await pool.query(
        `SELECT 
           COUNT(*) as total_orders,
           SUM(total) as total_sales,
           SUM(affiliate_commission) as total_commission,
           SUM(CASE WHEN payment_status = 'paid' THEN affiliate_commission ELSE 0 END) as confirmed_commission
         FROM orders
         WHERE affiliate_id = ? AND DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [userId, period]
      );

      stats = {
        orders: orders[0]
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get sales chart data
router.get('/sales-chart', auth, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const [data] = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as orders,
         SUM(total) as revenue
       FROM orders
       WHERE DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [period]
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get sales chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get top products
router.get('/top-products', auth, authorize('admin'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [products] = await pool.query(
      `SELECT 
         p.id, p.name, p.sku, p.price,
         SUM(oi.quantity) as total_sold,
         SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled' AND DATE(o.created_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get recent activities
router.get('/activities', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        o.id, o.order_number, o.status, o.total, o.created_at,
        c.full_name as customer_name,
        sc.name as channel_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN sales_channels sc ON o.channel_id = sc.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'staff') {
      query += ' AND o.assigned_staff_id = ?';
      params.push(userId);
    } else if (userRole === 'affiliate') {
      query += ' AND o.affiliate_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [activities] = await pool.query(query, params);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

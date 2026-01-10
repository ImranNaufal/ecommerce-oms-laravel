const express = require('express');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get commission summary for current user (Admin sees ALL)
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Get total commissions by status (Admin sees ALL, others see own)
    const summaryQuery = isAdmin 
      ? `SELECT status, COUNT(*) as count, SUM(amount) as total_amount FROM commission_transactions GROUP BY status`
      : `SELECT status, COUNT(*) as count, SUM(amount) as total_amount FROM commission_transactions WHERE user_id = ? GROUP BY status`;
    
    const [summary] = await pool.query(summaryQuery, isAdmin ? [] : [userId]);

    // Get monthly earnings (Admin sees ALL)
    const monthlyQuery = isAdmin
      ? `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total_amount, COUNT(*) as count FROM commission_transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC`
      : `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total_amount, COUNT(*) as count FROM commission_transactions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC`;
    
    const [monthly] = await pool.query(monthlyQuery, isAdmin ? [] : [userId]);

    // Get commission config (Admin doesn't have config, return default)
    let config = null;
    if (!isAdmin) {
      const [configs] = await pool.query(
        `SELECT commission_type, commission_value, tier FROM commission_configs WHERE user_id = ? AND is_active = TRUE LIMIT 1`,
        [userId]
      );
      config = configs[0] || null;
    }

    res.json({
      success: true,
      data: {
        summary,
        monthly,
        config: configs[0] || null
      }
    });
  } catch (error) {
    console.error('Get commission summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get commission transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ct.*, o.order_number, o.status as order_status
      FROM commission_transactions ct
      LEFT JOIN orders o ON ct.order_id = o.id
      WHERE ct.user_id = ?
    `;
    const params = [req.user.id];

    // Admin can see all transactions
    if (req.user.role === 'admin') {
      query = `
        SELECT ct.*, o.order_number, o.status as order_status, u.full_name as user_name
        FROM commission_transactions ct
        LEFT JOIN orders o ON ct.order_id = o.id
        LEFT JOIN users u ON ct.user_id = u.id
        WHERE 1=1
      `;
      params.length = 0;
    }

    if (status) {
      query += ' AND ct.status = ?';
      params.push(status);
    }

    if (date_from) {
      query += ' AND DATE(ct.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(ct.created_at) <= ?';
      params.push(date_to);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get commission transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Approve commission (admin only)
router.patch('/:id/approve', [
  auth,
  authorize('admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE commission_transactions 
       SET status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [req.user.id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commission transaction not found or already processed'
      });
    }

    res.json({
      success: true,
      message: 'Commission approved successfully'
    });
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mark commission as paid (admin only)
router.patch('/:id/paid', [
  auth,
  authorize('admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE commission_transactions 
       SET status = 'paid', paid_at = NOW()
       WHERE id = ? AND status = 'approved'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commission transaction not found or not approved'
      });
    }

    res.json({
      success: true,
      message: 'Commission marked as paid successfully'
    });
  } catch (error) {
    console.error('Mark commission paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get commission leaderboard (for affiliates)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter = 'DATE_FORMAT(ct.created_at, "%Y-%m") = DATE_FORMAT(NOW(), "%Y-%m")';
    if (period === 'year') {
      dateFilter = 'YEAR(ct.created_at) = YEAR(NOW())';
    } else if (period === 'all') {
      dateFilter = '1=1';
    }

    const [leaderboard] = await pool.query(
      `SELECT 
         u.id, u.full_name, u.email,
         COUNT(ct.id) as total_orders,
         SUM(ct.amount) as total_commission,
         cc.tier
       FROM users u
       LEFT JOIN commission_transactions ct ON u.id = ct.user_id AND ${dateFilter}
       LEFT JOIN commission_configs cc ON u.id = cc.user_id AND cc.is_active = TRUE
       WHERE u.role IN ('staff', 'affiliate') AND u.status = 'active'
       GROUP BY u.id
       ORDER BY total_commission DESC
       LIMIT 20`,
      []
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

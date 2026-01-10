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
          title: `${lowStock[0].count} Produk Stok Rendah`,
          message: `Produk berikut perlu ditambah stok: ${lowStock[0].products}`,
          priority: 'medium',
          action_url: '/products',
          action_label: 'Lihat Produk'
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
          title: `${outStock[0].count} Produk Stok Habis`,
          message: 'Terdapat produk yang perlu diisi semula dengan segera',
          priority: 'high',
          action_url: '/products',
          action_label: 'Urus Stok'
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
        title: `${pendingOrders[0].count} Pesanan Menunggu`,
        message: 'Terdapat pesanan yang perlu diproses',
        priority: 'medium',
        action_url: '/orders?status=pending',
        action_label: 'Lihat Pesanan'
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
          title: `${pendingCommissions[0].count} Komisen Menunggu Kelulusan`,
          message: `Jumlah: RM ${parseFloat(pendingCommissions[0].total_amount).toFixed(2)}`,
          priority: 'medium',
          action_url: '/commissions',
          action_label: 'Semak Komisen'
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
        title: `${unpaidOrders[0].count} Pesanan Belum Bayar`,
        message: 'Pesanan lebih 24 jam tanpa pembayaran',
        priority: 'high',
        action_url: '/orders?payment_status=pending',
        action_label: 'Tindakan Diperlukan'
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

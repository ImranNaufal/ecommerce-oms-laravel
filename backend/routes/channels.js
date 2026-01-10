const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all sales channels
router.get('/', auth, async (req, res) => {
  try {
    const [channels] = await pool.query(
      `SELECT sc.*, 
              COUNT(o.id) as total_orders,
              SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as orders_last_30_days
       FROM sales_channels sc
       LEFT JOIN orders o ON sc.id = o.channel_id
       GROUP BY sc.id
       ORDER BY sc.name`
    );

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single channel with details
router.get('/:id', auth, async (req, res) => {
  try {
    const [channels] = await pool.query(
      `SELECT sc.*, 
              COUNT(o.id) as total_orders,
              SUM(o.total) as total_revenue
       FROM sales_channels sc
       LEFT JOIN orders o ON sc.id = o.channel_id
       WHERE sc.id = ?
       GROUP BY sc.id`,
      [req.params.id]
    );

    if (channels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channels[0]
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new channel (admin only)
router.post('/', [
  auth,
  authorize('admin'),
  body('name').trim().notEmpty().withMessage('Channel name is required'),
  body('type').isIn(['website', 'shopee', 'lazada', 'tiktok', 'facebook', 'whatsapp', 'other']).withMessage('Valid type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, type, api_endpoint, api_key, sync_frequency = 15 } = req.body;

    const [result] = await pool.query(
      `INSERT INTO sales_channels (name, type, api_endpoint, api_key, sync_frequency)
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, api_endpoint, api_key, sync_frequency]
    );

    res.status(201).json({
      success: true,
      message: 'Sales channel created successfully',
      channelId: result.insertId
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update channel
router.put('/:id', [
  auth,
  authorize('admin')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['name', 'api_endpoint', 'api_key', 'is_active', 'sync_frequency'];
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
    const [result] = await pool.query(
      `UPDATE sales_channels SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      message: 'Channel updated successfully'
    });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Sync channel (manually trigger sync)
router.post('/:id/sync', [
  auth,
  authorize('admin', 'staff')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Get channel details
    const [channels] = await pool.query(
      'SELECT * FROM sales_channels WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (channels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found or inactive'
      });
    }

    const channel = channels[0];

    // Here you would implement the actual sync logic
    // For demonstration, we'll just update the last_sync_at timestamp
    await pool.query(
      'UPDATE sales_channels SET last_sync_at = NOW() WHERE id = ?',
      [id]
    );

    // Log the sync attempt
    await pool.query(
      `INSERT INTO api_logs (channel_id, endpoint, method, success, created_at)
       VALUES (?, ?, 'GET', TRUE, NOW())`,
      [id, channel.api_endpoint || 'manual_sync']
    );

    res.json({
      success: true,
      message: 'Channel sync initiated successfully',
      note: 'In production, this would trigger actual API synchronization'
    });
  } catch (error) {
    console.error('Sync channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get API logs (for monitoring page)
router.get('/logs/all', [
  auth,
  authorize('admin')
], async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const [logs] = await pool.query(
      `SELECT 
         al.*,
         sc.name as channel_name
       FROM api_logs al
       LEFT JOIN sales_channels sc ON al.channel_id = sc.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

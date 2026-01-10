const express = require('express');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user notifications (unread count + recent)
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;

    // Get unread count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    // Get recent notifications
    const [notifications] = await pool.query(
      `SELECT n.*, 
              DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date
       FROM notifications n
       WHERE n.user_id = ? OR n.user_id IS NULL
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );

    res.json({
      success: true,
      data: {
        unread_count: countResult[0].unread_count,
        notifications
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to create notification (for internal use)
const createNotification = async (userId, title, message, type = 'info', relatedId = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message, type, 'order', relatedId]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = { router, createNotification };

const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * Calculate Commission for User
 * 
 * This function calculates commission based on user's config (percentage or fixed amount).
 * Commission is created with 'pending' status and will be approved when payment is confirmed.
 * 
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID (staff or affiliate)
 * @param {string} userType - 'staff' or 'affiliate'
 * @param {number} orderTotal - Total order amount
 * @returns {number} Commission amount
 */
const calculateCommission = async (orderId, userId, userType, orderTotal) => {
  try {
    // Get active commission config for user
    const [configs] = await pool.query(
      `SELECT commission_type, commission_value 
       FROM commission_configs 
       WHERE user_id = ? AND is_active = TRUE 
       AND effective_from <= CURDATE() 
       AND (effective_until IS NULL OR effective_until >= CURDATE())
       LIMIT 1`,
      [userId]
    );

    if (configs.length === 0) return 0;

    const config = configs[0];
    let commission = 0;

    if (config.commission_type === 'percentage') {
      commission = (orderTotal * config.commission_value) / 100;
    } else {
      commission = config.commission_value;
    }

    // Insert commission transaction
    await pool.query(
      `INSERT INTO commission_transactions 
       (user_id, order_id, commission_type, amount, percentage, order_total, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, orderId, userType, commission, config.commission_value, orderTotal]
    );

    return commission;
  } catch (error) {
    console.error('Calculate commission error:', error);
    return 0;
  }
};

// Get all orders (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, payment_status, channel, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, 
             c.full_name as customer_name, c.email as customer_email,
             sc.name as channel_name,
             u1.full_name as staff_name,
             u2.full_name as affiliate_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN sales_channels sc ON o.channel_id = sc.id
      LEFT JOIN users u1 ON o.assigned_staff_id = u1.id
      LEFT JOIN users u2 ON o.affiliate_id = u2.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (req.user.role === 'staff') {
      query += ' AND o.assigned_staff_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'affiliate') {
      query += ' AND o.affiliate_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (channel) {
      query += ' AND o.channel_id = ?';
      params.push(channel);
    }

    if (date_from) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await pool.query(query, params);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single order with items
router.get('/:id', auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, 
              c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone,
              sc.name as channel_name,
              u1.full_name as staff_name,
              u2.full_name as affiliate_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN sales_channels sc ON o.channel_id = sc.id
       LEFT JOIN users u1 ON o.assigned_staff_id = u1.id
       LEFT JOIN users u2 ON o.affiliate_id = u2.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Check permissions
    if (req.user.role === 'staff' && order.assigned_staff_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'affiliate' && order.affiliate_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get order items
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    order.items = items;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Create New Order (POST /api/orders)
 * 
 * This endpoint handles the complete order creation process:
 * 1. Validates product availability and stock
 * 2. Calculates totals (subtotal, tax, shipping)
 * 3. Creates order record
 * 4. Deducts inventory
 * 5. Calculates commissions (staff & affiliate)
 * 6. Updates customer statistics
 * 
 * Uses database transaction to ensure data integrity (ACID compliant).
 * If any step fails, entire operation is rolled back.
 */
router.post('/', [
  auth,
  body('customer_id').isInt().withMessage('Valid customer is required'),
  body('channel_id').isInt().withMessage('Valid channel is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('shipping_address').trim().notEmpty().withMessage('Shipping address is required'),
  body('payment_method').isIn(['cod', 'online_banking', 'credit_card', 'ewallet']).withMessage('Valid payment method is required')
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      customer_id, channel_id, items, affiliate_id,
      shipping_address, shipping_city, shipping_state, shipping_postal_code,
      payment_method, discount = 0, shipping_fee = 0, notes
    } = req.body;

    // Calculate subtotal and validate products
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.query(
        'SELECT id, name, sku, price, cost_price, stock_quantity FROM products WHERE id = ? AND status = "active"',
        [item.product_id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id} not found or inactive`
        });
      }

      const product = products[0];

      if (product.stock_quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: product.price,
        cost_price: product.cost_price
      });
    }

    const tax = subtotal * 0.06; // 6% tax (adjust as needed)
    const total = subtotal - discount + shipping_fee + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (order_number, customer_id, channel_id, assigned_staff_id, affiliate_id,
        subtotal, discount, shipping_fee, tax, total,
        status, payment_status, payment_method,
        shipping_address, shipping_city, shipping_state, shipping_postal_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?)`,
      [orderNumber, customer_id, channel_id, req.user.id, affiliate_id,
       subtotal, discount, shipping_fee, tax, total,
       payment_method, shipping_address, shipping_city, shipping_state, shipping_postal_code, notes]
    );

    const orderId = orderResult.insertId;

    // Insert order items and update inventory
    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items 
         (order_id, product_id, product_name, sku, quantity, price, cost_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.sku, item.quantity, item.price, item.cost_price]
      );

      // Update product stock
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );

      // Log inventory transaction
      await connection.query(
        `INSERT INTO inventory_transactions 
         (product_id, transaction_type, quantity, reference_type, reference_id, created_by)
         VALUES (?, 'sale', ?, 'order', ?, ?)`,
        [item.product_id, -item.quantity, orderId, req.user.id]
      );
    }

    // Update customer statistics (quick update)
    await connection.query(
      'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?',
      [total, customer_id]
    );

    // Calculate and create commission records
    let staffCommission = 0;
    let affiliateCommission = 0;

    if (req.user.role === 'staff') {
      staffCommission = await calculateCommission(orderId, req.user.id, 'staff', total);
    }

    if (affiliate_id) {
      affiliateCommission = await calculateCommission(orderId, affiliate_id, 'affiliate', total);
    }

    // Update order with commission amounts
    await connection.query(
      'UPDATE orders SET staff_commission = ?, affiliate_commission = ? WHERE id = ?',
      [staffCommission, affiliateCommission, orderId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId,
      orderNumber
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    connection.release();
  }
});

// Update order status
router.patch('/:id/status', [
  auth,
  authorize('admin', 'staff'),
  body('status').isIn(['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'])
], async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Check if order exists
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status with timestamp
    const timestampField = {
      'confirmed': 'confirmed_at',
      'packed': 'packed_at',
      'shipped': 'shipped_at',
      'delivered': 'delivered_at'
    };

    let query = 'UPDATE orders SET status = ?';
    const params = [status];

    if (timestampField[status]) {
      query += `, ${timestampField[status]} = NOW()`;
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update payment status
router.patch('/:id/payment', [
  auth,
  authorize('admin', 'staff'),
  body('payment_status').isIn(['pending', 'paid', 'failed', 'refunded'])
], async (req, res) => {
  try {
    const { payment_status } = req.body;
    const { id } = req.params;

    await pool.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [payment_status, id]
    );

    // If payment is confirmed, approve commission
    if (payment_status === 'paid') {
      await pool.query(
        `UPDATE commission_transactions 
         SET status = 'approved', approved_by = ?, approved_at = NOW()
         WHERE order_id = ? AND status = 'pending'`,
        [req.user.id, id]
      );
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

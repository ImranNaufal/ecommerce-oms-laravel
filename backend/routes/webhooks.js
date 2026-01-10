const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');

const router = express.Router();

// Verify webhook signature (example for security)
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return next(); // Skip verification in development
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature'
    });
  }

  next();
};

// Webhook endpoint for external marketplace orders (Shopee, Lazada, etc.)
router.post('/order/external', verifyWebhookSignature, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      marketplace,
      external_order_id,
      customer,
      items,
      totals,
      shipping,
      payment_method
    } = req.body;

    // Log webhook receipt
    await connection.query(
      `INSERT INTO api_logs (endpoint, method, request_payload, success)
       VALUES (?, 'POST', ?, TRUE)`,
      ['/webhook/order/external', JSON.stringify(req.body)]
    );

    // Find or create customer
    let customerId;
    const [existingCustomer] = await connection.query(
      'SELECT id FROM customers WHERE email = ?',
      [customer.email]
    );

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
    } else {
      const [newCustomer] = await connection.query(
        `INSERT INTO customers (email, full_name, phone, address, city, state, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customer.email, customer.name, customer.phone, shipping.address, 
         shipping.city, shipping.state, shipping.postal_code]
      );
      customerId = newCustomer.insertId;
    }

    // Find channel by marketplace type
    const [channels] = await connection.query(
      'SELECT id FROM sales_channels WHERE type = ? AND is_active = TRUE LIMIT 1',
      [marketplace]
    );

    if (channels.length === 0) {
      throw new Error(`Sales channel for ${marketplace} not found`);
    }

    const channelId = channels[0].id;

    // Generate order number
    const orderNumber = `${marketplace.toUpperCase()}-${external_order_id}`;

    // Create order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (order_number, customer_id, channel_id, subtotal, discount, shipping_fee, tax, total,
        status, payment_status, payment_method, shipping_address, shipping_city, shipping_state, shipping_postal_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', ?, ?, ?, ?, ?, ?)`,
      [orderNumber, customerId, channelId, totals.subtotal, totals.discount || 0, 
       totals.shipping_fee || 0, totals.tax || 0, totals.total,
       payment_method, shipping.address, shipping.city, shipping.state, 
       shipping.postal_code, `External order from ${marketplace}`]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      // Try to find product by SKU
      const [products] = await connection.query(
        'SELECT id, price, cost_price FROM products WHERE sku = ?',
        [item.sku]
      );

      let productId = null;
      let price = item.price;
      let costPrice = 0;

      if (products.length > 0) {
        productId = products[0].id;
        costPrice = products[0].cost_price;

        // Update inventory
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, productId]
        );
      }

      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, price, cost_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, productId, item.name, item.sku, item.quantity, price, costPrice]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Order injected successfully',
      orderId,
      orderNumber
    });

  } catch (error) {
    await connection.rollback();
    console.error('Webhook order error:', error);

    // Log error
    await pool.query(
      `INSERT INTO api_logs (endpoint, method, request_payload, success, error_message)
       VALUES (?, 'POST', ?, FALSE, ?)`,
      ['/webhook/order/external', JSON.stringify(req.body), error.message]
    );

    res.status(500).json({
      success: false,
      message: 'Failed to process order',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Webhook endpoint for payment confirmation
router.post('/payment/confirmation', verifyWebhookSignature, async (req, res) => {
  try {
    const { order_number, status, transaction_id, payment_method } = req.body;

    // Find order
    const [orders] = await pool.query(
      'SELECT id FROM orders WHERE order_number = ?',
      [order_number]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderId = orders[0].id;

    // Update payment status
    const paymentStatus = status === 'success' ? 'paid' : 'failed';
    await pool.query(
      `UPDATE orders 
       SET payment_status = ?, notes = CONCAT(COALESCE(notes, ''), '\nPayment transaction ID: ', ?)
       WHERE id = ?`,
      [paymentStatus, transaction_id, orderId]
    );

    // If payment confirmed, approve commissions
    if (paymentStatus === 'paid') {
      await pool.query(
        `UPDATE commission_transactions 
         SET status = 'approved', approved_at = NOW()
         WHERE order_id = ? AND status = 'pending'`,
        [orderId]
      );
    }

    // Log webhook
    await pool.query(
      `INSERT INTO api_logs (endpoint, method, request_payload, success)
       VALUES (?, 'POST', ?, TRUE)`,
      ['/webhook/payment/confirmation', JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Test webhook endpoint (for development)
router.post('/test', async (req, res) => {
  try {
    console.log('Test webhook received:', req.body);

    await pool.query(
      `INSERT INTO api_logs (endpoint, method, request_payload, success)
       VALUES (?, 'POST', ?, TRUE)`,
      ['/webhook/test', JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedData: req.body
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

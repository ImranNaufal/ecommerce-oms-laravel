const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper: Generate next SKU for category
const generateNextSKU = async (categoryId) => {
  try {
    // Get category prefix
    const [categories] = await pool.query('SELECT slug FROM categories WHERE id = ?', [categoryId]);
    if (categories.length === 0) return null;
    
    const prefix = categories[0].slug.toUpperCase().substring(0, 4); // First 4 chars
    
    // Get highest number for this prefix
    const [existing] = await pool.query(
      `SELECT sku FROM products WHERE sku LIKE ? ORDER BY sku DESC LIMIT 1`,
      [`${prefix}-%`]
    );
    
    let nextNumber = 1;
    if (existing.length > 0) {
      const lastSKU = existing[0].sku;
      const lastNumber = parseInt(lastSKU.split('-')[1] || '0');
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Generate SKU error:', error);
    return null;
  }
};

// Get all products (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [products] = await pool.query(query, params);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: products[0]
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get next available SKU for category (NEW ENDPOINT)
router.get('/sku/next/:categoryId', [auth], async (req, res) => {
  try {
    const sku = await generateNextSKU(req.params.categoryId);
    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
    
    res.json({
      success: true,
      sku
    });
  } catch (error) {
    console.error('Get next SKU error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create product - AUTO-GENERATE SKU
router.post('/', [
  auth,
  authorize('admin', 'staff'),
  body('category_id').isInt().withMessage('Valid category is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Valid stock quantity is required')
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
      category_id, name, description, price,
      cost_price = 0, stock_quantity, low_stock_threshold = 10,
      image_url, weight = 0
    } = req.body;

    // AUTO-GENERATE SKU
    const sku = await generateNextSKU(category_id);
    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate SKU'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO products 
       (category_id, sku, name, description, price, cost_price, stock_quantity, low_stock_threshold, image_url, weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, sku, name, description, price, cost_price, stock_quantity, low_stock_threshold, image_url, weight]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      productId: result.insertId,
      sku: sku
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update product
router.put('/:id', [
  auth,
  authorize('admin', 'staff')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if product exists
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build dynamic update query (SKU cannot be changed!)
    const allowedFields = ['category_id', 'name', 'description', 'price', 'cost_price', 
                           'stock_quantity', 'low_stock_threshold', 'image_url', 'status', 'weight'];
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
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete product
router.delete('/:id', [
  auth,
  authorize('admin')
], async (req, res) => {
  try {
    // Check if product has orders (prevent delete jika ada history)
    const [orderItems] = await pool.query(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
      [req.params.id]
    );

    if (orderItems[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product with existing orders. Set status to 'inactive' instead.`
      });
    }

    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

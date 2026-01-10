/**
 * Database Configuration
 * 
 * Uses connection pooling for optimal performance.
 * Pool size: 10 concurrent connections
 * 
 * Environment variables required:
 * - DB_HOST: MySQL server hostname
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_NAME: Database name (ecommerce_oms)
 * - DB_PORT: MySQL port (default: 3306)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_oms',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : null
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✓ MySQL Database Connected Successfully');
    connection.release();
  } catch (error) {
    console.error('✗ Database Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };

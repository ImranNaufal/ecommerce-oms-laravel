/**
 * @fileoverview Database Configuration
 * 
 * This file sets up and exports a connection pool for the MySQL database.
 * Using a connection pool is more efficient than creating a new connection for every query,
 * as it reuses existing connections.
 * 
 * Environment variables are used to configure the connection, requiring:
 * - DB_HOST: MySQL server hostname
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_NAME: Database name (e.g., ecommerce_oms)
 * - DB_PORT: MySQL port (default: 3306)
 */

const mysql = require('mysql2/promise'); // Using the promise-based version of mysql2
require('dotenv').config(); // Load environment variables from .env file

// Create a connection pool to the MySQL database.
// This is the central point for all database interactions.
const pool = mysql.createPool({
  // Connection details are sourced from environment variables with sensible defaults.
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_oms',
  port: process.env.DB_PORT || 3306,

  // Pool configuration for managing connections.
  waitForConnections: true, // Determines the pool's behavior when no connections are available. If true, it will queue the request.
  connectionLimit: 10,      // The maximum number of connections to create at once.
  queueLimit: 0,            // The maximum number of connection requests the pool will queue before returning an error. 0 means no limit.
  
  // Keep-alive settings to prevent connection timeouts from firewalls or the database itself.
  enableKeepAlive: true,        // Send periodic "keep-alive" pings on idle connections.
  keepAliveInitialDelay: 0      // The initial delay (in milliseconds) before the first keep-alive packet is sent. 0 means start immediately.
});

/**
 * Tests the database connection on server startup.
 * If the connection fails, it logs a detailed error and gracefully exits the application process.
 * This prevents the server from running with a faulty database configuration.
 */
const testConnection = async () => {
  let connection;
  try {
    // Attempt to get a connection from the pool.
    connection = await pool.getConnection();
    console.log('✓ MySQL Database Connected Successfully');
  } catch (error) {
    // If connection fails, log the error and terminate the process.
    console.error('✗ Database Connection Error:', error.message);
    // Exit with a non-zero code to indicate failure.
    process.exit(1); 
  } finally {
    // Always release the connection back to the pool, whether the test was successful or not.
    if (connection) {
      connection.release();
    }
  }
};

// Export the connection pool and the connection test function for use in other parts of the application.
module.exports = { pool, testConnection };

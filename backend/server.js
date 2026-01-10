// =====================================================
// IMPORTS
// =====================================================
// Third-party libraries for server functionality, security, and logging.
const express = require('express'); // Core framework for building the server.
const cors = require('cors'); // Middleware to enable Cross-Origin Resource Sharing.
const helmet = require('helmet'); // Middleware for setting various HTTP security headers.
const morgan = require('morgan'); // Middleware for logging HTTP requests.
require('dotenv').config(); // Loads environment variables from a .env file into process.env.

// =====================================================
// INTERNAL MODULES & MIDDLEWARE
// =====================================================
// Custom modules for database connection and security middleware.
const { testConnection } = require('./config/database'); // Function to test the database connection.
const { 
  loginLimiter,      // Rate limiter for login attempts to prevent brute-force attacks.
  apiLimiter,        // General rate limiter for most API endpoints.
  webhookLimiter,    // Specific rate limiter for incoming webhooks.
  sanitizeInput,     // Middleware to sanitize user input against XSS attacks.
  validateEnv,       // Function to validate required environment variables on startup.
  errorSanitizer     // Middleware to handle and sanitize error messages before sending to client.
} = require('./middleware/security');

// Initial security check: Validate environment variables before the server starts.
// This ensures the application has its necessary configuration.
validateEnv();

// =====================================================
// ROUTE IMPORTS
// =====================================================
// Importing all the route handlers for different API resources.
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const commissionRoutes = require('./routes/commissions');
const dashboardRoutes = require('./routes/dashboard');
const channelRoutes = require('./routes/channels');
const webhookRoutes = require('./routes/webhooks');
const { router: notificationRoutes } = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const alertRoutes = require('./routes/alerts');

// =====================================================
// INITIALIZE EXPRESS APP
// =====================================================
const app = express();

// Enable 'trust proxy' to ensure express-rate-limit works correctly when deployed
// behind a reverse proxy (e.g., on services like Heroku, Render, or with Nginx).
app.set('trust proxy', 1);

// =====================================================
// CORE MIDDLEWARE SETUP
// =====================================================
// The order of middleware is crucial for correct request processing.

// 1. Helmet: Secure the app by setting various HTTP headers.
// The Content Security Policy (CSP) is configured to only allow resources from the same origin ('self'),
// with specific exceptions for styles and images.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allows inline styles.
      scriptSrc: ["'self'"],                   // Only allows scripts from the same origin.
      imgSrc: ["'self'", "data:", "https:"],   // Allows images from same origin, data URIs, and HTTPS sources.
    }
  }
}));

// 2. CORS: Configure Cross-Origin Resource Sharing.
// This is a strict configuration that only allows requests from the specified client URL,
// ensuring that only the frontend application can communicate with the API.
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // Frontend URL
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed request headers
}));

// 3. Body Parsers: Parse incoming request bodies.
// Includes a size limit to prevent attacks with excessively large payloads.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Input Sanitization: Middleware to clean all incoming request data (body, query, params).
// This helps prevent Cross-Site Scripting (XSS) by removing malicious scripts.
app.use(sanitizeInput);

// 5. Morgan: HTTP request logger.
// Only used in 'development' mode to keep production logs clean.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 6. General API Rate Limiting: Apply the general rate limiter to all routes starting with /api.
// This provides a baseline of protection against spam and denial-of-service attacks.
app.use('/api', apiLimiter);

// =====================================================
// API ROUTES REGISTRATION
// =====================================================

// Health Check Endpoint: A simple route to verify that the API is running.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce OMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Registering all the application routes with their specific paths.
// Specific rate limiters are applied to sensitive endpoints.
app.use('/api/auth/login', loginLimiter); // Stricter rate limit for login to prevent brute-force.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes); // Special rate limit for high-traffic webhooks.
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/alerts', alertRoutes);

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

// 404 Handler: This middleware is triggered if no other route matches the request.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found. The requested URL does not exist on this server.'
  });
});

// Global Error Handler: Catches all errors that occur in the route handlers.
// It uses the `errorSanitizer` to ensure that sensitive error details are not leaked in production.
app.use(errorSanitizer);

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 5000;

// The main function to start the server.
const startServer = async () => {
  try {
    // 1. Test the database connection to ensure the database is reachable.
    await testConnection();
    
    // 2. Start the Express server and listen for incoming requests on the configured port.
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log('========================================');
    });
  } catch (error) {
    // If the database connection or server start fails, log the error and exit the process.
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Execute the server startup function.
startServer();

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
// Handles the SIGTERM signal (commonly used by process managers like PM2 or container orchestrators)
// to shut down the server gracefully.
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  // Perform any cleanup here (e.g., close database connections) if necessary.
  process.exit(0);
});

// Export the app module for testing purposes.
module.exports = app;

# 🛒 Full Stack E-commerce Order Management System (OMS)

![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen)
![Express.js](https://img.shields.io/badge/Express.js-4.x-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)
![Playwright](https://img.shields.io/badge/Testing-Playwright-violet)
![Tailwind CSS](https://img.shields.io/badge/CSS-Tailwind-cyan)
![License](https://img.shields.io/badge/License-MIT-blue)

A comprehensive, production-ready e-commerce platform featuring an advanced Order Management System (OMS), automated commission tracking for affiliates, multi-channel marketplace integration, and real-time analytics dashboards.

## ✨ Core Features

### 🎯 Key Functionality
- **Order Management System (OMS):** Manage the complete order lifecycle from 'Pending' to 'Delivered'.
- **Automated Commission Engine:** Sophisticated, multi-tier commission calculation with a built-in approval workflow.
- **Multi-Channel Integration:** Ingest orders from Shopee, Lazada, TikTok, and other marketplaces via webhooks.
- **Real-time Notifications:** Database-triggered alerts for critical events like low stock or new external orders.
- **Inventory Management:** Automatic stock deduction upon order creation with low-stock alerts.
- **Customer Database:** Maintain a comprehensive history of customer orders and statistics.
- **Sales Analytics:** Interactive charts with zoom/pan capabilities to analyze sales trends.
- **Financial Reporting:** In-depth profit analysis and CSV export capabilities for accounting.

### 💼 Business & Operational Features
- **Role-Based Access Control (RBAC):** Pre-defined roles for 'Admin', 'Staff', and 'Affiliate' users.
- **Automated Commission Calculation:** Supports both percentage-based and fixed-value commissions.
- **Multi-Tier Rewards System:** Tiers like 'Bronze', 'Silver', 'Gold', and 'Platinum' can be configured for affiliates.
- **Order Audit Trail:** Tracks all changes to an order for compliance and accountability.
- **API Activity Logging:** Monitors all incoming webhook requests for easy troubleshooting.
- **Report Export:** Generate and export key financial reports for the finance department.

### 🔧 Technical & Developer Features
- **Comprehensive RESTful API:** A well-structured API with 37 distinct endpoints.
- **Secure Authentication:** JWT-based authentication and granular, role-based authorization.
- **Database Integrity:** ACID-compliant transactions for critical operations like order creation.
- **Automated SKU System:** Automatically generate unique Stock Keeping Units (SKUs) for new products.
- **Real-time Search:** Performant, full-text search across products, orders, and customers.
- **Responsive Design:** A mobile-first UI that works seamlessly across all device sizes.
- **Interactive Data Visualization:** Dynamic, client-side charts powered by Recharts.

## 📸 Screenshots

### Dashboard
Interactive sales analytics with real-time statistics and zoom-enabled charts for deep-diving into data.

### Product Management
A modern grid layout for products, featuring auto-SKU generation, profit margin badges, and full CRUD operations.

### Commission Tracking
Automated commission calculation engine with a managerial approval workflow and affiliate leaderboards.

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- A Git client

### Installation Steps

```bash
# 1. Clone the repository to your local machine
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Set up the database schema
# Make sure your MySQL server is running.
# This command will execute the schema.sql file to create all necessary tables.
mysql -u your_mysql_user -p < backend/config/schema.sql

# 5. Configure environment variables
# Create a .env file from the template.
cp ENV_TEMPLATE.md .env

# Now, open the .env file and add your database credentials and a strong JWT_SECRET.
# Example:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=ecommerce_oms
# JWT_SECRET=your_super_secret_string_of_at_least_32_characters
# CLIENT_URL=http://localhost:3000

# 6. Start the application (backend and frontend concurrently)
npm run dev
```

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@ecommerce.com` | `admin123` |
| Staff | `staff1@ecommerce.com` | `admin123` |
| Affiliate | `affiliate1@ecommerce.com` | `admin123` |

### Local Access Points
- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API Base URL:** `http://localhost:5000/api`
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

## 📚 Project Documentation

| Document | Description |
|---|---|
| [API Documentation](API_DOCUMENTATION.md) | A complete reference for all 37 API endpoints, including request/response examples. |
| [Setup Guide](SETUP_GUIDE.md) | Detailed, step-by-step installation and configuration instructions. |
| [Testing Guide](TESTING_GUIDE.md) | Instructions for running both manual and automated (Playwright) tests. |
| [Backend Guide](backend/README_BACKEND.md) | An in-depth look at the backend architecture, database design, and code structure. |
| [Frontend Guide](frontend/README_FRONTEND.md) | A guide to the frontend architecture, including state management and component patterns. |
| [Contributing Guide](CONTRIBUTING.md) | Guidelines for developers who wish to contribute to the project. |

## 🏛️ Architecture Overview

### Technology Stack
- **Backend:** Node.js, Express.js, MySQL, JSON Web Token (JWT)
- **Frontend:** React 18, Tailwind CSS, React Query, Recharts
- **Testing:** Playwright for end-to-end automated testing
- **Development Tools:** Nodemon, Concurrently, ESLint

### Database Design
- **13 Tables** designed with proper normalization to reduce data redundancy.
- **25+ Indexes** strategically placed for high-performance query execution.
- **2 Database Triggers** to automate tasks like updating timestamps and calculating commissions.
- **Generated Columns** for automatically computed values (e.g., profit margins).
- **Foreign Key Constraints** to ensure referential integrity across the database.

### API Design
- Follows standard RESTful conventions for predictable resource URLs.
- Secured with JWT-based authentication for stateless sessions.
- Granular, role-based authorization protects sensitive endpoints.
- A standardized JSON response format is used for all API calls.
- Comprehensive error handling with meaningful status codes and messages.

## 🔐 Security Features

- ✅ **JWT Authentication:** Secure, stateless authentication with a configurable 7-day token expiry.
- ✅ **Password Hashing:** Uses `bcrypt` with a salt factor of 10 to securely store user passwords.
- ✅ **SQL Injection Prevention:** All database queries are parameterized to prevent SQL injection attacks.
- ✅ **Input Validation:** Server-side validation using `express-validator` on all incoming data.
- ✅ **Role-Based Authorization:** Middleware ensures users can only access resources permitted by their role.
- ✅ **XSS Protection:** React's auto-escaping of JSX combined with Helmet.js `Content-Security-Policy` headers.
- ✅ **CORS Configuration:** A strict CORS policy is enforced to prevent unauthorized cross-origin requests.
- ✅ **Secure HTTP Headers:** `Helmet.js` is used to set various security-related HTTP headers.

## 🧪 Testing Strategy

### Manual Test Scenarios
- Over 34 documented manual test cases cover all core user flows.
- Each test includes step-by-step instructions and expected outcomes.

### Automated End-to-End Tests (Playwright)
The project includes a suite of 26 automated tests that run in a headless browser to simulate real user interactions.

```bash
# Run all tests in headless mode
npx playwright test

# Run tests in UI mode for interactive debugging
npx playwright test --ui

# Run tests in a headed browser to watch the execution
npx playwright test --headed
```

**Current Test Coverage:**
- **Authentication:** 4 tests (Login, Logout, Role Access)
- **Products & Cart:** 6 tests (CRUD, Add to Cart)
- **Orders:** 5 tests (Order Creation, Status Updates)
- **Commissions:** 6 tests (Calculation, Approval)
- **Integration:** 5 tests (Webhook Injection)

## 🚀 Deployment Checklist

This checklist provides guidance for deploying the application to a production environment.

- **[ ] Secure `JWT_SECRET`:** Change the `JWT_SECRET` in your `.env` file to a long, secure, and randomly generated string.
- **[ ] Update Database Credentials:** Configure the production database host, user, password, and name.
- **[ ] Set `NODE_ENV`:** Ensure the `NODE_ENV` environment variable is set to `production` to enable performance and security optimizations.
- **[ ] Enable HTTPS:** Configure an SSL certificate (e.g., using Let's Encrypt) to serve all traffic over HTTPS.
- **[ ] Configure Production CORS:** Update the `CLIENT_URL` in your `.env` file to match your production frontend domain.
- **[ ] Set Up Database Backups:** Implement a regular backup schedule for your production database.
- **[ ] Review Rate Limiting:** Adjust the rate-limiting settings in `backend/middleware/security.js` to suit production traffic levels.
- **[ ] Configure CDN for Static Assets:** Use a Content Delivery Network (CDN) like AWS CloudFront or Cloudflare to serve frontend static assets for better performance.
- **[ ] Set Up Process Manager:** Use a process manager like PM2 or Nodemon in production mode to keep the Node.js server running.
- **[ ] Enable Webhook Signature Verification:** (Recommended) Implement signature verification for incoming webhooks to ensure they originate from a trusted source.

### Recommended Production Stack:
- **Backend:** Node.js application hosted on a VPS (e.g., DigitalOcean, AWS EC2) or a PaaS (e.g., Heroku, Render).
- **Database:** A managed MySQL database service (e.g., AWS RDS, DigitalOcean Managed Databases).
- **Frontend:** A static hosting provider optimized for React (e.g., Vercel, Netlify) or served via AWS S3 and CloudFront.

## 🤝 How to Contribute

Contributions, issues, and feature requests are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**⭐ If you find this project useful, please consider giving it a star!**

# Laravel Backend - E-commerce OMS

This is the primary backend for the E-commerce Order Management System (OMS), built with Laravel 11. It provides a robust API for order management, commission tracking, and multi-channel integration.

## 🎯 Features

- **Order Management:** Create, track, and process orders across multiple sales channels.
- **Commission System:** Automated multi-tier commission calculations for Staff and Affiliates.
- **Inventory Control:** Automatic stock deduction and low-stock notification triggers.
- **Marketplace Webhooks:** Integrated endpoints for injecting orders from external platforms (Shopee, Lazada, etc.).
- **Real-time Analytics:** Dashboard APIs for sales reporting and performance tracking.
- **API Logging:** Comprehensive logging of all incoming and outgoing API requests for troubleshooting.

## 🏗️ Architecture

- **Eloquent ORM:** Clean and expressive database interactions.
- **JWT Authentication:** Secure stateless authentication using `tymon/jwt-auth`.
- **RBAC (Role-Based Access Control):** Granular permissions for Admin, Staff, and Affiliates.
- **Atomic Transactions:** Ensures data integrity during complex order and commission processing.
- **Generated Columns:** Utilizes MySQL generated columns for optimized financial calculations.

## 📦 Installation & Setup

### Prerequisites
- PHP >= 8.2
- Composer
- MySQL >= 8.0

### Steps
1. **Install Dependencies:**
   ```bash
   composer install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Update DB_DATABASE, DB_USERNAME, DB_PASSWORD in .env
   ```

3. **Initialize Application:**
   ```bash
   php artisan key:generate
   php artisan migrate --seed
   php artisan jwt:secret
   ```

4. **Start Server:**
   ```bash
   php artisan serve --port=8000
   ```

## 📁 Key Directories

- `app/Http/Controllers`: Business logic and API endpoints.
- `app/Http/Middleware`: Authentication, Role validation, and CORS.
- `app/Models`: Database structure and relationships.
- `database/migrations`: Version-controlled schema definitions.
- `routes/api.php`: API route declarations.
- `tests/Manual`: Utility scripts for manual testing and maintenance.

## 🔐 Security
- Parameterized queries to prevent SQL Injection.
- JWT tokens with configurable TTL.
- Role-based middleware to protect sensitive administrative endpoints.
- Secure password hashing using Bcrypt.
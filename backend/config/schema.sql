 -- E-commerce OMS Database Schema
-- Optimized for commission calculations, order processing, and sales reporting

-- Drop existing database and create fresh
DROP DATABASE IF EXISTS ecommerce_oms;
CREATE DATABASE ecommerce_oms;
USE ecommerce_oms;

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Users table (Staff, Admins, Affiliates)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'staff', 'affiliate') NOT NULL DEFAULT 'staff',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_status (role, status),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commission configuration for different user roles
CREATE TABLE commission_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    commission_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    commission_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
    min_order_value DECIMAL(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CUSTOMER MANAGEMENT
-- =====================================================

CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'Malaysia',
    customer_type ENUM('retail', 'wholesale', 'vip') DEFAULT 'retail',
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_customer_type (customer_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PRODUCT CATALOG
-- =====================================================

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    image_url VARCHAR(255),
    status ENUM('active', 'inactive', 'out_of_stock') DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    weight DECIMAL(8, 2) DEFAULT 0.00 COMMENT 'in kg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_sku (sku),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ORDER MANAGEMENT SYSTEM (OMS)
-- =====================================================

-- Sales channels (marketplace integration)
CREATE TABLE sales_channels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('website', 'shopee', 'lazada', 'tiktok', 'facebook', 'whatsapp', 'other') NOT NULL,
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    sync_frequency INT DEFAULT 15 COMMENT 'minutes',
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main orders table (optimized for fulfillment and reporting)
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    channel_id INT NOT NULL,
    assigned_staff_id INT DEFAULT NULL COMMENT 'Staff handling fulfillment',
    affiliate_id INT DEFAULT NULL COMMENT 'Affiliate who referred',
    
    -- Order totals
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    shipping_fee DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Commission tracking (denormalized for performance)
    staff_commission DECIMAL(10, 2) DEFAULT 0.00,
    affiliate_commission DECIMAL(10, 2) DEFAULT 0.00,
    total_commission DECIMAL(10, 2) GENERATED ALWAYS AS (staff_commission + affiliate_commission) STORED,
    
    -- Order status workflow
    status ENUM('pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cod', 'online_banking', 'credit_card', 'ewallet') DEFAULT 'cod',
    
    -- Shipping information
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(50),
    shipping_state VARCHAR(50),
    shipping_postal_code VARCHAR(10),
    tracking_number VARCHAR(100),
    
    -- Timestamps for workflow tracking
    confirmed_at TIMESTAMP NULL,
    packed_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (channel_id) REFERENCES sales_channels(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (affiliate_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance optimization
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_staff (assigned_staff_id),
    INDEX idx_affiliate (affiliate_id),
    INDEX idx_channel (channel_id),
    INDEX idx_created_date (created_at),
    INDEX idx_fulfillment (status, assigned_staff_id) COMMENT 'For fulfillment team queries',
    INDEX idx_commission_report (affiliate_id, status, created_at) COMMENT 'For commission reports'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items (line items)
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
    profit DECIMAL(10, 2) GENERATED ALWAYS AS ((price - cost_price) * quantity) STORED,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- COMMISSION TRACKING & PAYOUTS
-- =====================================================

CREATE TABLE commission_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    commission_type ENUM('staff', 'affiliate') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    order_total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
    approved_by INT DEFAULT NULL,
    approved_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_order (order_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INVENTORY MANAGEMENT
-- =====================================================

CREATE TABLE inventory_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    transaction_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('order', 'manual', 'supplier') NOT NULL,
    reference_id INT DEFAULT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_product (product_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- WEBHOOK & API INTEGRATION LOG
-- =====================================================

CREATE TABLE api_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    channel_id INT DEFAULT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
    request_payload TEXT,
    response_payload TEXT,
    status_code INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time INT COMMENT 'milliseconds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES sales_channels(id) ON DELETE SET NULL,
    INDEX idx_channel (channel_id),
    INDEX idx_success (success),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AUTOMATION WORKFLOWS
-- =====================================================

CREATE TABLE automation_workflows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    trigger_type ENUM('order_created', 'payment_received', 'order_shipped', 'low_stock', 'scheduled') NOT NULL,
    action_type ENUM('send_email', 'update_inventory', 'create_commission', 'sync_to_channel', 'webhook') NOT NULL,
    config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trigger (trigger_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SAMPLE DATA FOR DEMONSTRATION
-- =====================================================

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password, full_name, role) VALUES
('admin', 'admin@ecommerce.com', '$2a$10$XZPqGnN7hC1rqN3/dDKQqeKQRYYR5LvF3Nn5xkXKZQ8sDVJgKZGp2', 'Admin User', 'admin'),
('staff1', 'staff1@ecommerce.com', '$2a$10$XZPqGnN7hC1rqN3/dDKQqeKQRYYR5LvF3Nn5xkXKZQ8sDVJgKZGp2', 'John Staff', 'staff'),
('affiliate1', 'affiliate1@ecommerce.com', '$2a$10$XZPqGnN7hC1rqN3/dDKQqeKQRYYR5LvF3Nn5xkXKZQ8sDVJgKZGp2', 'Sarah Affiliate', 'affiliate');

-- Insert commission configs
INSERT INTO commission_configs (user_id, commission_type, commission_value, tier, effective_from) VALUES
(2, 'percentage', 5.00, 'silver', '2026-01-01'),
(3, 'percentage', 10.00, 'gold', '2026-01-01');

-- Insert sales channels
INSERT INTO sales_channels (name, type, is_active) VALUES
('Main Website', 'website', TRUE),
('Shopee Malaysia', 'shopee', TRUE),
('Lazada Malaysia', 'lazada', TRUE),
('TikTok Shop', 'tiktok', TRUE),
('Facebook Shop', 'facebook', TRUE);

-- Insert categories
INSERT INTO categories (name, slug, description) VALUES
('Electronics', 'electronics', 'Electronic devices and gadgets'),
('Fashion', 'fashion', 'Clothing and accessories'),
('Home & Living', 'home-living', 'Home decor and furniture'),
('Beauty', 'beauty', 'Beauty and personal care products');

-- Insert sample products
INSERT INTO products (category_id, sku, name, description, price, cost_price, stock_quantity) VALUES
(1, 'ELEC-001', 'Wireless Bluetooth Headphones', 'High-quality wireless headphones with noise cancellation', 299.00, 150.00, 50),
(1, 'ELEC-002', 'Smart Watch Series 5', 'Latest smartwatch with health tracking', 899.00, 500.00, 30),
(2, 'FASH-001', 'Premium Cotton T-Shirt', 'Comfortable cotton t-shirt in multiple colors', 49.90, 20.00, 100),
(2, 'FASH-002', 'Denim Jeans', 'Classic blue denim jeans', 129.90, 60.00, 75),
(3, 'HOME-001', 'Ceramic Coffee Mug Set', 'Set of 4 elegant ceramic mugs', 79.90, 30.00, 60),
(4, 'BEAU-001', 'Organic Face Moisturizer', 'Natural ingredients face moisturizer', 159.00, 70.00, 40);

-- Insert sample customer
INSERT INTO customers (email, full_name, phone, address, city, state, postal_code) VALUES
('customer1@email.com', 'Ahmad Hassan', '0123456789', '123 Jalan Bukit Bintang', 'Kuala Lumpur', 'Wilayah Persekutuan', '50200');

-- Insert automation workflow example
INSERT INTO automation_workflows (name, trigger_type, action_type, config) VALUES
('Auto-calculate commission on order completion', 'payment_received', 'create_commission', '{"auto_approve": false, "min_order_value": 100}'),
('Low stock alert', 'low_stock', 'send_email', '{"recipients": ["admin@ecommerce.com"], "threshold": 10}');

COMMIT;

-- Display success message
SELECT 'Database schema created successfully!' AS message;

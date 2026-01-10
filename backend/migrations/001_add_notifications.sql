-- Migration: Add Notifications System
-- Date: 2026-01-09
-- Description: Creates notifications table for system alerts and user notifications

USE ecommerce_oms;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL COMMENT 'NULL means broadcast to all',
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
    related_type ENUM('order', 'product', 'commission', 'system') DEFAULT 'system',
    related_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created (created_at),
    INDEX idx_related (related_type, related_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample notifications for demo
INSERT INTO notifications (user_id, title, message, type, related_type) VALUES
(1, 'Selamat Datang ke OMS', 'Sistem Order Management anda sudah bersedia!', 'success', 'system'),
(NULL, 'Update Sistem', 'Versi baru dengan dashboard yang dipertingkatkan telah dilaksanakan', 'info', 'system');

-- Create trigger untuk auto-notify low stock
DELIMITER //

CREATE TRIGGER notify_low_stock
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity <= NEW.low_stock_threshold 
       AND NEW.stock_quantity > 0 
       AND OLD.stock_quantity > NEW.low_stock_threshold THEN
        
        INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
        SELECT 
            id,
            'Stok Rendah',
            CONCAT('Produk "', NEW.name, '" (SKU: ', NEW.sku, ') stok tinggal ', NEW.stock_quantity, ' unit'),
            'warning',
            'product',
            NEW.id
        FROM users
        WHERE role IN ('admin', 'staff') AND status = 'active';
    END IF;
END//

DELIMITER ;

-- Create trigger untuk notify new order
DELIMITER //

CREATE TRIGGER notify_new_order
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    -- Notify Admin
    INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
    SELECT 
        id,
        'Pesanan Baru',
        CONCAT('Pesanan #', NEW.order_number, ' (RM ', NEW.total, ') telah diterima'),
        'info',
        'order',
        NEW.id
    FROM users
    WHERE role = 'admin' AND status = 'active';
    
    -- Notify assigned staff if any
    IF NEW.assigned_staff_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
        VALUES (
            NEW.assigned_staff_id,
            'Pesanan Ditugaskan',
            CONCAT('Pesanan #', NEW.order_number, ' telah ditugaskan kepada anda'),
            'info',
            'order',
            NEW.id
        );
    END IF;
END//

DELIMITER ;

COMMIT;

SELECT 'Notifications system installed successfully!' as message;

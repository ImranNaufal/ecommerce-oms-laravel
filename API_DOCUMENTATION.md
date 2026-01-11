# API Documentation - E-commerce OMS

Complete API reference for the E-commerce Order Management System.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "role": "staff|affiliate"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": 1
}
```

#### Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@ecommerce.com",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@ecommerce.com",
    "full_name": "Admin User",
    "role": "admin",
    "commission_type": "percentage",
    "commission_value": 10.00,
    "tier": "gold"
  }
}
```

---

### Products

#### List Products
```http
GET /api/products
```

**Query Parameters:**
- `category` (optional) - Filter by category ID
- `status` (optional) - Filter by status (active|inactive|out_of_stock)
- `search` (optional) - Search by name, SKU, or description
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "category_name": "Electronics",
      "sku": "ELEC-001",
      "name": "Wireless Bluetooth Headphones",
      "description": "High-quality wireless headphones",
      "price": 299.00,
      "cost_price": 150.00,
      "stock_quantity": 50,
      "low_stock_threshold": 10,
      "status": "active",
      "image_url": "https://example.com/image.jpg",
      "created_at": "2026-01-09T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "pages": 1
  }
}
```

#### Get Single Product
```http
GET /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category_id": 1,
    "category_name": "Electronics",
    "sku": "ELEC-001",
    "name": "Wireless Bluetooth Headphones",
    "price": 299.00,
    "stock_quantity": 50
  }
}
```

#### Create Product
```http
POST /api/products
```

**Headers:**
```
Authorization: Bearer <token>
```

**Required Role:** Admin or Staff

**Body:**
```json
{
  "category_id": 1,
  "sku": "PROD-001",
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "cost_price": 50.00,
  "stock_quantity": 100,
  "low_stock_threshold": 10,
  "image_url": "https://example.com/image.jpg",
  "weight": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "productId": 7
}
```

#### Update Product
```http
PUT /api/products/:id
```

**Required Role:** Admin or Staff

**Body:** (all fields optional)
```json
{
  "name": "Updated Product Name",
  "price": 109.99,
  "stock_quantity": 95,
  "status": "active"
}
```

#### Delete Product
```http
DELETE /api/products/:id
```

**Required Role:** Admin only

---

### Orders

#### List Orders
```http
GET /api/orders
```

**Query Parameters:**
- `status` (optional) - Filter by order status
- `payment_status` (optional) - Filter by payment status
- `channel` (optional) - Filter by sales channel ID
- `date_from` (optional) - Filter from date (YYYY-MM-DD)
- `date_to` (optional) - Filter to date (YYYY-MM-DD)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-ABC123",
      "customer_id": 1,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "channel_name": "Main Website",
      "subtotal": 299.00,
      "total": 320.94,
      "status": "pending",
      "payment_status": "pending",
      "payment_method": "cod",
      "staff_name": "John Staff",
      "affiliate_name": "Sarah Affiliate",
      "staff_commission": 15.00,
      "affiliate_commission": 32.09,
      "created_at": "2026-01-09T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### Get Order Details
```http
GET /api/orders/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-ABC123",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "0123456789",
    "total": 320.94,
    "status": "pending",
    "shipping_address": "123 Main St",
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Wireless Headphones",
        "sku": "ELEC-001",
        "quantity": 1,
        "price": 299.00,
        "subtotal": 299.00
      }
    ]
  }
}
```

#### Create Order
```http
POST /api/orders
```

**Body:**
```json
{
  "customer_id": 1,
  "channel_id": 1,
  "affiliate_id": 3,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "shipping_address": "123 Main Street",
  "shipping_city": "Kuala Lumpur",
  "shipping_state": "Wilayah Persekutuan",
  "shipping_postal_code": "50200",
  "payment_method": "online_banking",
  "discount": 0,
  "shipping_fee": 15.00,
  "notes": "Please deliver after 5pm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": 2,
  "orderNumber": "ORD-ABC456"
}
```

#### Update Order Status
```http
PATCH /api/orders/:id/status
```

**Required Role:** Admin or Staff

**Body:**
```json
{
  "status": "confirmed|processing|packed|shipped|delivered|cancelled"
}
```

#### Update Payment Status
```http
PATCH /api/orders/:id/payment
```

**Required Role:** Admin or Staff

**Body:**
```json
{
  "payment_status": "pending|paid|failed|refunded"
}
```

---

### Customers

#### List Customers
```http
GET /api/customers
```

**Query Parameters:**
- `search` (optional) - Search by name, email, or phone
- `customer_type` (optional) - Filter by type (retail|wholesale|vip)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "customer@example.com",
      "full_name": "John Customer",
      "phone": "0123456789",
      "city": "Kuala Lumpur",
      "state": "Wilayah Persekutuan",
      "customer_type": "retail",
      "total_orders": 5,
      "total_spent": 1500.00,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Customer
```http
POST /api/customers
```

**Body:**
```json
{
  "email": "customer@example.com",
  "full_name": "John Customer",
  "phone": "0123456789",
  "address": "123 Main St",
  "city": "Kuala Lumpur",
  "state": "Wilayah Persekutuan",
  "postal_code": "50200",
  "country": "Malaysia",
  "customer_type": "retail"
}
```

---

### Commissions

#### Get Commission Summary
```http
GET /api/commissions/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "status": "pending",
        "count": 5,
        "total_amount": 150.00
      },
      {
        "status": "paid",
        "count": 10,
        "total_amount": 500.00
      }
    ],
    "monthly": [
      {
        "month": "2026-01",
        "total_amount": 200.00,
        "count": 8
      }
    ],
    "config": {
      "commission_type": "percentage",
      "commission_value": 10.00,
      "tier": "gold"
    }
  }
}
```

#### List Commission Transactions
```http
GET /api/commissions/transactions
```

**Query Parameters:**
- `status` (optional) - Filter by status
- `date_from` (optional)
- `date_to` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "order_id": 1,
      "order_number": "ORD-ABC123",
      "commission_type": "affiliate",
      "amount": 32.09,
      "percentage": 10.00,
      "order_total": 320.94,
      "status": "pending",
      "created_at": "2026-01-09T10:00:00.000Z"
    }
  ]
}
```

#### Get Leaderboard
```http
GET /api/commissions/leaderboard
```

**Query Parameters:**
- `period` (optional) - month|year|all (default: month)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "full_name": "Sarah Affiliate",
      "email": "affiliate1@ecommerce.com",
      "total_orders": 15,
      "total_commission": 450.00,
      "tier": "gold"
    }
  ]
}
```

#### Approve Commission (Admin Only)
```http
PATCH /api/commissions/:id/approve
```

#### Mark Commission as Paid (Admin Only)
```http
PATCH /api/commissions/:id/paid
```

---

### Dashboard

#### Get Dashboard Statistics
```http
GET /api/dashboard/stats
```

**Query Parameters:**
- `period` (optional, default: 30) - Number of days

**Response (Admin):**
```json
{
  "success": true,
  "data": {
    "orders": {
      "total_orders": 100,
      "delivered_orders": 80,
      "pending_orders": 20,
      "total_revenue": 50000.00,
      "recent_orders": 15
    },
    "products": {
      "total_products": 50,
      "total_stock": 1500,
      "low_stock_items": 5
    },
    "customers": {
      "total_customers": 200,
      "new_customers": 25
    },
    "commissions": {
      "pending_commissions": 500.00,
      "approved_commissions": 300.00,
      "paid_commissions": 2000.00
    }
  }
}
```

#### Get Sales Chart Data (Admin Only)
```http
GET /api/dashboard/sales-chart
```

**Query Parameters:**
- `period` (optional, default: 30) - Number of days

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-01-01",
      "orders": 5,
      "revenue": 1500.00
    },
    {
      "date": "2026-01-02",
      "orders": 8,
      "revenue": 2400.00
    }
  ]
}
```

---

### Sales Channels

#### List Channels
```http
GET /api/channels
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Website",
      "type": "website",
      "is_active": true,
      "total_orders": 50,
      "orders_last_30_days": 15,
      "last_sync_at": "2026-01-09T10:00:00.000Z"
    }
  ]
}
```

#### Manual Sync Channel
```http
POST /api/channels/:id/sync
```

---

### Webhooks

#### External Order Injection
```http
POST /api/webhooks/order/external
```

**No authentication required** (use webhook signature in production)

**Body:**
```json
{
  "marketplace": "shopee|lazada|tiktok|facebook|other",
  "external_order_id": "SHOPEE123456",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "0123456789"
  },
  "items": [
    {
      "sku": "ELEC-001",
      "name": "Product Name",
      "quantity": 1,
      "price": 299.00
    }
  ],
  "totals": {
    "subtotal": 299.00,
    "discount": 0,
    "shipping_fee": 15.00,
    "tax": 18.84,
    "total": 332.84
  },
  "shipping": {
    "address": "123 Main Street",
    "city": "Kuala Lumpur",
    "state": "Wilayah Persekutuan",
    "postal_code": "50200"
  },
  "payment_method": "online_banking|cod|credit_card|ewallet"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order injected successfully",
  "orderId": 5,
  "orderNumber": "SHOPEE-SHOPEE123456"
}
```

#### Payment Confirmation Webhook
```http
POST /api/webhooks/payment/confirmation
```

**Body:**
```json
{
  "order_number": "ORD-ABC123",
  "status": "success|failed",
  "transaction_id": "TXN123456",
  "payment_method": "online_banking"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limiting

Currently no rate limiting is implemented. In production, implement rate limiting:
- 100 requests per minute for authenticated users
- 20 requests per minute for public endpoints

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Handle errors gracefully** on the client side
3. **Use pagination** for list endpoints
4. **Validate input** before sending requests
5. **Cache responses** where appropriate
6. **Use webhook signatures** in production

---

For more information, refer to the README.md file.

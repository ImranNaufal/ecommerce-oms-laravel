# Backend API Documentation for Developers

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js          # MySQL connection pool
│   └── schema.sql           # Database schema (13 tables)
├── middleware/
│   └── auth.js              # JWT authentication & authorization
├── routes/
│   ├── auth.js              # Login, register, profile
│   ├── products.js          # Product CRUD + Auto-SKU generation
│   ├── orders.js            # Order management + Commission calc
│   ├── customers.js         # Customer management
│   ├── commissions.js       # Commission tracking & approval
│   ├── dashboard.js         # Dashboard statistics
│   ├── channels.js          # Sales channel integration
│   ├── webhooks.js          # External order injection
│   ├── notifications.js     # Notification system
│   ├── search.js            # Universal search
│   └── alerts.js            # System alerts
├── migrations/
│   └── 001_add_notifications.sql  # Notification system migration
└── server.js                # Express app entry point
```

## 🔑 Key Features

### 1. Auto-Generate SKU (products.js)
**Function:** `generateNextSKU(categoryId)`
- Electronics → ELEC-001, ELEC-002, ...
- Fashion → FASH-001, FASH-002, ...
- **No rearranging on delete** (prevents broken references)

### 2. Commission Calculation (orders.js)
**Function:** `calculateCommission(orderId, userId, userType, orderTotal)`
- Supports percentage & fixed commission
- Auto-creates commission_transaction record
- Status: pending → approved (on payment) → paid

### 3. Transaction Safety (orders.js Line 215-341)
**All order operations use transactions:**
```javascript
BEGIN TRANSACTION
  → Create order
  → Insert items
  → Deduct inventory
  → Calculate commission
  → Update customer stats
COMMIT (or ROLLBACK on error)
```

### 4. Database Triggers (schema.sql)
**Auto-triggers:**
- `notify_low_stock` - Alert when stock ≤ threshold
- `notify_new_order` - Notify admin/staff on new order

### 5. Webhook Integration (webhooks.js)
**Endpoint:** `POST /api/webhooks/order/external`
- Accepts orders from Shopee/Lazada/TikTok
- Auto-creates customer if not exists
- Maps products by SKU
- Logs all activity in `api_logs` table

## 🔒 Security Features

1. **JWT Authentication** - All protected routes require valid token
2. **Role-Based Authorization** - 3 levels (Admin/Staff/Affiliate)
3. **Password Hashing** - bcrypt with 10 rounds
4. **SQL Injection Prevention** - All queries use parameterized statements
5. **Input Validation** - express-validator on all POST/PUT requests

## 🗄️ Database Schema Highlights

### Optimizations:
- **Generated Columns:** `profit`, `subtotal`, `total_commission` (auto-calculated)
- **Indexes:** 25+ indexes for fast queries
- **Denormalization:** Commission amounts stored in orders table for performance

### Key Tables:
- `orders` - 7 status-based indexes for fulfillment queries
- `commission_transactions` - Composite index (user_id, status, created_at)
- `products` - Indexes on SKU, category, status

## 📝 Code Conventions

### Error Handling:
```javascript
try {
  // Operation
  res.json({ success: true, data });
} catch (error) {
  console.error('Operation error:', error);
  res.status(500).json({ success: false, message: 'Server error' });
}
```

### Response Format:
```javascript
// Success
{ success: true, data: {...}, message: "..." }

// Error
{ success: false, message: "Error description", errors: [...] }
```

### Authentication Required:
```javascript
router.post('/endpoint', [auth, authorize('admin')], async (req, res) => {
  // Only admin can access
});
```

## 🚀 How to Add New Endpoint

1. Create route file in `backend/routes/`
2. Import in `backend/server.js`
3. Register route: `app.use('/api/endpoint', routes);`
4. Use `auth` middleware for protected routes
5. Add validation with `express-validator`
6. Return standardized response format

## 📊 Performance Tips

- Connection pooling already configured (10 connections)
- Use indexes for WHERE/JOIN clauses
- Paginate large datasets
- Cache frequently accessed data (future enhancement)

---

**For questions, see main README.md or API_DOCUMENTATION.md**

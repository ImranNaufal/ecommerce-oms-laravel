# Complete Setup Guide - E-commerce OMS

This guide will walk you through the complete setup process step by step.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (version 14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MySQL** (version 5.7 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP for easier setup on Windows

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

4. **Code Editor** (recommended)
   - VS Code: https://code.visualstudio.com/

## Step-by-Step Setup

### Step 1: Prepare the Project

1. Open terminal/command prompt
2. Navigate to the project folder:
```bash
cd "C:\Users\imran\OneDrive\Cursor Project\Test 4"
```

### Step 2: Install Dependencies

1. **Install backend dependencies:**
```bash
npm install
```

2. **Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

### Step 3: Setup MySQL Database

#### Option A: Using MySQL Command Line

1. Open MySQL command line or any MySQL client
2. Create the database:
```sql
CREATE DATABASE ecommerce_oms;
```

3. Import the schema:
```bash
mysql -u root -p ecommerce_oms < backend/config/schema.sql
```

#### Option B: Using phpMyAdmin (if using XAMPP/WAMP)

1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Click "New" to create a database
3. Name it `ecommerce_oms`
4. Click "Import" tab
5. Choose file: `backend/config/schema.sql`
6. Click "Go"

### Step 4: Configure Environment Variables

1. Create a `.env` file in the root directory (copy from .env.example)
2. Update with your database credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce_oms
DB_PORT=3306

# JWT Secret (generate a random string)
JWT_SECRET=your_secret_key_here_make_it_long_and_random
JWT_EXPIRE=7d

# Frontend URL
CLIENT_URL=http://localhost:3000
```

**Important:** Replace `your_mysql_password` with your actual MySQL root password!

### Step 5: Verify Database Connection

Test if everything is configured correctly:

```bash
# Start the backend server
npm run server
```

You should see:
```
✓ MySQL Database Connected Successfully
🚀 Server running on port 5000
```

If you see connection errors, double-check your database credentials in `.env`

### Step 6: Start the Application

You have two options:

#### Option A: Run Both Servers Together (Recommended for Development)

```bash
npm run dev
```

This will start:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

#### Option B: Run Servers Separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

### Step 7: Access the Application

1. Open your browser
2. Go to: http://localhost:3000
3. You should see the login page

### Step 8: Login with Demo Accounts

Use these credentials to test different roles:

**Admin Account:**
- Email: `admin@ecommerce.com`
- Password: `admin123`
- Access: Full system access

**Staff Account:**
- Email: `staff1@ecommerce.com`
- Password: `admin123`
- Access: Order fulfillment, customer management

**Affiliate Account:**
- Email: `affiliate1@ecommerce.com`
- Password: `admin123`
- Access: View own orders and commissions

## Troubleshooting Common Issues

### Issue 1: Cannot connect to database

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solutions:**
- Ensure MySQL service is running
- Check if port 3306 is correct (some installations use 3307)
- Verify DB_HOST in .env is set to `localhost`
- Check DB_USER and DB_PASSWORD are correct

### Issue 2: Port already in use

**Error:** `Port 5000 is already in use`

**Solutions:**
- Stop other applications using port 5000
- Or change PORT in .env file to another port (e.g., 5001)
- Update proxy in frontend/package.json to match new port

### Issue 3: Module not found errors

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# For frontend
cd frontend
rm -rf node_modules
npm install
```

### Issue 4: Database schema import fails

**Solution:**
- Manually run the schema in MySQL Workbench or phpMyAdmin
- Or execute it line by line in MySQL command line

### Issue 5: CORS errors in browser console

**Solution:**
- Ensure backend is running
- Check CLIENT_URL in .env matches your frontend URL
- Verify proxy in frontend/package.json points to correct backend URL

## Database Structure Overview

The database includes these main tables:

1. **users** - System users (admin, staff, affiliates)
2. **customers** - Your customers
3. **products** - Product catalog
4. **orders** - Order records
5. **order_items** - Order line items
6. **commission_configs** - Commission rules
7. **commission_transactions** - Commission tracking
8. **sales_channels** - Marketplace integrations
9. **api_logs** - API activity logs

## Sample Data Included

The schema includes sample data:

**Users:**
- 1 Admin
- 1 Staff member
- 1 Affiliate

**Products:**
- 6 sample products across different categories

**Categories:**
- Electronics
- Fashion
- Home & Living
- Beauty

**Sales Channels:**
- Main Website
- Shopee Malaysia
- Lazada Malaysia
- TikTok Shop
- Facebook Shop

## Testing the Application

### Test Order Creation

1. Login as admin or staff
2. Go to Orders > Create Order
3. Fill in the order form
4. Submit and verify order appears in list

### Test Commission System

1. Create an order with an affiliate
2. Set payment status to "Paid"
3. Go to Commissions page
4. Verify commission is calculated and appears

### Test Webhook Integration

Use this curl command to test external order injection:

```bash
curl -X POST http://localhost:5000/api/webhooks/order/external ^
  -H "Content-Type: application/json" ^
  -d "{\"marketplace\":\"shopee\",\"external_order_id\":\"TEST123\",\"customer\":{\"email\":\"test@example.com\",\"name\":\"Test Customer\",\"phone\":\"0123456789\"},\"items\":[{\"sku\":\"ELEC-001\",\"name\":\"Test Product\",\"quantity\":1,\"price\":100.00}],\"totals\":{\"subtotal\":100.00,\"discount\":0,\"shipping_fee\":10.00,\"tax\":6.60,\"total\":116.60},\"shipping\":{\"address\":\"123 Test St\",\"city\":\"KL\",\"state\":\"WP\",\"postal_code\":\"50000\"},\"payment_method\":\"online_banking\"}"
```

## Next Steps

After successful setup:

1. **Explore the Dashboard** - View statistics and charts
2. **Manage Products** - Add/edit products
3. **Create Orders** - Test the order flow
4. **Review Commissions** - Check commission calculations
5. **Configure Channels** - Set up sales channel integrations
6. **Test APIs** - Use Postman to test API endpoints

## For Interview Presentation

Before your interview:

1. ✅ Ensure both frontend and backend are running smoothly
2. ✅ Create a few test orders to show order flow
3. ✅ Have different role accounts ready to demo
4. ✅ Prepare to show commission calculations
5. ✅ Be ready to explain database optimization
6. ✅ Have code examples ready to discuss
7. ✅ Prepare to demo webhook integration

## Production Deployment Tips

When deploying to production:

1. **Change all default passwords**
2. **Use strong JWT_SECRET**
3. **Set NODE_ENV=production**
4. **Enable SSL/HTTPS**
5. **Configure proper CORS**
6. **Set up database backups**
7. **Use environment-specific configs**
8. **Enable rate limiting**
9. **Set up monitoring**
10. **Configure CDN for static assets**

## Need Help?

If you encounter issues:

1. Check the error message in terminal
2. Review this troubleshooting guide
3. Check browser console for frontend errors
4. Verify all dependencies are installed
5. Ensure database is running and configured
6. Check that all ports are available

## Resources

- Node.js Documentation: https://nodejs.org/docs
- Express.js Guide: https://expressjs.com/
- React Documentation: https://react.dev/
- MySQL Documentation: https://dev.mysql.com/doc/
- Tailwind CSS: https://tailwindcss.com/docs

---

**Success Indicators:**

✅ No errors in terminal
✅ Database connected successfully
✅ Frontend loads without errors
✅ Can login with demo accounts
✅ Dashboard shows statistics
✅ Can navigate between pages
✅ API endpoints respond correctly

If all checks pass, your setup is complete! 🎉

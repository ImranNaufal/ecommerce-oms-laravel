# Complete Setup Guide - E-commerce OMS

This guide will walk you through the complete setup process for the Laravel + React stack.

## Prerequisites

Ensure you have the following installed:
1. **Node.js** (v18+) & **npm**
2. **PHP** (v8.2+) & **Composer**
3. **MySQL** (v8.0+)

## Step-by-Step Setup

### 1. Backend Setup (Laravel)
```bash
cd backend
composer install
cp .env.example .env
# Edit .env and set your DB credentials:
# DB_DATABASE=ecommerce_oms
# DB_USERNAME=root
# DB_PASSWORD=your_password

php artisan key:generate
php artisan migrate --seed
php artisan jwt:secret
```

### 2. Frontend Setup (React)
```bash
cd frontend
npm install
```

### 3. Start the Application
From the **root directory**, run:
```bash
npm run dev
```
This will start:
- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5000

## Demo Accounts
- **Admin:** `admin@ecommerce.com` / `admin123`
- **Staff:** `staff1@ecommerce.com` / `admin123`
- **Affiliate:** `affiliate1@ecommerce.com` / `admin123`

## Troubleshooting
- **CORS Issues:** Ensure `CLIENT_URL` in `backend/.env` matches your frontend URL (default: http://localhost:5000).
- **Database Connection:** Verify MySQL is running and credentials in `backend/.env` are correct.
- **Port Conflicts:** If port 8000 or 5000 is occupied, you can change them in `package.json` (root) or `.env` files.
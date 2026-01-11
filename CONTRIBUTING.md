# Contributing Guide for Developers

## 📖 Overview

This is a Full Stack E-commerce Order Management System built with:
- **Backend:** Laravel 11 (PHP 8.2+) + MySQL
- **Frontend:** React 18 + Tailwind CSS
- **Key Features:** Automated commission system, multi-channel integration via Webhooks, real-time analytics.

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │─────▶│   Laravel   │─────▶│   MySQL     │
│  Frontend   │◀─────│     API     │◀─────│  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  External   │
                     │ Marketplaces│
                     │  (Webhook)  │
                     └─────────────┘
```

## 🚀 Getting Started

### Prerequisites
- PHP >= 8.2
- Node.js >= 18.0.0
- MySQL >= 8.0
- Composer

### Installation

```bash
# Clone and install backend
cd backend
composer install
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate --seed
php artisan jwt:secret
cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start development servers (from root)
npm run dev
```

## 📂 Code Organization

### Backend (`/backend`)
```
app/Http/Controllers/  - API Endpoints & Business Logic
app/Http/Middleware/   - Auth, Role validation, CORS
app/Models/            - Eloquent Models & Relationships
database/migrations/   - Schema definitions
routes/api.php         - API Route definitions
```

### Frontend (`/frontend/src`)
```
components/  - Reusable UI components
context/     - React Context (Auth, Cart)
pages/       - Page components (Dashboard, Orders, etc.)
api.js       - Centralized Axios instance
```

## 🔧 Key Concepts

### 1. Commission System
**File:** `backend/app/Http/Controllers/CommissionController.php`

The system calculates commissions based on user type (Staff/Affiliate) and their specific configuration in `commission_configs` table.

### 2. Auto-Generate SKU
**File:** `backend/app/Http/Controllers/ProductController.php`

Generates unique SKUs based on category prefixes (e.g., `ELEC-001`).

### 3. Webhook Integration
**File:** `backend/app/Http/Controllers/WebhookController.php`

**Endpoint:** `POST /api/webhooks/order/external`

Accepts order injections from external platforms. It automatically creates customers, maps products by SKU, and deducts inventory.

## 🎨 Frontend Patterns

- **Data Fetching:** React Query for caching and synchronization.
- **State Management:** React Context for Auth and Cart.
- **Styling:** Tailwind CSS with a consistent design system.

## 🧪 Testing

### Automated Testing (Playwright):
Run from root:
```bash
npx playwright test
```

### Manual Testing Utility Scripts:
Located in `backend/tests/Manual/`.

## 📝 Code Style Guidelines

### Backend:
- Use Eloquent for database interactions where possible.
- Wrap multi-table operations in `DB::transaction()`.
- Return standardized JSON responses (`success`, `data`, `message`).
- Use PHPDoc for controller methods.

### Frontend:
- Functional components with Hooks.
- Centralized API calls in `api.js`.
- Responsive design using Tailwind utility classes.
# Environment Variables Template

Copy this content to create your `.env` file in the root directory.

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration (Update with your MySQL credentials)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=ecommerce_oms
DB_PORT=3306

# JWT Secret (CRITICAL: Change this in production!)
# Generate random 64-character string: https://randomkeygen.com/
JWT_SECRET=ecommerce_oms_secret_key_2026_change_to_64_random_chars_in_production
JWT_EXPIRE=7d

# Frontend URL
CLIENT_URL=http://localhost:3000

# Optional: Marketplace API Keys (for external integration)
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
LAZADA_APP_KEY=
LAZADA_APP_SECRET=
TIKTOK_APP_KEY=
TIKTOK_APP_SECRET=

# Optional: Webhook Security
WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Setup Instructions

1. Copy the content above
2. Create file named `.env` in project root
3. Update `DB_PASSWORD` with your MySQL password
4. For production, generate strong `JWT_SECRET` (minimum 32 characters)
5. Save file

**Note:** `.env` file is automatically excluded from Git (see `.gitignore`)

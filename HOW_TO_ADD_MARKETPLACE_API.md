# 🔗 How to Connect Marketplace APIs

## 📋 Step-by-Step Guide

### For Shopee Malaysia

#### Step 1: Get API Credentials
1. Login to Shopee Open Platform: https://open.shopee.com/
2. Create an App to get your **Partner ID**, **Partner Key**, and **Shop ID**.

#### Step 2: Configure in Database
You can update the `sales_channels` table directly:
```sql
UPDATE sales_channels 
SET api_key = 'YOUR_KEY_HERE', is_active = TRUE 
WHERE type = 'shopee';
```

#### Step 3: Set Webhook URL
In the Shopee dashboard, set your callback URL to:
`http://your-domain.com/api/webhooks/order/external`

---


### For Lazada & TikTok Shop
Similar to Shopee, obtain your App Key and App Secret and update the `sales_channels` table for the respective types (`lazada`, `tiktok`).

---


## 📡 Webhook Implementation (Laravel)

### Architecture
All external order injections are handled by the `WebhookController`.

**File:** `backend/app/Http/Controllers/WebhookController.php`

**Flow:**
1. **Validation:** Validates incoming JSON structure.
2. **Logging:** Records the raw request in `api_logs` for audit.
3. **Mapping:** 
   - Finds/Creates Customer by email.
   - Identifies Sales Channel.
   - Maps incoming items to internal Products by **SKU**.
4. **Processing:**
   - Creates Order and Order Items.
   - Deducts stock from Products.
   - Triggers Commission calculations.
5. **Success:** Returns a `201 Created` response to the marketplace.


---


## 🧪 Testing with simulator

A simulator script (if available) or manual `curl` can be used to test the integration.

### Example curl for Shopee:
```bash
curl -X POST http://localhost:8000/api/webhooks/order/external \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace": "shopee",
    "external_order_id": "TEST-123",
    "customer": {
      "email": "buyer@example.com",
      "name": "Test Buyer",
      "phone": "0123456789"
    },
    "items": [
      {
        "sku": "ELEC-001",
        "name": "Wireless Headphones",
        "quantity": 1,
        "price": 199.99
      }
    ],
    "totals": {
      "subtotal": 199.99,
      "discount": 0,
      "shipping_fee": 5.00,
      "tax": 12.00,
      "total": 216.99
    }
  }'
```


---


## 🔐 Security
- Marketplace integrations should ideally use **Request Signing** (HMAC) to verify the source.
- Sensitive API keys should be encrypted if stored in the database.
- Use `api_logs` to monitor and debug failed sync attempts.

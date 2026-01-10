# 🔗 How to Connect Marketplace APIs

## 📋 Step-by-Step Guide

### For Shopee Malaysia

#### Step 1: Get API Credentials dari Shopee Open Platform
1. Pergi ke: https://open.shopee.com/
2. Login dengan Shopee Seller account anda
3. Create App → Get:
   - **Partner ID**
   - **Partner Key**
   - **Shop ID**

#### Step 2: Masukkan dalam Database
```sql
UPDATE sales_channels 
SET 
    api_endpoint = 'https://partner.shopeemobile.com',
    api_key = 'YOUR_SHOPEE_PARTNER_KEY_HERE',
    is_active = TRUE
WHERE type = 'shopee';
```

Atau guna phpMyAdmin:
1. Buka table `sales_channels`
2. Edit row untuk "Shopee Malaysia"
3. Paste API key dalam field `api_key`
4. Save

#### Step 3: Configure Webhook di Shopee Dashboard
1. Pergi ke Shopee Partner Portal
2. Settings → Webhooks
3. Masukkan URL: `https://your-domain.com/api/webhooks/order/external`
4. Enable "Order Created" event
5. Save

---

### For Lazada Malaysia

#### API Credentials:
- URL: https://api.lazada.com.my/rest
- Perlu: App Key + App Secret

#### Configuration:
```sql
UPDATE sales_channels 
SET 
    api_endpoint = 'https://api.lazada.com.my/rest',
    api_key = 'YOUR_LAZADA_APP_KEY:YOUR_APP_SECRET',
    is_active = TRUE
WHERE type = 'lazada';
```

#### Webhook Setup:
- Lazada Portal → Developer Center → Push Notifications
- Subscribe to: Order Created, Order Updated
- Callback URL: Your webhook endpoint

---

### For TikTok Shop

#### API Credentials:
- Perlu: App Key + App Secret
- URL: https://open-api.tiktokglobalshop.com

#### Configuration:
```sql
UPDATE sales_channels 
SET 
    api_endpoint = 'https://open-api.tiktokglobalshop.com',
    api_key = 'YOUR_TIKTOK_APP_KEY:SECRET',
    is_active = TRUE
WHERE type = 'tiktok';
```

---

## 🔐 Security Best Practices

### 1. Encryption (RECOMMENDED untuk Production)

Jangan simpan API key dalam plaintext! Encrypt dulu:

**Install encryption package:**
```bash
npm install crypto-js
```

**Create encryption helper:**
```javascript
// backend/utils/encryption.js
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Simpan dalam .env

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
```

**Guna dalam code:**
```javascript
const { encrypt, decrypt } = require('../utils/encryption');

// Simpan (encrypted)
const encryptedKey = encrypt(apiKey);
await pool.query('UPDATE sales_channels SET api_key = ? WHERE id = ?', [encryptedKey, id]);

// Guna (decrypt when needed)
const [channel] = await pool.query('SELECT api_key FROM sales_channels WHERE id = ?', [id]);
const realApiKey = decrypt(channel[0].api_key);
// Use realApiKey untuk call external API
```

---

### 2. Environment Variables untuk Sensitive Keys

**Add to `.env`:**
```env
# Master Encryption Key (NEVER commit to Git!)
ENCRYPTION_KEY=your_super_secret_32_character_key_here

# Marketplace Credentials (Alternative storage)
SHOPEE_PARTNER_KEY=xxxxx
LAZADA_APP_SECRET=xxxxx
TIKTOK_APP_SECRET=xxxxx
```

**Guna dalam code:**
```javascript
const shopeeKey = process.env.SHOPEE_PARTNER_KEY;
// Use untuk call Shopee API
```

---

### 3. Role-Based Access (Already Implemented!)

Hanya **Admin** boleh view/edit API keys:

```javascript
// backend/routes/channels.js (line 107)
router.put('/:id', [
  auth,
  authorize('admin')  // ← Only admin can update
], async (req, res) => {
  // Update channel config
});
```

---

## 📡 How Your Webhook Works

### Current Flow (Already Working!):

```
Shopee/Lazada/TikTok
       ↓ (Order Created Event)
  [Webhook Call]
       ↓
POST /api/webhooks/order/external
       ↓
Your Backend:
  1. Validate request
  2. Create/Find customer
  3. Map products by SKU
  4. Create order
  5. Deduct inventory
  6. Calculate commission
  7. Send notification
       ↓
Dashboard updates in real-time! ✅
```

### Test Webhook (Simulator):
```bash
node simulator.js
```

Atau manual via PowerShell (contoh Shopee):
```powershell
$order = @{
    marketplace="shopee"
    external_order_id="SHP-$(Get-Date -Format 'HHmmss')"
    customer=@{
        email="customer@shopee.com"
        name="Shopee Buyer"
        phone="0123456789"
    }
    items=@(@{
        sku="ELEC-001"
        name="Wireless Headphones"
        quantity=2
        price=299.00
    })
    totals=@{
        subtotal=598.00
        discount=0
        shipping_fee=15.00
        tax=35.88
        total=648.88
    }
    shipping=@{
        address="123 Jalan Bukit Bintang"
        city="Kuala Lumpur"
        state="WP"
        postal_code="55100"
    }
    payment_method="shopee_pay"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5000/api/webhooks/order/external" -Method POST -Body $order -ContentType "application/json"
```

**Result:** Order akan muncul dalam Dashboard automatically!

---

## 🎓 Untuk Interview

### Bila interviewer tanya: "How do you integrate with Shopee?"

**Jawapan:**
> "Saya implement webhook pattern untuk terima order dari Shopee. Bila customer order di Shopee, Shopee akan POST order data ke endpoint `/api/webhooks/order/external`. Sistem saya akan process data tersebut - create customer kalau baru, map products by SKU, create order, deduct inventory, dan calculate commission - semua secara automatik. 
> 
> API keys disimpan dalam environment variables atau encrypted dalam database untuk security. Saya juga log semua webhook activity dalam `api_logs` table untuk troubleshooting jika ada integration issues."

### Show Them:
1. **Code:** `backend/routes/webhooks.js`
2. **Database:** `sales_channels` table dengan API config
3. **Demo:** Run `simulator.js` → Order muncul live!
4. **Logs:** Show `api_logs` table → Webhook call recorded

---

## 🚀 Quick Setup untuk Demo (Development)

Untuk demo purpose (tanpa perlu real Shopee account):

1. **Database sudah configured** ✅
   - 5 sales channels ready (Shopee, Lazada, TikTok, Facebook, Website)
   
2. **Webhook endpoint working** ✅
   - POST `/api/webhooks/order/external`
   
3. **Simulator ready** ✅
   - `simulator.js` file untuk demo integration

**No API keys needed untuk demo - guna simulator!**

---

## 📝 Production Deployment (Real Keys)

Bila deploy production:

1. Register account di:
   - Shopee Open Platform
   - Lazada Open Platform  
   - TikTok Shop Partner Platform

2. Dapatkan API credentials

3. Simpan dalam `.env`:
```env
SHOPEE_KEY=xxxxx
LAZADA_KEY=xxxxx
TIKTOK_KEY=xxxxx
```

4. Update database:
```sql
UPDATE sales_channels SET api_key = 'xxxxx' WHERE type = 'shopee';
```

5. Configure webhook URL di platform tersebut

---

**Untuk interview, anda cuma perlu demo menggunakan `simulator.js` - ia cukup untuk buktikan anda faham integration pattern! 🚀**

**Nak saya improve simulator untuk nampak lebih "real"? 😊**
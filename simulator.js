const axios = require('axios');

// Konfigurasi - Pastikan backend anda sedang berjalan di port 5000
const API_URL = 'http://localhost:5000/api/webhooks/order/external';

// Simulasi Data Order dari Shopee
const mockShopeeOrder = {
    marketplace: "shopee",
    external_order_id: "SHP-ORDER-" + Math.floor(Math.random() * 100000),
    customer: {
        email: "pembeli_bijak@gmail.com",
        name: "Ali bin Abu",
        phone: "0123456789"
    },
    items: [
        {
            sku: "ELEC-001", // SKU sedia ada dalam database
            name: "Wireless Bluetooth Headphones",
            quantity: 1,
            price: 299.00
        }
    ],
    totals: {
        subtotal: 299.00,
        discount: 10.00,
        shipping_fee: 5.00,
        tax: 17.64,
        total: 311.64
    },
    shipping: {
        address: "No 123, Jalan Sultan Ismail",
        city: "Kuala Lumpur",
        state: "Wilayah Persekutuan",
        postal_code: "50250"
    },
    payment_method: "online_banking"
};

async function sendMockOrder() {
    console.log('🚀 Memulakan simulasi suntikan order dari Shopee...');
    
    try {
        const response = await axios.post(API_URL, mockShopeeOrder);
        console.log('✅ Berjaya! Order telah di-inject ke dalam OMS.');
        console.log('📦 Order Number:', response.data.orderNumber);
        console.log('🔔 Sila semak dashboard anda sekarang.');
    } catch (error) {
        console.error('❌ Gagal menyambung ke OMS API:', error.message);
        if (error.response) {
            console.error('Detail Error:', error.response.data);
        }
    }
}

// Jalankan simulasi
sendMockOrder();

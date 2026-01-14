/**
 * Webhook Simulator for E-commerce OMS
 * 
 * This script simulates an external marketplace (e.g., Shopee/TikTok) 
 * sending a new order to our OMS via Webhook.
 * 
 * Usage: node simulator.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:8000/api/webhooks/order/external';

const mockOrder = {
  marketplace: 'shopee',
  external_order_id: 'SHP-' + Math.floor(Math.random() * 1000000),
  customer: {
    name: 'Ahmad Simulator',
    email: 'ahmad_sim@example.com',
    phone: '0192233445'
  },
  shipping: {
    address: 'Lot 123, Jalan Testing, Cyberjaya',
    city: 'Cyberjaya',
    state: 'Selangor',
    postal_code: '63000'
  },
  items: [
    {
      sku: 'ELEC-001', // Wireless Headphones
      name: 'Wireless Headphones (Black)',
      quantity: 1,
      price: 199.99
    }
  ],
  totals: {
    subtotal: 199.99,
    discount: 0,
    shipping_fee: 10.00,
    tax: 12.00,
    total: 221.99
  },
  payment_method: 'online_banking'
};

async function simulateWebhook() {
  console.log('🚀 Sending mock Shopee order to OMS...');
  try {
    const response = await axios.post(API_URL, mockOrder);
    console.log('✅ Success!');
    console.log('Response:', response.data);
    console.log('\nCheck your OMS Dashboard or System Logs to see the results.');
  } catch (error) {
    console.error('❌ Failed to send webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

simulateWebhook();

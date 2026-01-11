const { test, expect } = require('@playwright/test');

test.describe('Product Management & Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to products
    await page.click('text=Products');
    await page.waitForURL('/products');
  });

  test('should display product catalog', async ({ page }) => {
    await expect(page.locator('text=Inventory Master')).toBeVisible();
    
    // Should show at least 1 product
    const products = page.locator('[class*="premium-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should search products', async ({ page }) => {
    await page.fill('input[placeholder*="Cari"]', 'Headphones');
    // Wait for text to appear with longer timeout
    await expect(page.locator('text=Headphones').first()).toBeVisible({ timeout: 15000 });
  });

  test('should add product to cart', async ({ page }) => {
    // Click "Add to Cart" button (using aria-label)
    await page.getByLabel('Add to Cart').filter({ hasText: '' }).first().click({ force: true });
    
    // Cart counter should update
    await expect(page.getByRole('button', { name: /Troli/ })).toContainText('(1)');
  });

  test('should open Add Product modal', async ({ page }) => {
    await page.locator('button:has-text("Add Item"), button:has-text("Tambah Item")').click();
    
    // Modal should open
    await page.waitForTimeout(500);
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('CRITICAL: should create new product end-to-end', async ({ page }) => {
    // Open modal
    await page.locator('button:has-text("Add Item"), button:has-text("Tambah Item")').click();
    await page.waitForTimeout(1000);
    
    // Fill form
    const timestamp = Date.now();
    // 0. Image URL
    await page.fill('#image_url', 'https://images.unsplash.com/photo-123');
    // 1. Product Name
    await page.fill('#product_name', `Test Product ${timestamp}`);
    // 2. Selling Price
    await page.fill('#price', '99.99');
    // 3. Cost Price
    await page.fill('#cost_price', '50');
    // 4. Stock Quantity
    await page.fill('#stock_quantity', '100');
    
    // Submit
    await page.click('button[type="submit"]', { force: true });
    
    // Should show success toast
    await expect(page.locator('text=Produk ditambah')).toBeVisible({ timeout: 15000 });
    
    // Product should appear in list
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=Test Product ${timestamp}`)).toBeVisible();
  });

  test('CRITICAL: should complete checkout flow', async ({ page }) => {
    // Add first product to cart (using aria-label)
    await page.getByLabel('Add to Cart').first().click({ force: true });
    await page.waitForTimeout(500);
    
    // Open cart
    await page.getByRole('button', { name: /Troli/ }).click();
    
    // Cart should open
    await page.waitForTimeout(1000);
    
    // Click checkout
    await page.click('text=Buat Pesanan Sekarang');
    
    // Should show success message
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 10000 });
    
    // Cart should clear
    await expect(page.getByRole('button', { name: /Troli \(0\)/ })).toBeVisible({ timeout: 10000 });
  });

  test('should archive a product', async ({ page }) => {
    // Locate the first product name
    const productName = await page.locator('h3').first().innerText();
    
    // Click Archive button on the first product card
    await page.getByTitle('Archive Product').first().click({ force: true });
    
    // Confirm dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Should show success toast
    await expect(page.locator('text=Produk dikemaskini')).toBeVisible({ timeout: 10000 });
    
    // Product should disappear from list (since we default to hiding inactive)
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${productName}`)).not.toBeVisible();
  });
});

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
    await expect(page.locator('text=Katalog')).toBeVisible();
    await expect(page.locator('text=Inventory Master')).toBeVisible();
    
    // Should show at least 1 product
    const products = page.locator('[class*="premium-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should search products', async ({ page }) => {
    await page.fill('input[placeholder*="Cari"]', 'Wireless');
    await page.waitForTimeout(500);
    
    // Should show filtered results
    await expect(page.locator('text=Wireless')).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    // Click first "+" button to add to cart
    await page.locator('button:has(svg)').first().click();
    
    // Cart counter should update
    await expect(page.locator('text=Troli')).toContainText('(1)');
  });

  test('should open Add Product modal', async ({ page }) => {
    await page.click('text=Tambah Item');
    
    // Modal should open
    await expect(page.locator('text=Tambah Produk Baru')).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('CRITICAL: should create new product end-to-end', async ({ page }) => {
    // Open modal
    await page.click('text=Tambah Item');
    await page.waitForSelector('text=Tambah Produk Baru');
    
    // Fill form
    const timestamp = Date.now();
    await page.fill('input[type="text"]', `Test Product ${timestamp}`);
    await page.locator('input').nth(1).fill(`TEST-${timestamp}`);
    await page.locator('input[type="number"]').first().fill('99.99');
    await page.locator('input[type="number"]').nth(1).fill('50');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success toast
    await expect(page.locator('text=Produk ditambah')).toBeVisible({ timeout: 5000 });
    
    // Product should appear in list
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=Test Product ${timestamp}`)).toBeVisible();
  });

  test('CRITICAL: should complete checkout flow', async ({ page }) => {
    // Add first product to cart
    await page.locator('button:has(svg)').first().click();
    await page.waitForTimeout(500);
    
    // Open cart
    await page.click('text=Troli');
    
    // Cart should open
    await expect(page.locator('text=Ringkasan Troli')).toBeVisible();
    
    // Click checkout
    await page.click('text=Confirm & Checkout');
    
    // Should show success message
    await expect(page.locator('text=Pesanan')).toBeVisible({ timeout: 5000 });
    
    // Cart should clear
    await expect(page.locator('text=Troli (0)')).toBeVisible();
  });
});

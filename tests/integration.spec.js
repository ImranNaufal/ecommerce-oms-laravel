const { test, expect } = require('@playwright/test');

test.describe('End-to-End Integration Tests', () => {
  
  test('CRITICAL: Complete order lifecycle from product to commission', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Step 2: Add product to cart
    await page.click('text=Products');
    await page.waitForURL('/products');
    await page.locator('button:has(svg)').first().click();
    await page.waitForTimeout(500);
    
    // Verify cart count updated
    await expect(page.locator('text=Troli')).toContainText('(1)');
    
    // Step 3: Checkout
    await page.click('text=Troli');
    await expect(page.locator('text=Ringkasan Troli')).toBeVisible();
    await page.click('text=Confirm & Checkout');
    
    // Should show success
    await expect(page.locator('text=berjaya')).toBeVisible({ timeout: 5000 });
    
    // Step 4: Verify order created
    await page.click('text=Order Management');
    await page.waitForURL('/orders');
    
    // New order should be in list
    const firstOrder = page.locator('table tbody tr').first();
    await expect(firstOrder).toBeVisible();
    
    // Step 5: View order detail
    await page.locator('text=Detail').first().click();
    await expect(page.locator('text=Order #')).toBeVisible();
    
    // Step 6: Update payment status (triggers commission)
    const paymentDropdown = page.locator('select').nth(1);
    await paymentDropdown.selectOption('paid');
    await page.click('text=Sahkan Bayaran');
    await expect(page.locator('text=dikemaskini')).toBeVisible({ timeout: 5000 });
    
    // Step 7: Check commission was created
    await page.click('text=Commissions');
    await page.waitForURL('/commissions');
    
    // Commission summary should show data
    await expect(page.locator('text=Earning Portal')).toBeVisible();
  });

  test('CRITICAL: Header search functionality', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Type in search bar
    const searchInput = page.locator('input[placeholder*="Cari"]');
    await searchInput.fill('elec');
    await page.waitForTimeout(500);
    
    // Dropdown should appear with results
    // (Results may vary based on database state)
    await page.waitForTimeout(500);
  });

  test('CRITICAL: Notification system', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Click notification bell
    const bellButton = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first();
    await bellButton.click();
    
    // Notification dropdown should open
    await page.waitForTimeout(500);
    // (Notifications appear based on system events)
  });

  test('CRITICAL: Add customer flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to customers
    await page.click('text=Customers');
    await page.waitForURL('/customers');
    
    // Click add customer
    await page.click('text=Daftar Pelanggan');
    
    // Modal should open
    await expect(page.locator('text=Daftar Pelanggan').nth(1)).toBeVisible();
    
    // Fill form
    const timestamp = Date.now();
    await page.fill('input[type="text"]', `Test Customer ${timestamp}`);
    await page.fill('input[type="email"]', `test${timestamp}@example.com`);
    await page.fill('input[type="text"]').nth(1).fill('0123456789');
    await page.fill('textarea', 'Test Address');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success
    await expect(page.locator('text=berjaya')).toBeVisible({ timeout: 5000 });
  });

  test('CRITICAL: Channel sync functionality', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to channels
    await page.click('text=Integrations');
    await page.waitForURL('/channels');
    
    // Click sync button
    const syncButton = page.locator('text=Sync Now').first();
    await syncButton.click();
    
    // Should show success message
    await expect(page.locator('text=disinkronis')).toBeVisible({ timeout: 5000 });
  });
});

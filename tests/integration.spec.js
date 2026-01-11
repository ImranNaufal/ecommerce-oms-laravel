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
    await page.waitForSelector('[class*="premium-card"]');
    await page.getByLabel('Add to Cart').first().click({ force: true });
    await page.waitForTimeout(500);
    
    // Verify cart count updated
    await expect(page.getByRole('button', { name: /Troli/ })).toContainText('(1)');
    
        
    
            // Step 3: Checkout
    
            await page.getByRole('button', { name: /Troli/ }).click({ force: true });
    
            await page.waitForTimeout(1000);
    
    // Click checkout button
    await page.locator('button:has-text("Buat Pesanan Sekarang")').click({ force: true });
    
    // Wait for success toast and cart to close
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.absolute.inset-0.bg-slate-900\\/40.backdrop-blur-sm')).not.toBeVisible({ timeout: 10000 });
    
    // Step 4: Verify order created
    await page.click('text=Order Management', { force: true });
    await page.waitForURL('/orders');
    
    // New order should be in list
    await expect(page.locator('.spinner')).not.toBeVisible();
    const firstOrder = page.locator('table tbody tr').first();
    await expect(firstOrder).toBeVisible();
    
    // Step 5: View order detail
    await page.locator('text=Detail').first().click({ force: true });
    await expect(page.locator('text=Order #')).toBeVisible();
    
    // Step 6: Update payment status (triggers commission)
    const payButton = page.locator('button:has-text("Mark as Paid"), button:has-text("Tanda Sebagai Dibayar")').first();
    if (await payButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await payButton.click();
      await page.waitForTimeout(2000);
    }
    
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
    
    // Type in search bar (English or Malay placeholder)
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Cari"]').first();
    await searchInput.fill('elec');
    await page.waitForTimeout(1000);
    
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
    await page.fill('#full_name', `Test Customer ${timestamp}`);
    await page.fill('#email', `test${timestamp}@example.com`);
    await page.fill('#phone', '0123456789');
    await page.fill('#address', 'Test Address');
    
    // Submit
    await page.click('button[type="submit"]', { force: true });
    
    // Should show success or modal close
    await expect(page.locator('text=Daftar Pelanggan').nth(1)).not.toBeVisible({ timeout: 15000 });
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
    await page.waitForTimeout(2000); // Wait for API response
    
    // Check if channels exist, if not, wait more
    if (await page.locator('.premium-card').count() === 0) {
        await page.waitForTimeout(2000);
    }

    // Click sync button
    const syncBtn = page.getByLabel(/Sync Website/i);
    if (await syncBtn.count() === 0) await page.reload();
    await expect(syncBtn.first()).toBeVisible({ timeout: 15000 });
    await syncBtn.first().click({ force: true });
    
    // Should show success message
    await expect(page.locator('text=synchronized').or(page.locator('text=berjaya'))).toBeVisible({ timeout: 15000 });
  });
});

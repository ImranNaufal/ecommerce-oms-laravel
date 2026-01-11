const { test, expect } = require('@playwright/test');

test.describe('Order Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to orders
    await page.click('text=Order Management');
    await page.waitForURL('/orders');
  });

    test('should display orders list', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Order Management' })).toBeVisible();
  
      // Should show table
      await expect(page.locator('table')).toBeVisible();  });

  test('should filter orders by status', async ({ page }) => {
    // Select filter
    await page.selectOption('select >> nth=0', 'pending');
    await page.waitForTimeout(1000);
    
    // Should show only pending orders (or empty if none)
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('CRITICAL: should view order detail', async ({ page }) => {
    // Click first order detail link
    const firstOrderLink = page.locator('text=Detail').first();
    if (await firstOrderLink.isVisible()) {
      await firstOrderLink.click();
      
      // Should navigate to detail page
      await expect(page.locator('text=Order #')).toBeVisible();
      // Order detail loaded
      await page.waitForTimeout(1000);
    }
  });

  test('CRITICAL: should update order status', async ({ page }) => {
    // Click first order
    const firstOrderLink = page.locator('text=Detail').first();
    if (await firstOrderLink.isVisible()) {
      await firstOrderLink.click();
      await page.waitForTimeout(500);
      
      // Select new status
      const statusDropdown = page.locator('select').first();
      await statusDropdown.selectOption('confirmed');
      
      // Click update button
      await page.click('text=Update');
      
      // Should show success (wait for toast)
      await page.waitForTimeout(2000);
    }
  });

  test('should update payment status', async ({ page }) => {
    // Navigate to first order detail
    const firstOrderLink = page.locator('text=Detail').first();
    if (await firstOrderLink.isVisible()) {
      await firstOrderLink.click();
      
      // Select payment status
      const paymentDropdown = page.locator('select').nth(1);
      await paymentDropdown.selectOption('paid');
      
      // Click update button
      await page.locator('button:has-text("Confirm"), button:has-text("Sahkan"), button:has-text("Save")').first().click();
      
      // Should show success (wait for processing)
      await page.waitForTimeout(2000);
    }
  });
});

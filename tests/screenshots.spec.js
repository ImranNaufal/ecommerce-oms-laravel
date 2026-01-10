const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Visual Documentation Screenshots', () => {
  const screenshotDir = 'screenshots';

  test('Capture Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('button[type="submit"]');
    await page.screenshot({ path: path.join(screenshotDir, '00-login.png') });
  });

  test.describe('Authenticated Screens', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'admin@ecommerce.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    test('Capture Dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('text=Overview');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, '01-dashboard.png'), fullPage: true });
    });

    test('Capture Products Page and Add Product Modal', async ({ page }) => {
      await page.click('text=Products');
      await page.waitForURL('/products');
      await page.screenshot({ path: path.join(screenshotDir, '02-products-list.png'), fullPage: true });

      await page.click('text=Tambah Item');
      await page.waitForSelector('text=Tambah Produk');
      await page.screenshot({ path: path.join(screenshotDir, '03-add-product-modal.png') });
      await page.keyboard.press('Escape');
    });

    test('Capture Orders Page and Order Detail', async ({ page }) => {
      await page.click('text=Order Management');
      await page.waitForURL('/orders');
      await page.screenshot({ path: path.join(screenshotDir, '04-orders-list.png'), fullPage: true });

      const detailButton = page.locator('text=Detail').first();
      if (await detailButton.isVisible()) {
        await detailButton.click();
        await page.waitForSelector('text=Order #');
        await page.screenshot({ path: path.join(screenshotDir, '05-order-detail.png'), fullPage: true });
      }
    });

    test('Capture Customers Page', async ({ page }) => {
      await page.click('text=Customers');
      await page.waitForURL('/customers');
      await page.screenshot({ path: path.join(screenshotDir, '06-customers.png'), fullPage: true });
    });

    test('Capture Commissions Page', async ({ page }) => {
      await page.click('text=Commissions');
      await page.waitForURL('/commissions');
      await page.screenshot({ path: path.join(screenshotDir, '07-commissions.png'), fullPage: true });
    });

    test('Capture Integrations Page', async ({ page }) => {
      await page.click('text=Integrations');
      await page.waitForURL('/channels');
      await page.screenshot({ path: path.join(screenshotDir, '08-integrations.png'), fullPage: true });
    });

    test('Capture Cart / Troli', async ({ page }) => {
      await page.goto('/products');
      // Click a plus button to add an item
      const addButtons = page.locator('button:has(svg)').filter({ has: page.locator('svg') });
      await addButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Click Troli button 
      const troliButton = page.locator('button').filter({ hasText: 'Troli' });
      await troliButton.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, '09-cart.png') });
    });

    test('Capture Notifications and Search UI', async ({ page }) => {
      await page.goto('/');
      
      const bellButton = page.locator('#notification-bell');
      await bellButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '10-notifications.png') });
      await page.click('body'); 

      const searchInput = page.locator('input[placeholder*="Search orders"]');
      await searchInput.fill('elec');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotDir, '11-search-results.png') });
    });

    test('Capture System Logs', async ({ page }) => {
      await page.click('text=System Logs');
      await page.waitForURL('/logs');
      await page.screenshot({ path: path.join(screenshotDir, '12-system-logs.png'), fullPage: true });
    });
  });
});
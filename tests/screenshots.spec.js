const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Visual Documentation Screenshots', () => {
  const screenshotDir = 'screenshots';
  test.setTimeout(180000); // 3 minutes total for all screenshots

  // Helper to make screenshots look better
  const takeCleanScreenshot = async (page, name) => {
    // Wait for network to settle (faster than fixed timeout)
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) {}
    
    // Hide scrollbar
    await page.addStyleTag({
      content: `
        ::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
      `
    });
    
    // Minimal wait for animations
    await page.waitForTimeout(1000); 
    
    await page.screenshot({ 
      path: path.join(screenshotDir, name), 
      fullPage: false,
      animations: 'disabled'
    });
  };

  test('Capture Login Page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForSelector('button[type="submit"]');
    await takeCleanScreenshot(page, '00-login.png');
  });

  test.describe('Authenticated Screens', () => {
    test.use({ 
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2 // High resolution/Retina
    });

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
      await page.waitForTimeout(2000); // Wait for charts
      await takeCleanScreenshot(page, '01-dashboard.png');
    });

    test('Capture Products Page and Add Product Modal', async ({ page }) => {
      await page.click('text=Products');
      await page.waitForURL('/products');
      await takeCleanScreenshot(page, '02-products-list.png');

      await page.click('text=Tambah Item');
      await page.waitForSelector('text=Tambah Produk');
      await page.waitForTimeout(500);
      await takeCleanScreenshot(page, '03-add-product-modal.png');
      await page.keyboard.press('Escape');
    });

    test('Capture Orders Page and Order Detail', async ({ page }) => {
      await page.click('text=Order Management');
      await page.waitForURL('/orders');
      await takeCleanScreenshot(page, '04-orders-list.png');

      const detailButton = page.locator('text=Detail').first();
      if (await detailButton.isVisible()) {
        await detailButton.click();
        await page.waitForSelector('text=Order #');
        await takeCleanScreenshot(page, '05-order-detail.png');
      }
    });

    test('Capture Customers Page', async ({ page }) => {
      await page.click('text=Customers');
      await page.waitForURL('/customers');
      await takeCleanScreenshot(page, '06-customers.png');
    });

    test('Capture Commissions Page', async ({ page }) => {
      await page.click('text=Commissions');
      await page.waitForURL('/commissions');
      await takeCleanScreenshot(page, '07-commissions.png');
    });

    test('Capture Integrations Page', async ({ page }) => {
      await page.click('text=Integrations');
      await page.waitForURL('/channels');
      await takeCleanScreenshot(page, '08-integrations.png');
    });

    test('Capture Notifications and Search UI', async ({ page }) => {
      await page.goto('/');
      
      const bellButton = page.locator('#notification-bell');
      await bellButton.click();
      await page.waitForTimeout(1000);
      await takeCleanScreenshot(page, '10-notifications.png');
      await page.click('body'); 

      const searchInput = page.locator('input[placeholder*="Search orders"]');
      await searchInput.fill('elec');
      await page.waitForTimeout(1500);
      await takeCleanScreenshot(page, '11-search-results.png');
    });

    test('Capture System Logs', async ({ page }) => {
      await page.click('text=System Logs');
      await page.waitForURL('/logs');
      await takeCleanScreenshot(page, '12-system-logs.png');
    });
  });
});

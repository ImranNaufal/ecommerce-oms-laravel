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

    test('Capture Products Page with Interactions', async ({ page }) => {
      await page.click('text=Products');
      await page.waitForURL('/products');
      
      // Hover over a product card to show actions
      const productCard = page.locator('.premium-card, [class*="card"]').first();
      await productCard.hover();
      await page.waitForTimeout(500);
      await takeCleanScreenshot(page, '02-products-list.png');

      // Open Add Product Modal with form filled
      await page.click('text=Tambah Item');
      await page.waitForSelector('text=Tambah Produk');
      
      // Fill the form to show functionality
      await page.fill('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="nama"]', 'MacBook Pro M3 2024');
      await page.fill('input[placeholder*="price"], input[placeholder*="Price"], input[placeholder*="harga"]', '8999');
      await page.fill('input[placeholder*="stock"], input[placeholder*="Stock"], input[placeholder*="stok"]', '15');
      
      await page.waitForTimeout(500);
      await takeCleanScreenshot(page, '03-add-product-modal.png');
      await page.keyboard.press('Escape');
    });

    test('Capture Orders Page with Filters and Detail', async ({ page }) => {
      await page.click('text=Order Management');
      await page.waitForURL('/orders');
      
      // Click filter dropdown to show filtering options
      const filterButton = page.locator('select, button:has-text("Filter"), button:has-text("Status")').first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(300);
      }
      
      await takeCleanScreenshot(page, '04-orders-list.png');

      // Ensure at least one order exists and click detail
      const detailButton = page.locator('button:has-text("Detail"), a:has-text("Detail")').first();
      await detailButton.waitFor({ state: 'visible', timeout: 10000 });
      await detailButton.click();
      
      await page.waitForSelector('text=Order #', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Hover over status update button to show interaction
      const statusButton = page.locator('button:has-text("Update Status"), button:has-text("Change Status")').first();
      if (await statusButton.isVisible()) {
        await statusButton.hover();
        await page.waitForTimeout(300);
      }
      
      await takeCleanScreenshot(page, '05-order-detail.png');
    });

    test('Capture Customers Page with Search', async ({ page }) => {
      await page.click('text=Customers');
      await page.waitForURL('/customers');
      
      // Use search to show functionality
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Ahmad');
        await searchInput.press('Enter');
        await page.waitForTimeout(800);
      }
      
      // Hover over a customer row to show actions
      const customerRow = page.locator('tr, [class*="card"]').nth(1);
      if (await customerRow.isVisible()) {
        await customerRow.hover();
        await page.waitForTimeout(300);
      }
      
      await takeCleanScreenshot(page, '06-customers.png');
    });

    test('Capture Commissions Page with Active Tab', async ({ page }) => {
      await page.click('text=Commissions');
      await page.waitForURL('/commissions');
      
      // Click on transactions tab to show data
      const transactionsTab = page.locator('button:has-text("Transactions"), button:has-text("Transaction"), text=Transaction').first();
      if (await transactionsTab.isVisible()) {
        await transactionsTab.click();
        await page.waitForTimeout(500);
      }
      
      // Hover over approve button to show action
      const approveButton = page.locator('button:has-text("Approve"), button:has-text("approve")').first();
      if (await approveButton.isVisible()) {
        await approveButton.hover();
        await page.waitForTimeout(300);
      }
      
      await takeCleanScreenshot(page, '07-commissions.png');
    });

    test('Capture Integrations Page with API Config Modal', async ({ page }) => {
      await page.click('text=Integrations');
      await page.waitForURL('/channels');
      
      // Hover over Sync button to show interaction
      const syncButton = page.locator('button:has-text("Sync"), button:has-text("sync")').first();
      if (await syncButton.isVisible()) {
        await syncButton.hover();
        await page.waitForTimeout(300);
      }
      
      await takeCleanScreenshot(page, '08-integrations.png');
      
      // Open configuration modal for one channel
      const configButton = page.locator('button[title*="Configure"], button:has([class*="cog"]), button:has([class*="Cog"])').first();
      if (await configButton.isVisible()) {
        await configButton.click();
        await page.waitForSelector('text=Configure', { timeout: 3000 });
        await page.waitForTimeout(500);
        
        // Fill some example data
        const endpointInput = page.locator('input[placeholder*="endpoint"], input[placeholder*="URL"]').first();
        if (await endpointInput.isVisible()) {
          await endpointInput.fill('https://partner.shopeemobile.com/api/v1');
        }
        
        await takeCleanScreenshot(page, '09-api-config-modal.png');
        await page.keyboard.press('Escape');
      }
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

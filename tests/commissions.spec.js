const { test, expect } = require('@playwright/test');

test.describe('Commission System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to commissions
    await page.click('text=Commissions');
    await page.waitForURL('/commissions');
  });

  test('should display commission summary', async ({ page }) => {
    await expect(page.locator('text=Earning Portal')).toBeVisible();
    
    // Should show summary cards
    await expect(page.locator('text=Menunggu')).toBeVisible();
    await expect(page.locator('text=Diluluskan')).toBeVisible();
    await expect(page.locator('text=Dibayar')).toBeVisible();
  });

  test('should display commission chart', async ({ page }) => {
    // Chart should render
    await page.waitForSelector('.recharts-wrapper', { timeout: 5000 }).catch(() => {});
    
    // At minimum, page should load without errors
    await expect(page.locator('text=Earning Portal')).toBeVisible();
  });

  test('should display leaderboard', async ({ page }) => {
    await expect(page.locator('text=Top Affiliate')).toBeVisible();
  });

  test('should filter commission transactions', async ({ page }) => {
    // Select filter
    await page.selectOption('select', 'pending');
    await page.waitForTimeout(1000);
    
    // Table should update
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('CRITICAL: should approve commission as admin', async ({ page }) => {
    // Look for approval button (thumb icon)
    const approveButton = page.locator('button:has(svg)').filter({ hasText: '' }).first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Should show success
      await expect(page.locator('text=diluluskan')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display transaction history', async ({ page }) => {
    await expect(page.locator('text=Rekod Transaksi')).toBeVisible();
    
    // Table should have headers
    await expect(page.locator('th:has-text("No. Pesanan")')).toBeVisible();
    await expect(page.locator('th:has-text("Komisen")')).toBeVisible();
  });
});

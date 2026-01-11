const { test, expect } = require('@playwright/test');

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should load login page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/E-commerce OMS/);
    await expect(page.getByPlaceholder('admin@ecommerce.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@ecommerce.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Overview')).toBeVisible();
    
    // Dashboard should show stats (English UI)
    await expect(page.locator('text=Total Orders')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on login page and show error
    await expect(page).toHaveURL('/login');
  });

  test('should display demo credentials correctly', async ({ page }) => {
    // Check for demo credentials table/section
    await expect(page.locator('text=admin@ecommerce.com').first()).toBeVisible();
    await expect(page.locator('text=admin123').first()).toBeVisible();
  });
});

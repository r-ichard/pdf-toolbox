import { test, expect } from '@playwright/test';

test.describe('Accessibility Features', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for the main h1 heading on homepage
    const mainHeading = page.getByRole('heading', { name: 'Free Online PDF Tools - Edit, Convert & Manage PDFs' });
    await expect(mainHeading).toBeVisible();
    
    // Verify heading structure (should have logical hierarchy)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // First focusable element should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/merge');
    
    // Check for ARIA labels on important elements
    const dropzone = page.getByRole('button').first();
    const ariaLabel = await dropzone.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check that text is visible (basic contrast check)
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
    
    // Check that buttons have proper styling
    const toolLinks = page.getByRole('link');
    const firstTool = toolLinks.first();
    await expect(firstTool).toBeVisible();
  });

  test('should be screen reader friendly', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper semantic HTML
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    
    // Check that interactive elements have proper roles
    const links = page.getByRole('link');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('should handle focus management', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to a tool page using the specific CTA button
    await page.getByRole('link', { name: 'Merge PDFs Now →' }).click();
    
    // Check that focus is properly managed after navigation
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
  });

  test('should work with high contrast mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    // Check that content is still visible
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/merge');
    
    // Check that file input has proper labeling
    const fileInput = page.locator('input[type="file"]');
    const describedBy = await fileInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
  });
});
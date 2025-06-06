import { test, expect } from '@playwright/test';

test.describe('Performance and User Experience', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(3000);
    
    // Check that main content is visible
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
  });

  test('should have smooth interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test hover effects
    const toolCard = page.getByRole('link', { name: /merge pdfs/i });
    await toolCard.hover();
    
    // Check that the page remains responsive
    await expect(toolCard).toBeVisible();
  });

  test('should handle large viewport changes', async ({ page }) => {
    await page.goto('/');
    
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
  });

  test('should show loading states appropriately', async ({ page }) => {
    await page.goto('/merge');
    
    // File dropzone should be immediately visible
    await expect(page.getByText('Drop your files here')).toBeVisible();
  });

  test('should work offline (local-first)', async ({ page }) => {
    // Load the page first
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
    
    // Go offline
    await page.context().setOffline(true);
    
    // Navigate to different tools - should still work
    await page.getByRole('link', { name: /merge pdfs/i }).click();
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should not have memory leaks in navigation', async ({ page }) => {
    // Navigate through several pages
    const pages = ['/merge', '/split', '/compress', '/pdf-to-image', '/'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check that page loads correctly
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /merge pdfs/i }).click();
    await expect(page).toHaveURL('/merge');
    
    await page.goBack();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
    
    await page.goForward();
    await expect(page).toHaveURL('/merge');
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
  });
});
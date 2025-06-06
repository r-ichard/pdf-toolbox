import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  const routes = [
    { path: '/', title: 'PDF Toolbox' },
    { path: '/merge', title: 'Merge PDFs' },
    { path: '/split', title: 'Split PDF' },
    { path: '/compress', title: 'Compress PDF' },
    { path: '/pdf-to-image', title: 'PDF to Image' },
    { path: '/image-to-pdf', title: 'Image to PDF' },
    { path: '/rotate', title: 'Rotate PDF' },
    { path: '/organize', title: 'Organize Pages' },
    { path: '/watermark', title: 'Add Watermark' },
    { path: '/password-protect', title: 'Password Protect PDF' },
    { path: '/password-remove', title: 'Remove Password Protection' }
  ];

  for (const route of routes) {
    test(`should navigate to ${route.path} and display correct content`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(route.title);
      
      // Check that the layout is present
      await expect(page.getByRole('banner')).toBeVisible(); // Header
      await expect(page.getByRole('main')).toBeVisible(); // Main content
    });
  }

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements (adjust based on actual implementation)
    await expect(page.getByRole('banner')).toBeVisible();
    
    // Test navigation back to home
    await page.goto('/merge');
    await page.getByRole('link', { name: /pdf toolbox/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page');
    // Depending on React Router setup, this might redirect to home or show 404
    // Adjust expectation based on actual behavior
    expect(response?.status()).toBeLessThan(500);
  });

  test('should maintain responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: 'PDF Toolbox' })).toBeVisible();
    
    // Check that tool cards are visible and properly laid out
    await expect(page.getByRole('link', { name: /merge pdfs/i })).toBeVisible();
  });
});
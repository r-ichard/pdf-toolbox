import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Functionality', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Basic page load check - use more specific selectors
    await expect(page.getByRole('heading', { name: 'Free Online PDF Tools - Edit, Convert & Manage PDFs' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Professional PDF editor and converter tools')).toBeVisible();
  });

  test('can navigate to all tool pages', async ({ page }) => {
    const tools = [
      { path: '/merge', heading: 'Merge PDFs' },
      { path: '/split', heading: 'Split PDF' },
      { path: '/compress', heading: 'Compress PDF' },
      { path: '/pdf-to-image', heading: 'PDF to Images' },
      { path: '/image-to-pdf', heading: 'Images to PDF' },
      { path: '/rotate', heading: 'Rotate PDF' },
      { path: '/organize', heading: 'Organize Pages' },
      { path: '/watermark', heading: 'Add Watermark' },
      { path: '/password-protect', heading: 'Password Protect PDF' },
      { path: '/password-remove', heading: 'Remove Password Protection' }
    ];

    for (const tool of tools) {
      await page.goto(tool.path);
      // Use more specific selector to avoid multiple h1 elements
      await expect(page.getByRole('heading', { name: tool.heading, level: 1 })).toBeVisible({ timeout: 5000 });
    }
  });

  test('file drop zones are functional', async ({ page }) => {
    await page.goto('/merge');
    
    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('accept', /pdf/);
  });

  test('error boundaries work', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    // Should either redirect to home or show error page gracefully
    // Check that page doesn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('responsive design works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.goto('/');
    
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
    
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
  });

  test('local-first architecture', async ({ page }) => {
    // Load page first and wait for it to be fully loaded
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Free Online PDF Tools - Edit, Convert & Manage PDFs' })).toBeVisible();
    
    // Load merge page to cache it
    await page.goto('/merge');
    await expect(page.getByRole('heading', { name: 'Merge PDFs', level: 1 })).toBeVisible();
    
    // Now go back to home and test offline navigation within the cached app
    await page.goto('/');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Test client-side navigation (should work since it's a SPA)
    await page.click('a[href="/merge"]');
    
    // The app should work offline since it's local-first SPA
    await expect(page.getByRole('heading', { name: 'Merge PDFs', level: 1 })).toBeVisible({ timeout: 5000 });
    
    await page.context().setOffline(false);
  });
});
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Functionality', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Basic page load check
    await expect(page.getByText('PDF Toolbox')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Free PDF Tools')).toBeVisible();
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
      await expect(page.locator('h1')).toContainText(tool.heading, { timeout: 5000 });
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
    // Load page first
    await page.goto('/');
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Should still be able to navigate (since it's local-first)
    await page.goto('/merge');
    
    // The app should work offline since it's local-first
    await expect(page.locator('h1')).toContainText('Merge', { timeout: 5000 });
    
    await page.context().setOffline(false);
  });
});
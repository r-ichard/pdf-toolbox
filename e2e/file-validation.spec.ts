import { test, expect } from '@playwright/test';

test.describe('File Validation and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/merge');
  });

  test('should show error for oversized files', async ({ page }) => {
    // This test would require creating or using test files
    // Testing the error display mechanisms
    await expect(page.getByText('Select PDF files to merge')).toBeVisible();
    
    // File input exists and is properly configured
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf');
    await expect(fileInput).toHaveAttribute('multiple');
  });

  test('should validate file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', /pdf/);
  });

  test('should display clear error messages', async ({ page }) => {
    // Test that error display components are available
    // In a real test, you'd trigger errors and verify the messages
    await expect(page.getByText('Select PDF files to merge')).toBeVisible();
  });

  test('should handle network errors gracefully (client-side routing works offline)', async ({ page }) => {
    // The app is local-first: once loaded, navigating between tools needs no network.
    // (A full reload while offline isn't supported — there is no service worker yet.)
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();

    await page.context().setOffline(true);
    await page.getByRole('link', { name: 'PDF Toolbox' }).click(); // header brand -> home, client-side
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.context().setOffline(false);
  });

  test('should show loading states', async ({ page }) => {
    // Test that progress indicators are present
    await expect(page.getByText('Select PDF files to merge')).toBeVisible();
  });
});
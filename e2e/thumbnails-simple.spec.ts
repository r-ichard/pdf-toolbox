import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF Thumbnail Basic Tests', () => {
  const testPdfPath = path.join(__dirname, '..', 'test_files', 'example.pdf');

  test('Can generate thumbnails for split page', async ({ page }) => {
    // Go to home page
    await page.goto('/');
    await expect(page.locator('text=Free PDF Tools')).toBeVisible();

    // Navigate to split page
    await page.locator('a:has-text("Split PDF")').click();
    await expect(page).toHaveURL('/split');

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for file processing - look for the "Change File" button which appears after upload
    await expect(page.locator('button:has-text("Change File")')).toBeVisible({ timeout: 20000 });

    // Select page extraction mode
    await page.locator('input[value="pages"]').click();

    // Wait for thumbnails to appear - look for page grid
    await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 60000 });

    // Check that we have page items
    const pageItems = page.locator('[data-testid="page-item"]');
    await expect(pageItems.first()).toBeVisible();

    // Verify we have at least one page
    const count = await pageItems.count();
    expect(count).toBeGreaterThan(0);

    console.log(`Found ${count} page thumbnails`);
  });

  test('Can generate thumbnails for organize page', async ({ page }) => {
    // Go to home page
    await page.goto('/');
    await expect(page.locator('text=Free PDF Tools')).toBeVisible();

    // Navigate to organize page
    await page.locator('a:has-text("Organize Pages")').click();
    await expect(page).toHaveURL('/organize');

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for file processing
    await expect(page.locator('button:has-text("Change File")')).toBeVisible({ timeout: 20000 });

    // Wait for thumbnails to appear
    await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 60000 });

    // Check that we have page items
    const pageItems = page.locator('[data-testid="page-item"]');
    await expect(pageItems.first()).toBeVisible();

    // Verify we have at least one page
    const count = await pageItems.count();
    expect(count).toBeGreaterThan(0);

    console.log(`Found ${count} page thumbnails`);
  });
});
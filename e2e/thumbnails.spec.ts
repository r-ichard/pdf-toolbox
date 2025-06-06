import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF Thumbnail Functionality', () => {

  const testPdfPath = path.join(__dirname, '..', 'test_files', 'example.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to fully load
    await expect(page.locator('h1:has-text("Free PDF Tools")')).toBeVisible();
  });

  test('Split page shows individual page thumbnails', async ({ page }) => {
    // Navigate to split page by clicking the Split PDF card
    await page.locator('a:has-text("Split PDF")').click();
    await expect(page).toHaveURL('/split');

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for file to be processed and page to show file info
    await expect(page.locator('text=Change File')).toBeVisible({ timeout: 15000 });

    // Click on "Extract specific pages" if not already selected
    await page.locator('input[value="pages"]').click();

    // Wait for thumbnails to load (with longer timeout)
    await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 45000 });

    // Check that individual page thumbnails are displayed
    const pageItems = page.locator('[data-testid="page-item"]');
    await expect(pageItems.first()).toBeVisible();
    
    const pageCount = await pageItems.count();
    expect(pageCount).toBeGreaterThan(0);

    // Verify first few pages have thumbnails
    for (let i = 0; i < Math.min(pageCount, 3); i++) {
      const pageItem = pageItems.nth(i);
      await expect(pageItem).toBeVisible();
      
      // Check that page number is displayed
      await expect(pageItem.locator(`text=Page ${i + 1}`)).toBeVisible();
    }

    // Test basic page selection
    const firstPage = pageItems.first();
    await firstPage.click();
    await expect(firstPage).toHaveClass(/border-primary-500/);
  });

  test('Organize page shows individual page thumbnails', async ({ page }) => {
    // Navigate to organize page by clicking the Organize Pages card
    await page.locator('a:has-text("Organize Pages")').click();
    await expect(page).toHaveURL('/organize');

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for file to be processed and page to show file info
    await expect(page.locator('text=Change File')).toBeVisible({ timeout: 15000 });

    // Wait for thumbnails to load
    await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 45000 });

    // Check that individual page thumbnails are displayed
    const pageItems = page.locator('[data-testid="page-item"]');
    await expect(pageItems.first()).toBeVisible();
    
    const pageCount = await pageItems.count();
    expect(pageCount).toBeGreaterThan(0);

    // Verify first few pages have thumbnails and page info
    for (let i = 0; i < Math.min(pageCount, 3); i++) {
      const pageItem = pageItems.nth(i);
      await expect(pageItem).toBeVisible();
      
      // Check that page number is displayed
      await expect(pageItem.locator(`text=Page ${i + 1}`)).toBeVisible();
      
      // Check that position is displayed
      await expect(pageItem.locator(`text=Position ${i + 1}`)).toBeVisible();
    }

    // Test duplicate functionality on first page
    const firstPage = pageItems.first();
    const duplicateButton = firstPage.locator('[title="Duplicate page"]');
    await duplicateButton.click();

    // Check that page count increased
    const updatedPageItems = page.locator('[data-testid="page-item"]');
    await expect(updatedPageItems).toHaveCount(pageCount + 1);
  });

  test('Basic thumbnail functionality works', async ({ page }) => {
    // Navigate to split page and upload file
    await page.locator('a:has-text("Split PDF")').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for file processing
    await expect(page.locator('text=Change File')).toBeVisible({ timeout: 15000 });

    // Click on pages mode
    await page.locator('input[value="pages"]').click();

    // Wait for thumbnails to load
    await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 45000 });

    // Verify thumbnails are present  
    const pageItems = page.locator('[data-testid="page-item"]');
    await expect(pageItems.first()).toBeVisible();
    
    const pageCount = await pageItems.count();
    expect(pageCount).toBeGreaterThan(0);

    // Check that pages can be selected
    const firstPage = pageItems.first();
    await firstPage.click();
    await expect(firstPage).toHaveClass(/border-primary-500/);
  });
});
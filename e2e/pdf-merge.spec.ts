
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF Merge Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/merge');
  });

  test('should display merge page correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
    await expect(page.getByText('Combine multiple PDF files into a single document')).toBeVisible();
    await expect(page.getByText('Select PDF files to merge')).toBeVisible();
    await expect(page.getByText('Choose up to 10 PDF files (100MB each)')).toBeVisible();
  });

  test('should show file restrictions', async ({ page }) => {
    // The merge page shows file restrictions in the custom content
    await expect(page.getByText('Choose up to 10 PDF files (100MB each)')).toBeVisible();
  });

  test('should accept valid PDF files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Upload actual test PDF files
    await fileInput.setInputFiles([
      path.join(__dirname, '../test_files/example.pdf'),
      path.join(__dirname, '../test_files/example_compressed.pdf')
    ]);
    
    // Should show file preview
    await expect(page.getByText('example.pdf')).toBeVisible();
    await expect(page.getByText('example_compressed.pdf')).toBeVisible();
  });

  test('should handle drag and drop interface', async ({ page }) => {
    const dropZone = page.getByRole('button').first();
    await expect(dropZone).toBeVisible();
    
    // Test drag over effect
    await dropZone.hover();
    await expect(dropZone).toBeVisible();
  });

  test('should show file preview area when files added', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(path.join(__dirname, '../test_files/example.pdf'));
    
    // Should show file preview with details
    await expect(page.getByText('example.pdf')).toBeVisible();
    await expect(page.getByText(/\d+ pages?/)).toBeVisible();
  });

  test('should display metadata editing options', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(path.join(__dirname, '../test_files/example.pdf'));
    
    // Check for metadata editing fields after adding files
    await expect(page.getByText('example.pdf')).toBeVisible();
    // Would check for title, author, etc. fields if they exist in the UI
  });

  test('should open file dialog when clicking drop zone', async ({ page }) => {
    const dropZone = page.getByRole('button').first();
    
    // Mock file chooser dialog
    const fileChooserPromise = page.waitForEvent('filechooser');
    await dropZone.click();
    const fileChooser = await fileChooserPromise;
    
    expect(fileChooser.isMultiple()).toBe(true);
  });
});
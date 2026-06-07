import { test, expect } from '@playwright/test';

test.describe('PDF Toolbox Home Page', () => {
  test('should display all PDF tools', async ({ page }) => {
    await page.goto('/');
    
    // Check page title and description
    await expect(page.getByRole('link', { name: 'PDF Toolbox' })).toBeVisible(); // header brand
    await expect(page.getByText(/Free Online PDF Tools/)).toBeVisible();
    
    // Verify all 10 tools are present (match the actual tool-card names)
    const expectedTools = [
      'Merge PDFs',
      'Split PDF',
      'Compress PDF',
      'PDF to JPG/PNG',
      'Images to PDF',
      'Rotate PDF',
      'Organize PDF Pages',
      'Add PDF Watermark',
      'Password Protect',
      'Remove PDF Password'
    ];
    
    for (const tool of expectedTools) {
      await expect(page.getByRole('link', { name: new RegExp(tool, 'i') }).first()).toBeVisible();
    }
  });

  test('should navigate to merge page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /merge pdfs/i }).first().click();
    await expect(page).toHaveURL('/merge');
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
  });

  test('should have proper privacy messaging', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/privacy/i).first()).toBeVisible();
    await expect(page.getByText(/secure/i).first()).toBeVisible();
  });
});
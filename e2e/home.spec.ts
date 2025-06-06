import { test, expect } from '@playwright/test';

test.describe('PDF Toolbox Home Page', () => {
  test('should display all PDF tools', async ({ page }) => {
    await page.goto('/');
    
    // Check page title and description  
    await expect(page.getByText('PDF Toolbox')).toBeVisible();
    await expect(page.getByText(/Free PDF Tools/)).toBeVisible();
    
    // Verify all 10 tools are present
    const expectedTools = [
      'Merge PDFs',
      'Split PDF', 
      'Compress PDF',
      'PDF to Images',
      'Images to PDF',
      'Rotate PDF',
      'Organize Pages',
      'Add Watermark',
      'Password Protect',
      'Remove Password'
    ];
    
    for (const tool of expectedTools) {
      await expect(page.getByRole('link', { name: new RegExp(tool, 'i') })).toBeVisible();
    }
  });
  
  test('should navigate to merge page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /merge pdfs/i }).click();
    await expect(page).toHaveURL('/merge');
    await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible();
  });

  test('should have proper privacy messaging', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/privacy/i)).toBeVisible();
    await expect(page.getByText(/secure/i)).toBeVisible();
  });
});
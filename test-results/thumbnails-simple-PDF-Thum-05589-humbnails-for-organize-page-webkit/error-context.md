# Test info

- Name: PDF Thumbnail Basic Tests >> Can generate thumbnails for organize page
- Location: /Users/richardraduly/code/pdf-toolbox-web/e2e/thumbnails-simple.spec.ts:40:7

# Error details

```
Error: Timed out 20000ms waiting for expect(locator).toBeVisible()

Locator: locator('button:has-text("Change File")')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 20000ms
  - waiting for locator('button:has-text("Change File")')

    at /Users/richardraduly/code/pdf-toolbox-web/e2e/thumbnails-simple.spec.ts:54:66
```

# Page snapshot

```yaml
- banner:
  - link "PDF Toolbox":
    - /url: /
    - img
    - heading "PDF Toolbox" [level=1]
  - navigation:
    - link "Go to home page":
      - /url: /
      - img
      - text: All Tools
- main:
  - heading "Organize Pages" [level=1]
  - paragraph: Reorder, duplicate, or delete PDF pages with drag and drop.
  - 'button "Drop files here or click to select. Accepted types: .PDF, PDF"':
    - img
    - text: 📄
    - paragraph: Select a PDF file to organize
    - paragraph: Choose a PDF file (up to 100MB)
- contentinfo:
  - img
  - text: All processing happens locally in your browser
  - img
  - text: No files uploaded • No data stored • 100% private
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('PDF Thumbnail Basic Tests', () => {
   5 |   const testPdfPath = path.join(__dirname, '..', 'test_files', 'example.pdf');
   6 |
   7 |   test('Can generate thumbnails for split page', async ({ page }) => {
   8 |     // Go to home page
   9 |     await page.goto('/');
  10 |     await expect(page.locator('text=Free PDF Tools')).toBeVisible();
  11 |
  12 |     // Navigate to split page
  13 |     await page.locator('a:has-text("Split PDF")').click();
  14 |     await expect(page).toHaveURL('/split');
  15 |
  16 |     // Upload a PDF file
  17 |     const fileInput = page.locator('input[type="file"]');
  18 |     await fileInput.setInputFiles(testPdfPath);
  19 |
  20 |     // Wait for file processing - look for the "Change File" button which appears after upload
  21 |     await expect(page.locator('button:has-text("Change File")')).toBeVisible({ timeout: 20000 });
  22 |
  23 |     // Select page extraction mode
  24 |     await page.locator('input[value="pages"]').click();
  25 |
  26 |     // Wait for thumbnails to appear - look for page grid
  27 |     await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 60000 });
  28 |
  29 |     // Check that we have page items
  30 |     const pageItems = page.locator('[data-testid="page-item"]');
  31 |     await expect(pageItems.first()).toBeVisible();
  32 |
  33 |     // Verify we have at least one page
  34 |     const count = await pageItems.count();
  35 |     expect(count).toBeGreaterThan(0);
  36 |
  37 |     console.log(`Found ${count} page thumbnails`);
  38 |   });
  39 |
  40 |   test('Can generate thumbnails for organize page', async ({ page }) => {
  41 |     // Go to home page
  42 |     await page.goto('/');
  43 |     await expect(page.locator('text=Free PDF Tools')).toBeVisible();
  44 |
  45 |     // Navigate to organize page
  46 |     await page.locator('a:has-text("Organize Pages")').click();
  47 |     await expect(page).toHaveURL('/organize');
  48 |
  49 |     // Upload a PDF file
  50 |     const fileInput = page.locator('input[type="file"]');
  51 |     await fileInput.setInputFiles(testPdfPath);
  52 |
  53 |     // Wait for file processing
> 54 |     await expect(page.locator('button:has-text("Change File")')).toBeVisible({ timeout: 20000 });
     |                                                                  ^ Error: Timed out 20000ms waiting for expect(locator).toBeVisible()
  55 |
  56 |     // Wait for thumbnails to appear
  57 |     await expect(page.locator('[data-testid="page-grid"]')).toBeVisible({ timeout: 60000 });
  58 |
  59 |     // Check that we have page items
  60 |     const pageItems = page.locator('[data-testid="page-item"]');
  61 |     await expect(pageItems.first()).toBeVisible();
  62 |
  63 |     // Verify we have at least one page
  64 |     const count = await pageItems.count();
  65 |     expect(count).toBeGreaterThan(0);
  66 |
  67 |     console.log(`Found ${count} page thumbnails`);
  68 |   });
  69 | });
```
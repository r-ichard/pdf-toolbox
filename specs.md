---

# Local-First PDF Toolbox – Product Specification

## **Vision & Principles**

- **All features run in-browser:** No server, no uploads, all documents processed locally for privacy and speed.
- **Beautiful, intuitive UI:** Designed for anyone, with drag-and-drop, guided flows, helpful tooltips, and instant feedback.
- **No account or login:** 100% anonymous, no data leaves the browser.
- **Accessible:** Keyboard navigation, screen-reader friendly, large hit targets.
- **Resilient:** Works offline and on slow connections. Progress is persistent until tab close.
- **Maintainable** Highly maintainable with documentation, high code quality and unit tests.
- **Extensible** The long term vision for this project is to use a RUST built js library that will improve processing speed and memory consumption in browser. So each feature should be able to be easily replacable by a call to the future lib even if nothing exist for now the migration should be easy
---

## **Core Capabilities**

### 1. **PDF Merge**
- Merge up to 10 PDFs (≤100MB each) into a single file.
- Drag-and-drop interface for file selection and order rearrangement.
- Optionally edit metadata (title, author).
- Instant preview of file order.
- “Merge” action with progress bar; download result when done.

### 2. **PDF Split**
- Upload a PDF and define split criteria:
  - By selecting page ranges visually (page thumbnails with checkboxes).
  - Or: “Split every N pages” (simple input).
- Result: Downloadable ZIP of split PDFs.
- Clear preview of what will be split.

### 3. **PDF Compression**
- Select compression level (Low/Medium/High) with clear visual indicators (e.g., “Best Quality”, “Smallest Size”).
- Show estimated size reduction before committing (if feasible).
- Download compressed PDF and show before/after size stats.

### 4. **PDF to Image**
- Convert all or selected pages of a PDF to JPG or PNG.
- Choose resolution: 72, 150, or 300 DPI.
- Visual selection of pages.
- Download ZIP of images, named by page.

### 5. **Image to PDF**
- Drag-and-drop images (JPG, PNG, BMP, TIFF) to create a PDF.
- Arrange image order visually.
- Select page size (A4, Letter, or custom).
- Choose fit/fill/center options with live page previews.
- Set quality (High/Medium/Low).

### 6. **PDF Rotation**
- Select PDF, pick pages (or “all”), choose rotation angle (90°, 180°, 270°).
- Visual, click-to-rotate interface.
- Download rotated PDF.

### 7. **PDF Page Organizer**
- Drag-and-drop pages to reorder, duplicate, or delete.
- Visual thumbnails with multi-select.
- Real-time preview of new document structure.
- Download updated PDF.

### 8. **PDF Watermark**
- Add text or image watermark to chosen pages.
- For text: Set font, size, color, opacity, and position with live preview.
- For image: Drag/drop image, adjust placement and opacity.
- Apply to all or selected pages.

### 9. **PDF Password Protection**
- Add user/owner passwords and set permissions (print, copy, edit, form fill).
- Visual toggle switches for permissions.
- Download protected PDF.

### 10. **PDF Password Removal**
- Open password-protected PDF by entering password.
- Download unprotected PDF.
- Friendly error messages if the password is wrong.

---

## **User Experience & UI**

### **Home Screen**
- Big, clear buttons for each tool (“Merge PDFs”, “Split PDF”, etc.), each with a short description.
- “What do you want to do?” onboarding helper for first-time users.

### **File Handling**
- Drag-and-drop zones everywhere.
- File size/type errors displayed immediately, with tips for resolution.
- No files ever uploaded; everything stays on device.

### **Feedback & Progress**
- Progress bars for all actions.
- Visual previews before actions are committed (thumbnails, watermarks, page order, etc.).
- All actions are undoable before final download.

### **Accessibility**
- Keyboard navigable, ARIA labels for all UI elements.
- Color contrast checked for visibility.
- Tooltips and help icons for all advanced options.

### **Error Handling**
- Human-friendly error messages (not codes).
- Clear guidance for unsupported/corrupt/too-large files.

---

## **Technical Notes**

- **All processing via WebAssembly** (e.g., PDF.js, pdf-lib, or similar) – no backend required.
- **ZIP creation in-browser**, using open-source libraries.
- **No data persistence**: All work and files are ephemeral, erased on tab/browser close.
- **No authentication, no rate limits** (since everything is local).
- **No external analytics or tracking**.

---

## **Testing Requirements**

- **Unit tests** for all core operations, edge cases, and error handling.
- **Manual QA:** Test flows with large, exotic, corrupt, and protected PDFs.
- **Accessibility testing**: Keyboard, screen reader, and color-blind scenarios.

---

## **Help & Support**

- “How it works” section with plain-language guides and GIFs.
- “Contact Support” opens email draft to a privacy-respecting support address (optional).

---

## **Future/Optional**

- PWA support (install to desktop, offline use).
- Local language selection.
- Settings for default output folder, recent files (ephemeral).

---

## **Summary Table**

| Feature                 | Local-First? | Drag & Drop | Visual Preview | Accessible | Download Output | No Login/Cloud |
|-------------------------|:------------:|:-----------:|:--------------:|:----------:|:---------------:|:--------------:|
| Merge PDFs              |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Split PDFs              |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Compress PDFs           |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| PDF to Image            |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Image to PDF            |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Rotate PDFs             |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Organize Pages          |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Watermark PDFs          |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Password Protect PDFs   |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |
| Password Remove PDFs    |      ✔       |      ✔      |       ✔        |     ✔      |       ✔         |       ✔        |

---

**Goal:** Empower everyone to work with PDFs confidently, instantly, and privately—right in their browser. No tech skills needed.
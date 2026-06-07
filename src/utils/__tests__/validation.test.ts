/**
 * Unit tests for validation.ts — previously had ZERO coverage despite being the
 * gatekeeper for every tool. Pure functions, so no library mocks are needed.
 * File-like literals are used (instead of `new File`) because the global File mock
 * in setup.ts hardcodes size=1000, which would defeat size-based assertions.
 */
import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateFiles,
  isPDFFile,
  isImageFile,
  getFileExtension,
  formatFileSize,
  containsSuspiciousPatterns,
  findDuplicateFiles,
  validatePDFStructure,
} from '../validation';

const f = (over: Partial<File> = {}): File =>
  ({ name: 'doc.pdf', size: 1234, type: 'application/pdf', lastModified: 1000, ...over } as unknown as File);

const pdfFromString = (s: string, over: Partial<File> = {}): File => {
  const u8 = new TextEncoder().encode(s);
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  return { name: 'doc.pdf', size: u8.byteLength, type: 'application/pdf', arrayBuffer: async () => ab, ...over } as unknown as File;
};

describe('validateFile', () => {
  it('accepts a normal PDF', () => {
    const r = validateFile(f(), { requirePDF: true, maxSizeBytes: 100 * 1024 * 1024 });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('flags an empty (0-byte) file', () => {
    const r = validateFile(f({ size: 0 }));
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/empty/i);
  });

  it('flags a file over the size limit', () => {
    const r = validateFile(f({ size: 200 * 1024 * 1024 }), { maxSizeBytes: 100 * 1024 * 1024 });
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/exceeds maximum/i);
  });

  it('warns (but does not fail) for large files over 50MB', () => {
    const r = validateFile(f({ size: 60 * 1024 * 1024 }), { maxSizeBytes: 100 * 1024 * 1024 });
    expect(r.isValid).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/longer to process/i);
  });

  it('rejects a non-PDF when requirePDF is set', () => {
    const r = validateFile(f({ name: 'note.txt', type: 'text/plain' }), { requirePDF: true });
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/must be a PDF/i);
  });

  it('enforces allowedTypes', () => {
    const r = validateFile(f({ type: 'text/plain' }), { allowedTypes: ['application/pdf'] });
    expect(r.isValid).toBe(false);
  });

  it('DEFECT: a non-PDF whose name ends in .pdf passes requirePDF (MIME-or-extension, no content sniffing)', () => {
    // isPDFFile returns true on extension alone, so an executable renamed *.pdf slips through validation.
    const r = validateFile(f({ name: 'malware.pdf', type: 'application/octet-stream' }), { requirePDF: true });
    expect(r.isValid).toBe(true);
  });
});

describe('validateFiles', () => {
  it('rejects an empty selection', () => {
    expect(validateFiles([]).isValid).toBe(false);
  });

  it('rejects more files than maxFiles', () => {
    const many = Array.from({ length: 11 }, (_, i) => f({ name: `f${i}.pdf` }));
    const r = validateFiles(many, { maxFiles: 10 });
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/too many files/i);
  });

  it('prefixes per-file errors with the file index and name', () => {
    const r = validateFiles([f({ name: 'empty.pdf', size: 0 })]);
    expect(r.errors[0]).toMatch(/File 1 \(empty\.pdf\)/);
  });

  it('warns about duplicate files', () => {
    const dup = f({ name: 'same.pdf', size: 10, lastModified: 5 });
    const r = validateFiles([dup, f({ name: 'same.pdf', size: 10, lastModified: 5 })]);
    expect(r.warnings.join(' ')).toMatch(/duplicate/i);
  });
});

describe('isPDFFile / isImageFile', () => {
  it('detects PDF by MIME and by extension', () => {
    expect(isPDFFile(f({ type: 'application/pdf', name: 'x.bin' }))).toBe(true);
    expect(isPDFFile(f({ type: '', name: 'x.PDF' }))).toBe(true);
    expect(isPDFFile(f({ type: 'image/png', name: 'x.png' }))).toBe(false);
  });

  it('detects common image types and extensions', () => {
    expect(isImageFile(f({ type: 'image/jpeg', name: 'a.jpg' }))).toBe(true);
    expect(isImageFile(f({ type: '', name: 'a.TIFF' }))).toBe(true);
    expect(isImageFile(f({ type: 'application/pdf', name: 'a.pdf' }))).toBe(false);
  });
});

describe('getFileExtension', () => {
  it('returns the extension including the dot', () => {
    expect(getFileExtension('report.pdf')).toBe('.pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
  });
  it('returns empty string when there is no extension', () => {
    expect(getFileExtension('README')).toBe('');
  });
});

describe('formatFileSize', () => {
  it('formats common sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('safely returns "0 Bytes" for negative / NaN / Infinity instead of "NaN undefined"', () => {
    // Regression guard for the old bug where a negative savedBytes rendered "NaN undefined".
    expect(formatFileSize(-20043)).toBe('0 Bytes');
    expect(formatFileSize(NaN)).toBe('0 Bytes');
    expect(formatFileSize(Infinity)).toBe('0 Bytes');
  });
});

describe('containsSuspiciousPatterns', () => {
  it('flags Windows-reserved characters and control characters', () => {
    expect(containsSuspiciousPatterns('in<valid>.pdf')).toBe(true);
    expect(containsSuspiciousPatterns('double  space.pdf')).toBe(true);
  });

  it('does not flag a normal filename', () => {
    expect(containsSuspiciousPatterns('Quarterly Report 2026.pdf')).toBe(false);
  });

  it('DEFECT: the Windows-reserved-NAME guard is anchored to the whole string, so real files (with extensions) never match', () => {
    expect(containsSuspiciousPatterns('CON')).toBe(true); // bare name matches
    expect(containsSuspiciousPatterns('CON.pdf')).toBe(false); // but an actual uploaded "CON.pdf" slips past
  });
});

describe('findDuplicateFiles', () => {
  it('identifies duplicates by name+size+lastModified', () => {
    const a = f({ name: 'a.pdf', size: 1, lastModified: 1 });
    const b = f({ name: 'a.pdf', size: 1, lastModified: 1 });
    const c = f({ name: 'a.pdf', size: 2, lastModified: 1 }); // different size -> not a dup
    expect(findDuplicateFiles([a, b, c])).toEqual(['a.pdf']);
  });
});

describe('validatePDFStructure', () => {
  it('accepts a well-formed PDF byte stream', async () => {
    const body = '%PDF-1.7\n' + 'x'.repeat(200) + '\nxref\n/Root\n%%EOF';
    const r = await validatePDFStructure(pdfFromString(body));
    expect(r.isValid).toBe(true);
  });

  it('rejects a file without a %PDF header', async () => {
    const r = await validatePDFStructure(pdfFromString('this is not a pdf at all, just text padding'.repeat(5)));
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/invalid pdf header/i);
  });

  it('rejects a file that is too small to be a valid PDF', async () => {
    const r = await validatePDFStructure(pdfFromString('%PDF-1.4'));
    expect(r.isValid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/too small/i);
  });

  it('warns when the EOF marker is missing', async () => {
    const body = '%PDF-1.7\n' + 'x'.repeat(200) + '\nxref\n/Root\n';
    const r = await validatePDFStructure(pdfFromString(body));
    expect(r.warnings.join(' ')).toMatch(/truncated|EOF/i);
  });
});

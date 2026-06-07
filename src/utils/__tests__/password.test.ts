/**
 * Wiring tests for the password tools: confirms pdfUtils delegates to the qpdf engine
 * with the right bytes/options and surfaces the result. The qpdf wasm engine is mocked
 * (its real behavior is verified separately), so these run fast and deterministically.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: '4.10.38',
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

const encryptPDF = vi.fn(async () => new Uint8Array([1, 2, 3]));
const decryptPDF = vi.fn(async () => new Uint8Array([4, 5, 6]));
vi.mock('../qpdf', () => ({
  encryptPDF: (...args: unknown[]) => encryptPDF(...(args as [])),
  decryptPDF: (...args: unknown[]) => decryptPDF(...(args as [])),
}));

import { addPasswordToPDF, removePasswordFromPDF } from '../pdfUtils';

function fileFromBytes(bytes: Uint8Array, name = 'doc.pdf'): File {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return { name, type: 'application/pdf', size: bytes.byteLength, arrayBuffer: async () => ab } as unknown as File;
}

describe('addPasswordToPDF', () => {
  beforeEach(() => {
    encryptPDF.mockClear();
    decryptPDF.mockClear();
  });

  it('encrypts the file bytes with the chosen permissions and returns the engine output', async () => {
    const onProgress = vi.fn();
    const out = await addPasswordToPDF(fileFromBytes(new Uint8Array([9, 9, 9])), {
      userPassword: 'pw',
      permissions: { printing: false },
      onProgress,
    });

    expect(Array.from(out)).toEqual([1, 2, 3]);
    expect(encryptPDF).toHaveBeenCalledTimes(1);
    const [bytesArg, optsArg] = encryptPDF.mock.calls[0] as unknown as [Uint8Array, any];
    expect(Array.from(bytesArg)).toEqual([9, 9, 9]);
    expect(optsArg).toMatchObject({ userPassword: 'pw', permissions: { printing: false } });
    expect(onProgress).toHaveBeenCalledWith(100, 'Complete!');
  });

  it('rejects (without invoking the engine) when no password is supplied', async () => {
    await expect(addPasswordToPDF(fileFromBytes(new Uint8Array([1])), {})).rejects.toThrow(/at least one password/i);
    expect(encryptPDF).not.toHaveBeenCalled();
  });
});

describe('removePasswordFromPDF', () => {
  beforeEach(() => {
    encryptPDF.mockClear();
    decryptPDF.mockClear();
  });

  it('decrypts using the supplied password and returns the engine output', async () => {
    const out = await removePasswordFromPDF(fileFromBytes(new Uint8Array([7, 7])), { password: 'pw' });
    expect(Array.from(out)).toEqual([4, 5, 6]);
    expect(decryptPDF).toHaveBeenCalledTimes(1);
    const [bytesArg, pwArg] = decryptPDF.mock.calls[0] as unknown as [Uint8Array, string];
    expect(Array.from(bytesArg)).toEqual([7, 7]);
    expect(pwArg).toBe('pw');
  });

  it('passes an empty string when no password is given (qpdf handles unencrypted input)', async () => {
    await removePasswordFromPDF(fileFromBytes(new Uint8Array([1])), {});
    expect(decryptPDF).toHaveBeenCalledWith(expect.anything(), '');
  });
});

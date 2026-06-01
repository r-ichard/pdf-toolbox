/**
 * Pure-logic tests for the qpdf CLI argument builders. These need no WebAssembly
 * (importing qpdf.ts has no side effects — the wasm module is only loaded inside
 * encrypt/decrypt). The real encrypt→decrypt round-trip is verified out-of-band against
 * the actual qpdf-wasm binary; here we lock the command construction.
 */
import { describe, it, expect } from 'vitest';
import { buildEncryptArgs, buildDecryptArgs } from '../qpdf';

describe('buildEncryptArgs', () => {
  it('uses 256-bit AES and grants all permissions by default; owner falls back to user password', () => {
    const args = buildEncryptArgs({ userPassword: 'u' });
    expect(args.slice(0, 4)).toEqual(['--encrypt', 'u', 'u', '256']);
    expect(args).toEqual(expect.arrayContaining(['--print=full', '--modify=all', '--extract=y', '--annotate=y']));
  });

  it('maps each denied permission to the correct qpdf restriction flag', () => {
    const args = buildEncryptArgs({
      userPassword: 'u',
      ownerPassword: 'o',
      permissions: { printing: false, modifying: false, copying: false, annotating: false },
    });
    expect(args.slice(0, 4)).toEqual(['--encrypt', 'u', 'o', '256']);
    expect(args).toEqual(expect.arrayContaining(['--print=none', '--modify=none', '--extract=n', '--annotate=n']));
  });
});

describe('buildDecryptArgs', () => {
  it('passes the supplied password and --decrypt', () => {
    expect(buildDecryptArgs('secret')).toEqual(['--password=secret', '--decrypt']);
  });

  it('omits --password when none is given', () => {
    expect(buildDecryptArgs('')).toEqual(['--decrypt']);
  });
});

/**
 * Thin wrapper around qpdf compiled to WebAssembly.
 *
 * Everything here runs ENTIRELY in the browser — the PDF bytes are written into the
 * wasm module's in-memory filesystem, processed, and read back; nothing is uploaded.
 * The module (~1.3MB wasm) is loaded with a dynamic import so it is code-split into its
 * own chunk and only fetched (from our own origin) the first time a user actually uses
 * the password tools.
 *
 * This is the single integration point for PDF encryption, matching the project's goal
 * of being able to swap the engine later (e.g. for a Rust/wasm lib) without touching the
 * feature pages.
 */

export interface EncryptOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
}

const INPUT = 'input.pdf';
const OUTPUT = 'output.pdf';

interface LoadedQpdf {
  // qpdf's emscripten module — typed loosely because its shipped types only cover a subset.
  instance: { callMain: (args: string[]) => number; FS: { writeFile: (p: string, d: Uint8Array) => void; readFile: (p: string) => Uint8Array } };
  stderr: string[];
}

async function loadQpdf(): Promise<LoadedQpdf> {
  const [mod, wasm] = await Promise.all([
    import('@neslinesli93/qpdf-wasm'),
    import('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'),
  ]);
  const createQpdfModule = (mod as { default: unknown }).default as (opts: unknown) => Promise<LoadedQpdf['instance']>;
  const wasmUrl = (wasm as { default: string }).default;

  const stderr: string[] = [];
  const instance = await createQpdfModule({
    locateFile: () => wasmUrl,
    print: () => {},
    printErr: (line: string) => stderr.push(line),
  });
  return { instance, stderr };
}

// Run qpdf's main(). Emscripten builds either return the exit code or throw an ExitStatus;
// normalize both to a numeric code.
function runMain(instance: LoadedQpdf['instance'], args: string[]): number {
  try {
    return instance.callMain(args);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    if (typeof status === 'number') return status;
    throw e;
  }
}

/** Build qpdf CLI args for 256-bit AES encryption with the requested permissions. */
export function buildEncryptArgs(options: EncryptOptions): string[] {
  const user = options.userPassword ?? '';
  // A document owner password is required for the permission restrictions to be enforceable;
  // fall back to the user password when only one was supplied.
  const owner = options.ownerPassword || options.userPassword || '';
  const p = options.permissions ?? {};
  return [
    '--encrypt', user, owner, '256',
    `--print=${p.printing === false ? 'none' : 'full'}`,
    `--modify=${p.modifying === false ? 'none' : 'all'}`,
    `--extract=${p.copying === false ? 'n' : 'y'}`,
    `--annotate=${p.annotating === false ? 'n' : 'y'}`,
  ];
}

export function buildDecryptArgs(password: string): string[] {
  const args = ['--decrypt'];
  if (password) args.unshift(`--password=${password}`);
  return args;
}

export async function encryptPDF(bytes: Uint8Array, options: EncryptOptions): Promise<Uint8Array> {
  if (!options.userPassword && !options.ownerPassword) {
    throw new Error('Please provide at least one password.');
  }
  const { instance, stderr } = await loadQpdf();
  instance.FS.writeFile(INPUT, bytes);
  const code = runMain(instance, [...buildEncryptArgs(options), '--', INPUT, OUTPUT]);
  if (code !== 0 && code !== 3) {
    // exit 3 = warnings (output still produced); anything else is a real failure.
    throw new Error(stderr.join(' ').trim() || `Could not protect the PDF (qpdf exit ${code}).`);
  }
  return instance.FS.readFile(OUTPUT);
}

export async function decryptPDF(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const { instance, stderr } = await loadQpdf();
  instance.FS.writeFile(INPUT, bytes);
  const code = runMain(instance, [...buildDecryptArgs(password), INPUT, OUTPUT]);
  if (code !== 0 && code !== 3) {
    const msg = stderr.join(' ').toLowerCase();
    if (msg.includes('invalid password') || msg.includes('password')) {
      throw new Error('Incorrect password. Please double-check it and try again.');
    }
    throw new Error(stderr.join(' ').trim() || `Could not remove the password (qpdf exit ${code}).`);
  }
  return instance.FS.readFile(OUTPUT);
}

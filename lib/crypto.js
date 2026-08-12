import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KEY_FILE = join(__dirname, '..', 'data', 'master.key');
const KEY_FILE = process.env.MASTER_KEY_FILE || DEFAULT_KEY_FILE;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

let cachedKey = null;

// The master key never enters the SQLite database — it lives in its own file
// (outside the repo, data/ is gitignored) with owner-only permissions, so a
// leaked db copy or backup is useless without it.
function loadOrCreateMasterKey() {
  if (cachedKey) return cachedKey;

  if (existsSync(KEY_FILE)) {
    cachedKey = readFileSync(KEY_FILE);
    if (cachedKey.length !== 32) {
      throw new Error(`Master key file ${KEY_FILE} is corrupt (expected 32 bytes, got ${cachedKey.length})`);
    }
    return cachedKey;
  }

  mkdirSync(dirname(KEY_FILE), { recursive: true });
  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key, { mode: 0o600 });
  try {
    chmodSync(KEY_FILE, 0o600);
  } catch {
    // best-effort on platforms without POSIX permission bits (e.g. Windows)
  }
  cachedKey = key;
  return cachedKey;
}

export function encrypt(plaintext) {
  const key = loadOrCreateMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(payload) {
  const key = loadOrCreateMasterKey();
  const raw = Buffer.from(payload, 'base64');

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

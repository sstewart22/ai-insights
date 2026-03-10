import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
let CACHED_KEY: Buffer | null = null;

function getKey(): Buffer {
  if (CACHED_KEY) return CACHED_KEY;

  const keyB64 = process.env.TFA_ENC_KEY_BASE64;
  if (!keyB64) {
    throw new Error('Missing env var TFA_ENC_KEY_BASE64 (base64 of 32 bytes).');
  }

  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `TFA_ENC_KEY_BASE64 must decode to 32 bytes, got ${key.length}.`,
    );
  }

  CACHED_KEY = key;
  return key;
}

export function encryptSecret(plain: string) {
  const KEY = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(encB64: string) {
  const KEY = getKey();
  const data = Buffer.from(encB64, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const enc = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}

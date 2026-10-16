import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM for access tokens at rest.
 * Output format: base64(iv).base64(authTag).base64(ciphertext)
 */

function keyFromHex(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes in hex (openssl rand -hex 32)");
  return key;
}

export function encrypt(plaintext: string, hexKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromHex(hexKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string, hexKey: string): string {
  const [iv, tag, ciphertext] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !ciphertext) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", keyFromHex(hexKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

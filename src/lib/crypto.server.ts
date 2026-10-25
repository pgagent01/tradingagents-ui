// Server-only AES-GCM helpers for stored user API keys.
// The passphrase lives in the API_KEY_ENCRYPTION_SECRET secret, never in code.

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string | undefined): Promise<CryptoKey> {
  if (!secret) throw new Error("API_KEY_ENCRYPTION_SECRET is not configured on this server.");
  const material = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Returns "v1.<base64(iv||ciphertext)>" — safe to persist. */
export async function encryptSecret(plaintext: string, secret: string | undefined): Promise<string> {
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const out = new Uint8Array(iv.byteLength + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), iv.byteLength);
  return `v1.${toBase64(out)}`;
}

export async function decryptSecret(payload: string, secret: string | undefined): Promise<string> {
  const [version, body] = payload.split(".");
  if (version !== "v1" || !body) throw new Error("Stored key is in an unsupported format.");
  const raw = fromBase64(body);
  const key = await getKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: raw.slice(0, 12) },
    key,
    raw.slice(12),
  );
  return new TextDecoder().decode(plain);
}

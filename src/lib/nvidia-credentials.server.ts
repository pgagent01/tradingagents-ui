import { decryptSecret, encryptSecret } from '@/lib/crypto.server';

export type NvidiaCredentials = { version: 1; active: number; keys: string[] };
export async function openNvidiaCredentials(ciphertext: string, encryption: string | undefined): Promise<NvidiaCredentials> {
  const plaintext = await decryptSecret(ciphertext, encryption);
  if (!plaintext.startsWith('{')) return { version: 1, active: 0, keys: [plaintext] };
  const pool = JSON.parse(plaintext) as NvidiaCredentials;
  if (pool.version !== 1 || !Array.isArray(pool.keys) || pool.keys.length < 1 || pool.keys.length > 3 || pool.keys.some(k => typeof k !== 'string' || !k.trim()) || !Number.isInteger(pool.active) || !pool.keys[pool.active]) throw new Error('Stored NVIDIA credentials are invalid. Save them again.');
  return pool;
}
export function sealNvidiaCredentials(pool: NvidiaCredentials, encryption: string | undefined) {
  return encryptSecret(JSON.stringify(pool), encryption);
}

export function activeNvidiaKey(pool: NvidiaCredentials) {
  const key = pool.keys[pool.active];
  if (!key) throw new Error('Select a configured NVIDIA key.');
  return key;
}
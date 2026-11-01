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

export function changeNvidiaCredentials(pool: NvidiaCredentials, input: { apiKey?: string; active?: number; replaceSlot?: number }): NvidiaCredentials {
  const updated: NvidiaCredentials = { version: 1, active: pool.active, keys: [...pool.keys] };
  if (input.apiKey !== undefined) {
    const key = input.apiKey.trim();
    if (!key.startsWith('nvapi-') || key.length < 8) throw new Error('Enter a NVIDIA API key.');
    if (updated.keys.some((existing, slot) => existing === key && slot !== input.replaceSlot)) throw new Error('That key is already configured.');
    if (input.replaceSlot !== undefined) {
      if (!Number.isInteger(input.replaceSlot) || !updated.keys[input.replaceSlot]) throw new Error('Select a configured key to replace.');
      updated.keys[input.replaceSlot] = key;
    } else {
      if (updated.keys.length >= 3) throw new Error('Three NVIDIA keys are already configured.');
      updated.keys.push(key);
    }
  } else if (input.replaceSlot !== undefined) throw new Error('Enter a replacement key.');
  if (input.active !== undefined) updated.active = input.active;
  if (!Number.isInteger(updated.active) || !updated.keys[updated.active]) throw new Error('Select a configured key.');
  return updated;
}
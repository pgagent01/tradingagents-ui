import {describe,it,expect} from 'vitest';
import {encryptSecret,decryptSecret} from '@/lib/crypto.server';
describe('AES-GCM key storage',()=>{
  it('encrypts FMP credentials with distinct IVs and never returns a key-derived hint',async()=>{
    const {maskKey,normalizeCredentialProvider,normalizeProvider}=await import('@/lib/access-rules');
    const key='synthetic-fmp-test-only';
    const a=await encryptSecret(key,'test-only-encryption-material'),b=await encryptSecret(key,'test-only-encryption-material');
    expect(a).not.toBe(b);expect(a).not.toContain(key);expect(await decryptSecret(a,'test-only-encryption-material')).toBe(key);
    expect(maskKey(key)).toBe('•••••••• (configured)');expect(normalizeCredentialProvider('FMP')).toBe('fmp');expect(()=>normalizeProvider('fmp')).toThrow();
  });
  it('roundtrips only with the encryption material',async()=>{
    const ciphertext=await encryptSecret('synthetic-test-credential','test-only-encryption-material');
    expect(ciphertext).not.toContain('synthetic-test-credential');
    expect(await decryptSecret(ciphertext,'test-only-encryption-material')).toBe('synthetic-test-credential');
    await expect(decryptSecret(ciphertext,'different-test-material')).rejects.toThrow();
  });
  it('authenticates modified ciphertext',async()=>{
    const ciphertext=await encryptSecret('synthetic-test-credential','test-only-encryption-material');
    const raw=Uint8Array.from(atob(ciphertext.slice(3)),c=>c.charCodeAt(0));raw[raw.length-1]=(raw[raw.length-1]??0)^1;
    await expect(decryptSecret(`v1.${btoa(String.fromCharCode(...raw))}`,'test-only-encryption-material')).rejects.toThrow();
  });
});
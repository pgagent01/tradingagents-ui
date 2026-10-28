// Pure access rules shared by the server functions and the UI, so the shipped
// guards are the same ones the tests exercise.

export const PROVIDERS = ["openai", "anthropic", "google", "groq", "openrouter", "xai", "deepseek", "nvidia"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const DATA_PROVIDERS = ['fred','fmp'] as const;
export type CredentialProvider = Provider | (typeof DATA_PROVIDERS)[number];
export function normalizeCredentialProvider(input: string): CredentialProvider {
  const data=DATA_PROVIDERS.find(p=>p===input.trim().toLowerCase());
  return data??normalizeProvider(input);
}

export function normalizeProvider(input: string): Provider {
  const p = input.trim().toLowerCase();
  const found = PROVIDERS.find((x) => x === p);
  if (!found) throw new Error(`Unsupported provider: ${input}`);
  return found;
}

/** Never returns the key itself — only a short display hint. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "••••";
  return "•••••••• (configured)";
}

export function validateTicker(input: string): string {
  const t = input.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)) throw new Error("Enter a valid ticker symbol (e.g. NVDA).");
  return t;
}

/**
 * Every account — including the primary admin — must run research with a key it
 * stored itself. There is no exemption path, so one account can never spend
 * another account's LLM credentials.
 */
export function assertCanRunResearch(opts: { hasOwnApiKey: boolean; provider: Provider }): void {
  if (!opts.hasOwnApiKey) {
    throw new Error(
      `Add your own ${opts.provider} API key in Settings before running research. Keys are never shared between accounts.`,
    );
  }
}

export function isInviteCodeFormat(input: string): boolean {
  return /^TA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(input.trim().toUpperCase());
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `TA-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

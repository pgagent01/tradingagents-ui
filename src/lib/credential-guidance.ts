import { DATA_PROVIDERS } from '@/lib/access-rules';

export const CREDENTIAL_HELP: Record<string, { name: string; url: string }> = {
  openai: { name: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
  anthropic: { name: 'Anthropic', url: 'https://console.anthropic.com/settings/keys' },
  google: { name: 'Google AI Studio', url: 'https://aistudio.google.com/apikey' },
  groq: { name: 'Groq', url: 'https://console.groq.com/keys' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/settings/keys' },
  xai: { name: 'xAI', url: 'https://console.x.ai' },
  deepseek: { name: 'DeepSeek', url: 'https://platform.deepseek.com/api_keys' },
  nvidia: { name: 'NVIDIA NIM', url: 'https://build.nvidia.com' },
  fred: { name: 'FRED', url: 'https://fred.stlouisfed.org/docs/api/api_key.html' },
  fmp: { name: 'Financial Modeling Prep', url: 'https://financialmodelingprep.com/developer/docs' },
};

/** Data keys enrich evidence but never block execution; synthesis needs its own provider key too. */
export function missingResearchProviders(selected: string[], saved: string[], demo: boolean): string[] {
  if (demo) return [];
  const available = new Set(saved);
  return [...new Set(selected)].filter(p => p !== 'lovable' && !DATA_PROVIDERS.some(d => d === p) && !available.has(p));
}
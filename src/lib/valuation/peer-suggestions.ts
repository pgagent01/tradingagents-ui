import { validTicker } from '@/lib/stock-data';
/** Only an explicit bounded marker is accepted; prose ticker mentions are not candidates. */
export function peerSuggestionPrompt(enabled: boolean): string {
  return enabled ? '\nComparable discovery is insufficient. Using your knowledge of this company, suggest up to 8 listed same-industry peer tickers for independent verification; do not invent their financials. End with one line PEER_CANDIDATES: ["TICKER", "TICKER"]. Suggestions are unverified, not a valuation cohort. Return an empty array when uncertain.' : '';
}
export function parsePeerSuggestions(text: string, subject: string): string[] {
  const line = text.match(/^PEER_CANDIDATES:\s*(\[[^\r\n]{0,500}\])\s*$/m)?.[1];
  if (!line) return [];
  try {
    const values: unknown = JSON.parse(line);
    return Array.isArray(values) ? [...new Set(values.filter((v): v is string => typeof v === 'string' && validTicker(v) && v !== subject))].slice(0, 8) : [];
  } catch { return []; }
}
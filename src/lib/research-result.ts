import { z } from 'zod';

// Shared by both structured-output and JSON-only synthesis providers.
export const resultSchema = z.object({
  recommendation: z.enum(['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL']),
  price_target: z.number().nullable(),
  conviction_score: z.number(),
  risk_level: z.enum(['Low', 'Moderate', 'High', 'Very High']),
  executive_summary: z.string(),
  fundamental_analysis: z.string(),
  technical_analysis: z.string(),
  sentiment_news: z.string(),
  risk_debate: z.string(),
  catalysts: z.array(z.string()),
  upside_risks: z.array(z.string()),
  downside_risks: z.array(z.string()),
  financial_snapshot: z.array(z.object({ metric: z.string(), value: z.string() })),
  final_synthesis: z.string(),
});

export type ResearchResult = z.infer<typeof resultSchema>;
const RECS = ['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'] as const;
const RISKS: Record<string, (typeof resultSchema.shape.risk_level.options)[number]> = { low: 'Low', moderate: 'Moderate', medium: 'Moderate', high: 'High', 'very high': 'Very High' };
const num = (v: unknown) => { if (typeof v === 'number') return Number.isFinite(v) ? v : null; if (typeof v === 'string') { const n = Number(v.replace(/[$,%\s]/g, '')); return v.trim() && Number.isFinite(n) ? n : null; } return null; };
const str = (v: unknown) => typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join('\n') : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
const list = (v: unknown) => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : str(x)).filter(Boolean) : typeof v === 'string' && v.trim() ? [v] : [];

/** Escapes raw control characters inside JSON strings (models often emit literal newlines). */
function escapeControlChars(src: string): string {
  let out = '', inStr = false, esc = false;
  for (const ch of src) {
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === '\\') { esc = true; out += ch; continue; }
      if (ch === '"') inStr = false;
      else if (ch === '\n') { out += '\\n'; continue; }
      else if (ch === '\r') { out += '\\r'; continue; }
      else if (ch === '\t') { out += '\\t'; continue; }
    } else if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

/** Balanced top-level {...} spans, ignoring braces inside strings. */
function objectSpans(src: string): string[] {
  const spans: string[] = []; let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { if (depth > 0) inStr = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}' && depth > 0) { depth--; if (depth === 0) spans.push(src.slice(start, i + 1)); }
  }
  return spans;
}

export class ReportFormatError extends Error { constructor(public reason: 'no_json' | 'truncated' | 'malformed') { super(reason); } }

/** Finds the report object among reasoning text, fences and stray braces; prefers objects carrying a recommendation. */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').replace(/```(?:json)?/gi, '');
  const spans = objectSpans(escapeControlChars(cleaned));
  const parsed: unknown[] = [];
  for (const span of spans) { try { parsed.push(JSON.parse(span)); } catch { /* try next */ } }
  const has = (v: unknown) => !!v && typeof v === 'object' && ('recommendation' in v || ('report' in v && !!(v as { report?: unknown }).report));
  const best = [...parsed].reverse().find(has) ?? parsed.at(-1);
  if (best !== undefined) return best;
  if (cleaned.indexOf('{') < 0) throw new ReportFormatError('no_json');
  throw new ReportFormatError(spans.length === 0 ? 'truncated' : 'malformed');
}

/** Extracts and normalizes JSON-only model output; still rejects missing/invalid ratings. */
export function parseResearchJson(text: string): ResearchResult {
  const raw = extractJsonObject(text);
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.report && typeof raw.report === 'object' ? raw.report : raw) as Partial<Record<keyof ResearchResult, unknown>>;
  const rec = str(o.recommendation).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const conviction = num(o.conviction_score);
  const snapshot = Array.isArray(o.financial_snapshot) ? o.financial_snapshot.map(r => r && typeof r === 'object' ? { metric: str((r as { metric?: unknown }).metric), value: str((r as { value?: unknown }).value) } : null).filter((r): r is { metric: string; value: string } => !!r && !!r.metric) : o.financial_snapshot && typeof o.financial_snapshot === 'object' ? Object.entries(o.financial_snapshot).map(([metric, value]) => ({ metric, value: str(value) })) : [];
  return resultSchema.parse({
    recommendation: (RECS as readonly string[]).includes(rec) ? rec : o.recommendation,
    price_target: num(o.price_target),
    conviction_score: conviction === null ? o.conviction_score : Math.round(Math.min(100, Math.max(0, conviction))),
    risk_level: RISKS[str(o.risk_level).toLowerCase().trim()] ?? o.risk_level,
    executive_summary: str(o.executive_summary), fundamental_analysis: str(o.fundamental_analysis), technical_analysis: str(o.technical_analysis), sentiment_news: str(o.sentiment_news), risk_debate: str(o.risk_debate), final_synthesis: str(o.final_synthesis),
    catalysts: list(o.catalysts), upside_risks: list(o.upside_risks), downside_risks: list(o.downside_risks), financial_snapshot: snapshot,
  });
}

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

/** Extracts and normalizes JSON-only model output; still rejects missing/invalid ratings. */
export function parseResearchJson(text: string): ResearchResult {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object');
  const raw = JSON.parse(cleaned.slice(start, end + 1));
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.report && typeof raw.report === 'object' ? raw.report : raw) as Record<string, unknown>;
  const rec = str(o.recommendation).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const conviction = num(o.conviction_score);
  const snapshot = Array.isArray(o.financial_snapshot) ? o.financial_snapshot.map(r => r && typeof r === 'object' ? { metric: str((r as Record<string, unknown>).metric), value: str((r as Record<string, unknown>).value) } : null).filter((r): r is { metric: string; value: string } => !!r && !!r.metric) : o.financial_snapshot && typeof o.financial_snapshot === 'object' ? Object.entries(o.financial_snapshot).map(([metric, value]) => ({ metric, value: str(value) })) : [];
  return resultSchema.parse({
    recommendation: (RECS as readonly string[]).includes(rec) ? rec : o.recommendation,
    price_target: num(o.price_target),
    conviction_score: conviction === null ? o.conviction_score : Math.round(Math.min(100, Math.max(0, conviction))),
    risk_level: RISKS[str(o.risk_level).toLowerCase().trim()] ?? o.risk_level,
    executive_summary: str(o.executive_summary), fundamental_analysis: str(o.fundamental_analysis), technical_analysis: str(o.technical_analysis), sentiment_news: str(o.sentiment_news), risk_debate: str(o.risk_debate), final_synthesis: str(o.final_synthesis),
    catalysts: list(o.catalysts), upside_risks: list(o.upside_risks), downside_risks: list(o.downside_risks), financial_snapshot: snapshot,
  });
}

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
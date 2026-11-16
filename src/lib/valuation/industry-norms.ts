import snapshot from '@/data/damodaran-2026-01.json';
/** Dated Damodaran US industry averages mapped from SEC SIC codes by the plurality of US firms in each SIC. Norms are context and fade targets, never reported company figures. */
export type IndustryNorm = { industry: string; sic: string; mappingShare: number; firms: number; operatingMargin: number; netMargin: number; roe: number | null; beta: number | null; costOfEquity: number | null; costOfCapital: number | null; source: string; url: string; effectiveDate: string };
type Row = { firms: number; operatingMargin: number; netMargin: number; roe?: number; beta?: number; costOfEquity?: number; costOfCapital?: number };
const data = snapshot as unknown as { source: string; url: string; effectiveDate: string; industries: Record<string, Row>; sicMap: Record<string, [string, number]> };
export const INDUSTRY_NORMS_DATE = data.effectiveDate;
/** Returns null when the SIC is unmapped or the snapshot postdates the analysis date (no look-ahead). */
export function industryNorm(sic: string | null | undefined, analysisDate: string): IndustryNorm | null {
  if (!sic || !/^\d{4}$/.test(sic) || analysisDate < data.effectiveDate) return null;
  const m = data.sicMap[String(Number(sic))]; if (!m) return null;
  const r = data.industries[m[0]]; if (!r) return null;
  return { industry: m[0], sic, mappingShare: m[1], firms: r.firms, operatingMargin: r.operatingMargin, netMargin: r.netMargin, roe: r.roe ?? null, beta: r.beta ?? null, costOfEquity: r.costOfEquity ?? null, costOfCapital: r.costOfCapital ?? null, source: data.source, url: data.url, effectiveDate: data.effectiveDate };
}
/** Half-way convergence from the current margin toward the industry norm by year 5; bull keeps the better of the two, bear the worse. */
export function marginTargets(current: number, norm: IndustryNorm | null): { base: number; bear: number; bull: number; label: string } | null {
  if (!norm || !Number.isFinite(current) || current <= 0 || norm.operatingMargin <= 0) return null;
  const n = norm.operatingMargin;
  return { base: current + (n - current) / 2, bear: Math.min(current, n), bull: Math.max(current, n), label: `operating margin fades from ${(current * 100).toFixed(1)}% half-way toward the ${norm.industry} norm ${(n * 100).toFixed(1)}% by year 5 (Damodaran ${norm.effectiveDate}, ${norm.firms} US firms)` };
}
/** Flags assumptions outside a reasonable band around the industry norm. */
export function normFlags(i: { margin: number; discountRate: number | null; norm: IndustryNorm | null }): string[] {
  const n = i.norm; if (!n) return [];
  const out: string[] = [];
  if (i.margin > n.operatingMargin * 2 + .05) out.push(`Current operating margin ${(i.margin * 100).toFixed(1)}% is far above the ${n.industry} norm ${(n.operatingMargin * 100).toFixed(1)}%; check for one-off gains or a business-model mismatch with the SIC mapping.`);
  if (i.margin < n.operatingMargin / 2 && n.operatingMargin > .04) out.push(`Current operating margin ${(i.margin * 100).toFixed(1)}% is less than half the ${n.industry} norm ${(n.operatingMargin * 100).toFixed(1)}%.`);
  if (i.discountRate !== null && n.costOfCapital !== null && Math.abs(i.discountRate - n.costOfCapital) > .03) out.push(`Discount rate ${(i.discountRate * 100).toFixed(2)}% differs from the ${n.industry} cost of capital ${(n.costOfCapital * 100).toFixed(2)}% by more than 3 points.`);
  if (n.mappingShare < .5) out.push(`SIC ${n.sic} maps to ${n.industry} for only ${(n.mappingShare * 100).toFixed(0)}% of US firms; treat the norm as approximate.`);
  return out;
}

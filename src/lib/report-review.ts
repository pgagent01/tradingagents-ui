/** Deterministic final review of a synthesized report (no AI call). Severe failures withhold the target. */
export type ReviewCheck = { id: string; passed: boolean; severe: boolean; message: string };
export function reviewReport(i: { rating: string | null; conviction: number | null; target: number | null; calculatedTarget: number | null; scenarioRange: { low: number; high: number } | null; text: string; citedFirms: string[]; evidenceFirms: string[]; sections: Record<string, unknown> }) {
  const checks: ReviewCheck[] = [];
  const add = (id: string, passed: boolean, severe: boolean, message: string) => checks.push({ id, passed, severe, message });
  add('rating', ['BUY', 'HOLD', 'SELL'].includes((i.rating ?? '').toUpperCase()), true, 'Rating is BUY, HOLD or SELL.');
  add('conviction', i.conviction === null || (i.conviction >= 0 && i.conviction <= 100), false, 'Conviction is within 0–100.');
  add('hold-conviction', !(i.rating?.toUpperCase() !== 'HOLD' && i.conviction !== null && i.conviction < 40), false, 'A BUY or SELL rating carries conviction of at least 40; lower conviction should be HOLD.');
  const inRange = i.target === null || i.scenarioRange === null || (i.target >= i.scenarioRange.low * .95 && i.target <= i.scenarioRange.high * 1.05);
  add('target-range', inRange, true, 'Stated target lies within the calculated bear–bull range.');
  add('target-source', i.target === null || i.calculatedTarget !== null, true, 'A stated target has a calculated valuation behind it.');
  const unknown = unknownFirms(i.citedFirms, i.evidenceFirms);
  add('firm-citations', unknown.length === 0, false, unknown.length ? `Cited firms not found in supplied analyst evidence: ${unknown.join(', ')}.` : 'Every cited analyst firm appears in the supplied evidence.');
  for (const s of ['executive_summary', 'final_synthesis', 'risk_debate']) add(`section-${s}`, Boolean(i.sections[s]), false, `Required section "${s}" is present.`);
  const failed = checks.filter(c => !c.passed);
  return { checks, failed: failed.length, withholdTarget: failed.some(c => c.severe && (c.id === 'target-range' || c.id === 'target-source')) };
}
export const MAJOR_FIRMS = ['Goldman Sachs','Morgan Stanley','JPMorgan','J.P. Morgan','Bank of America','BofA','Citigroup','Citi','Wells Fargo','Barclays','UBS','Deutsche Bank','Jefferies','Evercore','Bernstein','Wedbush','Piper Sandler','Raymond James','Mizuho','BMO Capital','RBC Capital','TD Cowen','Truist','Oppenheimer','KeyBanc','Needham','Loop Capital','Cantor Fitzgerald','Baird','Stifel','Bernstein','HSBC','Macquarie','Citizens JMP','Rosenblatt','Guggenheim','Morningstar'];
/** Brokerage names mentioned in text that look like analyst attributions. */
export function citedFirms(text: string, universe: string[] = MAJOR_FIRMS): string[] {
  const t = text.toLowerCase();
  return [...new Set(universe.filter(f => new RegExp(`\\b${f.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)))];
}
/** A firm counts as evidenced when any supplied action firm contains it or vice versa (e.g. "Goldman Sachs" vs "Goldman Sachs & Co"). */
export function unknownFirms(cited: string[], evidence: string[]): string[] {
  const ev = evidence.map(e => e.toLowerCase());
  return cited.filter(c => { const l = c.toLowerCase(); return !ev.some(e => e.includes(l) || l.includes(e)); });
}

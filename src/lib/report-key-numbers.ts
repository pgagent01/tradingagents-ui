const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const METHOD: Record<string, string> = { dcf: 'Cash-flow (DCF)', excess_return: 'Bank/insurer excess return', ffo_nav: 'Property trust FFO', revenue_scenario: 'Revenue scenario', normalized_cycle: 'Mid-cycle', unavailable: 'Not calculated' };
/** Headline figures for the report's top summary, read only from saved sections; missing values stay null. */
export function keyNumbers(sections: unknown, target: number | null) {
  const s = obj(sections), v = obj(s['valuation']), q = obj(s['quality_review']);
  const price = num(v['price']) ?? num(obj(s['stock_snapshot'])['price']);
  const consensus = (Array.isArray(obj(obj(s['external_evidence'])['analystViews'])['consensus']) ? obj(obj(s['external_evidence'])['analystViews'])['consensus'] as unknown[] : []).map(obj).find(c => num(c['mean']) !== null);
  const wsMean = consensus ? num(consensus['mean']) : null;
  const pct = (a: number | null, b: number | null) => a !== null && b !== null && b > 0 ? Math.round((a / b - 1) * 1000) / 10 : null;
  const warnings = Array.isArray(q['warnings']) ? q['warnings'].length : 0;
  return {
    price, target, upsidePct: pct(target, price),
    intrinsic: num(v['intrinsicValue']), method: METHOD[String(v['method'] ?? '')] ?? null,
    wallStreet: wsMean, wallStreetSource: consensus ? String(consensus['source'] ?? '') : null, gapToWallStreetPct: pct(target, wsMean),
    untracedFigures: num(obj(q['figures'])['unverified']), checkedFigures: num(obj(q['figures'])['checked']), warnings,
  };
}

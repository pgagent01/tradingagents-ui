import { sectionObject } from '@/lib/report-content';
export type ClaimWarning = { code: string; section: string; message: string; evidence: string };
/** Range checks use twelve-month scenario targets, not spot intrinsic values. */
export function reviewCalculatedTarget(modelTarget: number | null, valuation: {priceTarget: number | null; intrinsic?: {scenarios: {target: number | null}[]}}, price: unknown) {
  const calculated=valuation.priceTarget;
  if (calculated===null) return reviewPriceTarget(modelTarget,price);
  const checked=reviewPriceTarget(calculated,price);
  const targets=(valuation.intrinsic?.scenarios??[]).map(s=>s.target).filter((n):n is number=>n!==null&&Number.isFinite(n)&&n>0);
  const warnings=[...checked.warnings];
  if (modelTarget!==null && targets.length && (modelTarget<Math.min(...targets) || modelTarget>Math.max(...targets))) warnings.push({code:'model_target_outside_calculated_range',section:'final_synthesis',message:'The model target is outside the calculated twelve-month scenario range. The stored headline uses the calculated base target; model prose is retained for transparency.',evidence:`Model target ${modelTarget}; calculated base ${calculated}; scenario target range ${Math.min(...targets)}–${Math.max(...targets)}. These are assumption-based estimates, not verified future prices.`});
  return {target:checked.target,warnings};
}
/** Withhold unsupported targets without discarding paid research or inventing replacements. */
export function reviewPriceTarget(target: number | null, price: unknown): { target: number | null; warnings: ClaimWarning[] } {
  const quoted = typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;
  let message = '';
  let code = '';
  if (target !== null && (!Number.isFinite(target) || target <= 0)) { code = 'invalid_price_target'; message = 'The model target was non-positive or invalid and has been withheld.'; }
  else if (target !== null && quoted === null) { code = 'unanchored_price_target'; message = 'No usable current price was supplied; the model target has been withheld.'; }
  else if (target !== null && quoted !== null && Math.round(target * 100) === Math.round(quoted * 100)) { code = 'spot_price_target'; message = 'The model target duplicates the current quote to the cent. It has been withheld pending valuation review; an unchanged valuation may be legitimate but is not independently established.'; }
  else if (target === null && quoted !== null) { code = 'missing_price_target'; message = 'A current quote was available, but the model did not establish a price target. No estimate was invented.'; }
  return { target: code && code !== 'missing_price_target' ? null : target, warnings: code ? [{ code, section: 'final_synthesis', message, evidence: `Current quote: ${quoted ?? 'unavailable'}; model target: ${target ?? 'unavailable'}. Price targets are model estimates, not verified prices.` }] : [] };
}
/** Limited checks, never a full audit or a rewrite of saved conclusions. */
export function reviewReportClaims(texts: Record<string,string>, technical: unknown, fundamentals: unknown, analysisDate: string): ClaimWarning[] {
  const indicators=sectionObject(sectionObject(technical)['indicators']);
  const f=sectionObject(fundamentals);const annual=Array.isArray(f['annual'])?f['annual'].map(sectionObject):[];const latest=annual.at(-1);
  const age=typeof latest?.['end']==='string'?(Date.parse(analysisDate)-Date.parse(latest['end']))/86400000:null;
  const warnings:ClaimWarning[]=[];
  for(const [section,text] of Object.entries(texts)) {
    const sentences=text.split(/(?<=[.!?])\s+|\n/);
    for(const key of ['sma20','sma50','sma200','rsi14','atr14','macd12_26_9']) {
      const label=key.startsWith('sma')?`SMA\\s*${key.slice(3)}|${key.slice(3)}[- ]day (?:simple )?moving average`:key.startsWith('rsi')?'\\bRSI\\b':key.startsWith('atr')?'\\bATR\\b':'\\bMACD\\b';
      if(indicators[key]!==null&&indicators[key]!==undefined&&sentences.some(s=>new RegExp(label,'i').test(s)&&/(?:not (?:available|supplied|provided|calculated)|unavailable|missing|not enough|insufficient)/i.test(s)))warnings.push({code:'available_indicator_denied',section,message:`The text describes ${key.toUpperCase()} as unavailable, but the saved calculation contains it.`,evidence:`${key}: ${JSON.stringify(indicators[key])}`});
    }
    if(age!==null&&age>=0&&age<365&&sentences.some(s=>/financial|fiscal|annual|FY\d|10-K/i.test(s)&&/(?:more than|over|older than) (?:a|one|1) year|year[- ]old/i.test(s)))warnings.push({code:'financial_age_conflict',section,message:'The text describes annual financial evidence as over a year old, but the latest saved fiscal period is less than 365 days before analysis.',evidence:`Period end ${latest?.['end']}; analysis ${analysisDate}; ${Math.floor(age)} days.`});
  }
  return warnings;
}
export function claimReviewPrompt(technical:unknown,fundamentals:unknown,analysisDate:string) {
  const f=sectionObject(fundamentals);const annual=Array.isArray(f['annual'])?f['annual'].map(sectionObject):[];
  return '\nEvidence consistency rules: saved calculated indicators are authoritative for availability, even when lookback bars alone are fewer than the indicator period (warm-up bars are separate). Do not repeat prior claims that contradict these calculations. Financial age uses period end relative to analysis date, NOT retrieval time; filing date is separate. Annual, standalone quarter, YTD and TTM values must never be interchanged.\n'+JSON.stringify({analysisDate,latestAnnualPeriod:annual.at(-1)?.['end']??null,latestAnnualFiled:annual.at(-1)?.['filed']??null,indicators:sectionObject(technical)['indicators']??null});
}

export type FigureCheck = { checked: number; unverified: string[] };
const SCALE: Record<string, number> = { t: 1e12, trillion: 1e12, b: 1e9, bn: 1e9, billion: 1e9, m: 1e6, mm: 1e6, million: 1e6, k: 1e3, thousand: 1e3 };
/** Every finite number in saved evidence, plus consecutive-period changes so simple growth claims verify. */
export function evidenceNumbers(evidence: unknown, limit = 20000): number[] {
  const out: number[] = [];
  const walk = (v: unknown, depth: number) => {
    if (out.length > limit || depth > 8) return;
    if (typeof v === 'number' && Number.isFinite(v)) { out.push(v); return; }
    if (Array.isArray(v)) {
      v.forEach(x => walk(x, depth + 1));
      const objs = v.filter(x => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[];
      for (let i = 1; i < objs.length; i++) for (const [k, b] of Object.entries(objs[i]!)) { const a = objs[i - 1]![k]; if (typeof a === 'number' && typeof b === 'number' && a !== 0) out.push((b - a) / Math.abs(a) * 100); }
      return;
    }
    if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x, depth + 1);
  };
  walk(evidence, 0);
  return out;
}
/** Extract $ amounts, percentages and multiples from prose and match them to evidence within rounding tolerance. */
export function checkFigures(text: string, pool: number[]): FigureCheck {
  const abs = pool.map(Math.abs);
  const near = (v: number, decimals: number) => { const tol = Math.max(Math.abs(v) * 0.015, 0.5 * 10 ** -decimals); return abs.some(p => Math.abs(p - Math.abs(v)) <= tol || Math.abs(p * 100 - Math.abs(v)) <= tol); };
  const unverified: string[] = []; let checked = 0;
  const re = /(\$|US\$)?\s?(-?\d{1,3}(?:,\d{3})+|-?\d+(?:\.\d+)?)\s?(trillion|billion|million|thousand|bn|mm|[TBMK]\b)?\s?(%|x\b|×)?/gi;
  for (const m of text.matchAll(re)) {
    const [raw, dollar, num, scale, unit] = m; const n = Number(num!.replace(/,/g, '')); if (!Number.isFinite(n)) continue;
    const decimals = (num!.split('.')[1] ?? '').length;
    if (!dollar && !unit) continue; // plain numbers (years, counts) are not checked
    if (!dollar && !scale && unit === '%' && Math.abs(n) <= 1 && decimals === 0) continue;
    const value = scale ? n * (SCALE[scale.toLowerCase()] ?? 1) : n;
    checked++;
    const ok = near(value, scale ? decimals + Math.log10(SCALE[scale.toLowerCase()] ?? 1) * -1 : decimals) || (scale ? near(n, decimals) : false);
    if (!ok && unverified.length < 12) unverified.push(raw!.trim());
  }
  return { checked, unverified };
}
export function reviewFigures(texts: Record<string, string>, evidence: unknown): { warnings: ClaimWarning[]; checked: number; unverified: number } {
  const pool = evidenceNumbers(evidence); const warnings: ClaimWarning[] = []; let checked = 0; let unverified = 0;
  for (const [section, text] of Object.entries(texts)) {
    const r = checkFigures(text, pool); checked += r.checked; unverified += r.unverified.length;
    if (r.unverified.length) warnings.push({ code: 'unverified_figure', section, message: `${r.unverified.length} figure(s) in this section could not be matched to saved evidence. They may be derived, rounded differently or unsupported.`, evidence: r.unverified.slice(0, 6).join('; ') });
  }
  return { warnings, checked, unverified };
}

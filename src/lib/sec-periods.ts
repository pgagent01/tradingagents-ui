/** Pure SEC duration selection shared by Stock Info and point-in-time research. */
type Row = Record<string, unknown>;
export type SecFact = { value: number; tag: string; unit: string; start: string | null; end: string; filed: string; accession: string | null; derived: boolean; inputs?: SecFact[] };
const obj = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const duration = (r: Row) => (Date.parse(String(r['end'])) - Date.parse(String(r['start']))) / 86400000;
export function secRows(facts: Row, names: string[], unit = 'USD', cutoff = '9999-12-31'): Row[] {
  return names.flatMap(tag => {
    const rows = obj(obj(facts[tag])['units'])[unit];
    return (Array.isArray(rows) ? rows.map(obj) : []).filter(r => typeof r['val'] === 'number' && Number.isFinite(r['val']) && typeof r['end'] === 'string' && r['end'] <= cutoff && typeof r['filed'] === 'string' && r['filed'] <= cutoff && /^(10-K|10-Q|20-F|40-F)(\/A)?$/.test(String(r['form']))).map(r => ({ ...r, tag, unit }));
  });
}
const fact = (r: Row): SecFact => ({ value: Number(r['val']), tag: String(r['tag']), unit: String(r['unit']), start: typeof r['start'] === 'string' ? r['start'] : null, end: String(r['end']), filed: String(r['filed']), accession: typeof r['accn'] === 'string' ? r['accn'] : null, derived: false });
export function secAnchor(facts: Row, names: string[], period: 'annual' | 'quarter', cutoff = '9999-12-31') {
  return secRows(facts, names, 'USD', cutoff).filter(r => period === 'annual' ? /^(10-K|20-F|40-F)/.test(String(r['form'])) && duration(r) > 300 && duration(r) < 400 : /^10-Q/.test(String(r['form'])) && duration(r) >= 60 && duration(r) <= 300).sort((a,b) => String(b['end']).localeCompare(String(a['end'])) || String(b['filed']).localeCompare(String(a['filed'])) || duration(a) - duration(b))[0] ?? null;
}
export function selectSecFact(facts: Row, names: string[], anchor: Row, period: 'annual' | 'quarter' | 'instant', unit = 'USD', cutoff = '9999-12-31'): SecFact | null {
  // Lock each period to one filing version: do not silently mix restated and original facts.
  const rows = secRows(facts, names, unit, cutoff).filter(r => r['accn'] && anchor['accn'] ? r['accn'] === anchor['accn'] : r['filed'] === anchor['filed']);
  const current = rows.filter(r => r['end'] === anchor['end']).sort((a,b) => names.indexOf(String(a['tag'])) - names.indexOf(String(b['tag'])));
  if (period === 'instant') { const r = current.find(r => !r['start']); return r ? fact(r) : null; }
  if (period === 'annual') { const r = current.find(r => r['start'] === anchor['start'] && duration(r) > 300 && duration(r) < 400); return r ? fact(r) : null; }
  const direct = current.find(r => duration(r) >= 60 && duration(r) <= 110);
  if (direct) return fact(direct);
  // Only subtract same-concept, same-unit comparative facts in the SAME filing.
  // Missing compatible prior facts stay unavailable; YTD is never displayed as a quarter.
  for (const r of current.filter(r => duration(r) > 110 && duration(r) <= 300)) {
    const prior = rows.filter(p => p['tag'] === r['tag'] && p['start'] === r['start'] && String(p['end']) < String(r['end']) && duration(p) >= 60 && (Date.parse(String(r['end'])) - Date.parse(String(p['end']))) / 86400000 >= 60 && (Date.parse(String(r['end'])) - Date.parse(String(p['end']))) / 86400000 <= 110).sort((a,b) => String(b['end']).localeCompare(String(a['end'])))[0];
    if (prior) return { ...fact(r), value: Number(r['val']) - Number(prior['val']), start: new Date(Date.parse(String(prior['end'])) + 86400000).toISOString().slice(0,10), derived: true, inputs: [fact(r), fact(prior)] };
  }
  return null;
}
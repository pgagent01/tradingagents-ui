import { readDataCache, writeDataCache, type EvidenceClient } from './data-cache.server';
import { secFacts } from './stock-data.server';
import { forecastOutcomes } from './forecast-outcomes';
export async function reportForecastOutcomes(sb: EvidenceClient, userId: string, report: { id: string; ticker: string; sections: unknown }) {
  const today = new Date().toISOString().slice(0, 10), key = `v1:${report.id}:${today}`;
  const cached = await readDataCache(sb, userId, 'forecast-outcomes', key);
  if (cached?.fresh) return cached.payload as unknown as ReturnType<typeof forecastOutcomes>;
  const initial = forecastOutcomes(report.sections, null, today);
  const needsFilings = initial.rows.some(r => r.status === 'awaiting_filing');
  const raw = needsFilings ? await secFacts(report.ticker).catch(() => null) : null;
  const result = needsFilings ? forecastOutcomes(report.sections, raw, today) : initial;
  await writeDataCache(sb, userId, 'forecast-outcomes', key, result, needsFilings && !raw ? 5 * 60000 : 6 * 3600000);
  return result;
}
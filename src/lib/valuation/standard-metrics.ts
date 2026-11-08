export type MetricSelection = { value: number | null; source: string };
/** A reported zero is data, not a missing value. Fallbacks run only for absent/invalid evidence. */
export function standardMetric(reported: number | null | undefined, fallback: () => number | null, source: string, fallbackSource: string): MetricSelection {
  if (typeof reported === 'number' && Number.isFinite(reported)) return { value: reported, source };
  const value = fallback();
  return { value: typeof value === 'number' && Number.isFinite(value) ? value : null, source: fallbackSource };
}
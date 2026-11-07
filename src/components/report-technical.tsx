import { DataFreshness } from '@/components/data-freshness';
import { MetricLabel } from '@/components/metric-label';
import { sectionObject, contentText } from '@/lib/report-content';

export function ReportTechnical({ value }: { value: unknown }) {
  const data = sectionObject(value);
  if (!Object.keys(data).length) return null;
  const indicators = sectionObject(data['indicators']);
  const macd = sectionObject(indicators['macd12_26_9']);
  const bands = sectionObject(indicators['bollinger20_2']);
  const rows: [string, unknown][] = [
    ['SMA 20', indicators['sma20']], ['SMA 50', indicators['sma50']], ['SMA 200', indicators['sma200']],
    ['RSI 14', indicators['rsi14']], ['MACD 12/26', macd['MACD']], ['MACD signal 9', macd['signal']], ['MACD histogram', macd['histogram']],
    ['Bollinger upper', bands['upper']], ['Bollinger middle', bands['middle']], ['Bollinger lower', bands['lower']],
    ['ATR 14', indicators['atr14']], ['Average volume', indicators['averageVolume']],
  ];
  return <section className="space-y-3 border-t border-border pt-4"><h2 className="text-xl font-semibold">Saved Technical Indicators</h2><p className="text-xs text-muted-foreground">{contentText(data['chartSource']) || 'Source unavailable'} · {contentText(data['observations'])} daily observations · As of {contentText(data['lastObservation']).slice(0, 10) || 'unavailable'} · {contentText(data['coverage'])}</p><DataFreshness date={contentText(data['fetchedAt'])} origin="Saved technical evidence"/><dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{rows.map(([label, v]) => <div key={label}><dt className="text-xs text-muted-foreground"><MetricLabel label={label}/></dt><dd className="mt-1 font-mono text-sm">{typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'Unavailable'}</dd></div>)}</dl><p className="text-xs text-muted-foreground">{contentText(data['units'])}</p></section>;
}
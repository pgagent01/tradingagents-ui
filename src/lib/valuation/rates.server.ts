import type { MacroFeed } from '@/lib/data-evidence';
import type { StockData } from '@/lib/stock-data';
import type { EvidenceClient } from '@/lib/data-cache.server';
import { cachedStockData } from '@/lib/stock-service.server';
import { marketSensitivity } from '@/lib/ticker-insights';
import type { RateContext } from './scenarios';
export async function valuationRates(sb: EvidenceClient,userId: string,date: string,macro: MacroFeed,stock: StockData | null): Promise<RateContext> {
  const yieldMetric=macro.metrics.find(m=>m.series==='DGS10' && m.value!==null && m.date<=date && Date.parse(date)-Date.parse(m.date)<=14*86400000);
  const result: RateContext={riskFree:yieldMetric?.value!==null && yieldMetric?.value!==undefined ? yieldMetric.value/100 : .04,riskFreeDate:yieldMetric?.date??null,riskFreeSource:yieldMetric?'FRED DGS10 point-in-time vintage':'Assumed 4% default; dated Treasury yield unavailable',beta:1,betaObservations:0,betaSource:'Assumed beta 1 default; usable benchmark history unavailable'};
  if (stock && date===new Date().toISOString().slice(0,10)) {
    try {
      const benchmark=await cachedStockData(sb,userId,'SPY','1Y','annual');
      const cutoff=Date.parse(`${date}T23:59:59Z`)/1000;
      const sensitivity=marketSensitivity(stock.candles.filter(c=>c.time<=cutoff),benchmark.candles.filter(c=>c.time<=cutoff));
      if (sensitivity.beta!==null && Number.isFinite(sensitivity.beta) && sensitivity.beta>0 && sensitivity.beta<=5) Object.assign(result,{beta:sensitivity.beta,betaObservations:sensitivity.days,betaSource:'Calculated daily-return beta versus SPY; split-adjusted provider history'});
    } catch { /* Explicit default remains visible, never a fabricated measured beta. */ }
  }
  return result;
}
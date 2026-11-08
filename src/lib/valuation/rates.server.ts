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
      if (sensitivity.beta!==null && Number.isFinite(sensitivity.beta) && sensitivity.beta>0 && sensitivity.beta<=5) Object.assign(result,{beta:adjustedBeta(sensitivity.beta),betaObservations:sensitivity.days,betaSource:`Blume-adjusted beta ${adjustedBeta(sensitivity.beta).toFixed(2)} (0.67 × raw ${sensitivity.beta.toFixed(2)} + 0.33) from daily returns versus SPY; split-adjusted provider history`});
      // Prefer the provider's 5-year monthly beta (more stable than one year of daily returns) when available.
      const { yahooStats } = await import('./yahoo-stats.server');
      const y=await yahooStats(stock.ticker).catch(()=>null);
      if (y?.beta5y!=null && Number.isFinite(y.beta5y) && y.beta5y>0 && y.beta5y<=5) Object.assign(result,{beta:adjustedBeta(y.beta5y),betaObservations:60,betaSource:`Blume-adjusted beta ${adjustedBeta(y.beta5y).toFixed(2)} (0.67 × Yahoo Finance 5-year monthly beta ${y.beta5y.toFixed(2)} + 0.33), retrieved ${date}${sensitivity.beta!==null?`; 1-year daily beta vs SPY was ${sensitivity.beta.toFixed(2)}`:''}`});
    } catch { /* Explicit default remains visible, never a fabricated measured beta. */ }
  }
  return result;
}
/** One-year raw betas are noisy; Blume adjustment shrinks toward the market beta of 1. */
export function adjustedBeta(raw:number){return 0.67*raw+0.33;}

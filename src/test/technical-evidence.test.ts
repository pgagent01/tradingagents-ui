import {describe,it,expect} from 'vitest';
import {emptyStock} from '@/lib/stock-data';
import {technicalEvidence,technicalPrompt,researchHistoryRange} from '@/lib/technical-evidence';

const fixture=()=>{
  const stock=emptyStock('LITE','Lumentum');stock.chartSource='Yahoo Finance · query1';
  stock.fetchedAt='2026-11-05T17:00:00Z';stock.cached=true;
  const end=Date.parse('2026-11-05T00:00:00Z')/1000;
  stock.candles=Array.from({length:250},(_,i)=>({time:end-(249-i)*86400,open:i+1,high:i+2,low:i+0.5,close:i+1,volume:1000}));
  return stock;
};
describe('technical research evidence',()=>{
  it('requests daily year history instead of a fixed month',()=>expect(researchHistoryRange()).toBe('1Y'));
  it('passes a 90-day window with volume and dated cache/source metadata',()=>{
    const evidence=technicalEvidence(fixture(),'2026-11-05',90);
    expect(evidence.observations).toBe(91);expect(evidence.firstObservation).toBe('2026-08-07T00:00:00.000Z');
    expect(evidence.lastObservation).toBe('2026-11-05T00:00:00.000Z');expect(evidence.candles[0]?.volume).toBe(1000);
    expect(evidence.cached).toBe(true);expect(evidence.fetchedAt).toBe('2026-11-05T17:00:00Z');
    expect(evidence.sourceUrl).toBe('https://finance.yahoo.com/quote/LITE/history/');
    expect(JSON.parse(technicalPrompt(evidence).split(': ').slice(1).join(': ')).candles).toHaveLength(91);
  });
  it('calculates known moving averages RSI MACD and volatility without fabricated values',()=>{
    const indicators=technicalEvidence(fixture(),'2026-11-05',90).indicators;
    expect(indicators?.sma20).toBe(240.5);expect(indicators?.sma50).toBe(225.5);expect(indicators?.sma200).toBe(150.5);
    expect(indicators?.rsi14).toBe(100);expect(indicators?.macd12_26_9?.MACD).toBeCloseTo(7,4);
    expect(indicators?.atr14).toBeCloseTo(2,4);expect(indicators?.bollinger20_2?.middle).toBe(240.5);
    expect(indicators?.averageVolume).toBe(1000);expect(indicators?.windowHigh).toBe(251);expect(indicators?.windowLow).toBe(159.5);
  });
  it('uses warm-up outside a 30-day window but excludes future candles',()=>{
    const stock=fixture();stock.candles.push({time:Date.parse('2026-11-06')/1000,open:999,high:999,low:999,close:999,volume:999});
    const evidence=technicalEvidence(stock,'2026-11-05',30);
    expect(evidence.observations).toBe(31);expect(evidence.warmupObservations).toBe(219);expect(evidence.indicators?.sma200).toBe(150.5);
    expect(evidence.candles.some(c=>c.close===999)).toBe(false);
  });
  it('keeps unavailable indicators and missing volume null on partial histories',()=>{
    const stock=fixture();stock.candles=stock.candles.slice(-2).map(c=>({...c,volume:null}));
    const evidence=technicalEvidence(stock,'2026-11-05',90);
    expect(evidence.indicators?.sma20).toBeNull();expect(evidence.indicators?.rsi14).toBeNull();expect(evidence.indicators?.averageVolume).toBeNull();
    expect(evidence.coverage).toBe('partial or unavailable; do not claim full lookback coverage');
  });
  it('does not calculate indicators from stale observations outside the window',()=>{
    const stock=fixture();stock.candles=stock.candles.slice(0,10);
    const evidence=technicalEvidence(stock,'2026-11-05',90);
    expect(evidence.observations).toBe(0);expect(evidence.indicators).toBeNull();expect(evidence.status).toBe('insufficient history');
  });
});
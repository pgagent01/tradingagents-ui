import { describe, it, expect } from 'vitest';
import { heatTone } from '@/lib/report-visuals';
import { extendedRatios, annualGrowth } from '@/lib/valuation/peer-snapshot';
describe('comparable extra ratios',()=>{
 it('EV = cap + debt - cash; missing debt withholds EV ratios',()=>{
  const r=extendedRatios(100,20,10,50,11,5); expect(r.evSales).toBeCloseTo(2.2); expect(r.evEbit).toBeCloseTo(10); expect(r.fcfMargin).toBeCloseTo(10);
  expect(extendedRatios(100,null,10,50,11,5).evSales).toBeNull();
 });
 it('negative operating income gives no EV/EBIT',()=>{expect(extendedRatios(100,0,0,50,-5,1).evEbit).toBeNull();});
 it('growth needs a positive prior year',()=>{expect(annualGrowth(110,100)).toBeCloseTo(10);expect(annualGrowth(110,0)).toBeNull();expect(annualGrowth(110,null)).toBeNull();});
});
describe('heat map tone',()=>{
 it('within 10% of price is neutral, far above strong green, far below strong red',()=>{
  expect(heatTone(105,100)).toBe('bg-muted'); expect(heatTone(160,100)).toBe('bg-primary/40'); expect(heatTone(40,100)).toBe('bg-destructive/40'); expect(heatTone(5,null)).toBe('bg-muted');
 });
});
import { qualityRatios, grossMarginTrend, riskStats } from '@/lib/valuation/peer-snapshot';
describe('comparable quality and risk',()=>{
 it('ROIC, net debt/EBITDA, FCF and shareholder yield from same inputs',()=>{
  const q=qualityRatios({operatingIncome:100,da:20,debt:300,cash:100,equity:300,dividends:-10,buybacks:-30,ttmFcf:50,marketCap:1000});
  expect(q.roic).toBeCloseTo(100*0.79/500*100); expect(q.netDebtEbitda).toBeCloseTo(200/120); expect(q.fcfYield).toBeCloseTo(5); expect(q.shareholderYield).toBeCloseTo(4);
  expect(qualityRatios({operatingIncome:100,da:null,debt:1,cash:1,equity:1,dividends:null,buybacks:5,ttmFcf:null,marketCap:1}).netDebtEbitda).toBeNull();
 });
 it('gross margin trend needs three years with gross profit',()=>{
  expect(grossMarginTrend([{revenue:100,grossProfit:30},{revenue:100,grossProfit:31},{revenue:100,grossProfit:35}])).toBeCloseTo(5);
  expect(grossMarginTrend([{revenue:100,grossProfit:null},{revenue:1,grossProfit:1},{revenue:100,grossProfit:35}])).toBeNull();
 });
 it('a stock moving exactly 2x SPY has beta 2',()=>{
  const spy=[],st=[];let a=100,b=100;for(let i=0;i<200;i++){const r=Math.sin(i)*0.01;a*=1+r;b*=1+2*r;spy.push({time:1.7e9+i*86400,open:a,high:a,low:a,close:a,volume:0});st.push({time:1.7e9+i*86400,open:b,high:b,low:b,close:b,volume:0});}
  expect(riskStats(st,spy).beta).toBeCloseTo(2,5); expect(riskStats(st.slice(0,50),spy).beta).toBeNull();
 });
});
import { snapshotDebt } from '@/lib/valuation/peer-snapshot';
describe('snapshot debt fallback',()=>{
 it('HPE style: long-term total plus short-term part of current debt',()=>{expect(snapshotDebt(null,{longTermDebt:21748,debtCurrent:4609,ltdCurrent:3796,shortTerm:null}).value).toBe(22561);});
 it('NetApp style: long-term total plus tagged commercial paper (zero)',()=>{expect(snapshotDebt(null,{longTermDebt:2487,debtCurrent:null,ltdCurrent:0,shortTerm:0}).value).toBe(2487);expect(snapshotDebt(null,{longTermDebt:2487,debtCurrent:null,ltdCurrent:0,shortTerm:100}).value).toBe(2587);});
 it('strict total wins',()=>{expect(snapshotDebt(9666,{longTermDebt:1,debtCurrent:1,ltdCurrent:1,shortTerm:1}).value).toBe(9666);});
});
import { ratioMismatch } from '@/lib/valuation/yahoo-stats.server';
describe('provider cross-check',()=>{it('flags >15% gaps only',()=>{expect(ratioMismatch(1.8,1.758)).toBe(false);expect(ratioMismatch(2.5,1.758)).toBe(true);expect(ratioMismatch(null,1.7)).toBe(false);});});
import { yahooSymbol } from '@/lib/stock-data';
describe('yahoo symbols',()=>{it('keeps exchange suffixes, dashes share classes',()=>{expect(yahooSymbol('RR.L')).toBe('RR.L');expect(yahooSymbol('SHOP.TO')).toBe('SHOP.TO');expect(yahooSymbol('BRK.B')).toBe('BRK-B');expect(yahooSymbol('DELL')).toBe('DELL');});});

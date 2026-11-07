import { describe, expect, it } from 'vitest';
import { checkedGrossProfit, validateStockFinancials } from '@/lib/financial-quality';
import { emptyStock, parseSecFinancials } from '@/lib/stock-data';

describe('financial consistency safeguards', () => {
  it('withholds contradictory gross profit rather than choosing a convenient value', () => {
    expect(checkedGrossProfit(100, 60, 70).value).toBeNull();
    expect(checkedGrossProfit(100, 60, 70).warning).toBeTruthy();
  });
  it('accepts rounding differences and genuine negative gross profit', () => {
    expect(checkedGrossProfit(100, 60, 40.1).value).toBe(40.1);
    expect(checkedGrossProfit(100, 120, -20).value).toBe(-20);
    expect(checkedGrossProfit(100, 60, null)).toMatchObject({ value: 40, derived: true });
  });
  it('withholds negative P/E but preserves actual losses and independently positive TTM P/E', () => {
    const stock = emptyStock('LITE', 'Lumentum');
    stock.ratios = [{ label: 'P/E · FY earnings', value: -6.88 }, { label: 'P/E · TTM', value: 12 }];
    stock.statements.income = [{ label: 'Net income', value: -6935 }];
    const checked = validateStockFinancials(stock);
    expect(checked.ratios.map(r => r.value)).toEqual([null, 12]);
    expect(checked.statements.income[0]?.value).toBe(-6935);
  });
  it('does not manufacture an annual P/E for loss-making SEC earnings', () => {
    const row = (val: number) => ({ val, start: '2024-01-01', end: '2024-12-31', filed: '2025-02-01', form: '10-K' });
    const facts = { facts: { 'us-gaap': { Revenues: { units: { USD: [row(100)] } }, NetIncomeLoss: { units: { USD: [row(-10)] } }, CommonStockSharesOutstanding: { units: { shares: [row(10)] } } } } };
    expect(parseSecFinancials(facts, 20).ratios[0]?.value).toBeNull();
  });
});
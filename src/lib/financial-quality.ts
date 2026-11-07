import type { StockData } from '@/lib/stock-data';

/** Rounding tolerance is 1% of the larger comparable value; losses remain valid evidence. */
export function checkedGrossProfit(revenue: number | null, cost: number | null, reported: number | null) {
  const derived = revenue !== null && cost !== null ? revenue - cost : null;
  if (reported !== null && derived !== null && Math.abs(reported - derived) > Math.max(1, Math.abs(reported), Math.abs(derived)) * 0.01) {
    return { value: null, derived: false, warning: 'Reported gross profit conflicts with same-period revenue minus cost of revenue; withheld pending source review.' };
  }
  return { value: reported ?? derived, derived: reported === null && derived !== null, warning: null };
}

/** Validate independent ratios without comparing TTM ratios to annual earnings. */
export function validateStockFinancials(data: StockData): StockData {
  const warnings = [...data.warnings];
  const ratios = data.ratios.map(row => {
    if (row.label.startsWith('P/E') && row.value !== null && row.value <= 0) {
      warnings.push(`${row.label} withheld: P/E is not meaningful for non-positive earnings.`);
      return { ...row, value: null };
    }
    return row;
  });
  return { ...data, ratios, warnings: [...new Set(warnings)] };
}
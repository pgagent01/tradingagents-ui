import {describe,it,expect} from 'vitest';
import {snapshotAllowed,stockPrompt} from '@/lib/stock-snapshot';
import {emptyStock} from '@/lib/stock-data';
describe('research market snapshots',()=>{
 it('does not expose current stock data to past-date research',()=>{expect(snapshotAllowed('2025-01-01','2026-10-25')).toBe(false);expect(snapshotAllowed('2026-10-25','2026-10-25')).toBe(true);expect(stockPrompt(null)).toContain('Do not substitute current quotes');});
 it('preserves source and unknown market values in analyst context',()=>{const stock=emptyStock('AAPL','Apple');stock.price=100;stock.quoteSource='Yahoo';const context=stockPrompt(stock);expect(context).toContain('"price":100');expect(context).toContain('"quoteSource":"Yahoo"');expect(context).toContain('"marketCap":null');});
 it('supplies retrieved price history and volume to the analyst',()=>{const stock=emptyStock('LITE','Lumentum');stock.chartSource='Yahoo';stock.candles=[{time:1793871000,open:300,high:310,low:299,close:305.21,volume:1200000}];const context=stockPrompt(stock);expect(context).toContain('"close":305.21');expect(context).toContain('"volume":1200000');expect(context).toContain('"chartSource":"Yahoo"');});
});
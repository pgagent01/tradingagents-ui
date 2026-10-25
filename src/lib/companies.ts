export type Company = { ticker: string; name: string; exchange: string; aliases: string[] };
export const COMPANIES: Company[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', aliases: ['apple'] },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', aliases: ['nvidia'] },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', aliases: ['tesla'] },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', aliases: ['microsoft'] },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', aliases: ['amazon'] },
  { ticker: 'GOOGL', name: 'Alphabet Inc. · Class A', exchange: 'NASDAQ', aliases: ['alphabet', 'google'] },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', aliases: ['meta', 'facebook'] },
  { ticker: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', aliases: ['amd', 'advanced micro'] },
  { ticker: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', aliases: ['netflix'] },
  { ticker: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', aliases: ['broadcom'] },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', aliases: ['jpmorgan', 'jp morgan'] },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway · Class B', exchange: 'NYSE', aliases: ['berkshire', 'buffett'] },
];
export function findCompanies(query: string) {
  const q = query.trim().toLowerCase();
  return COMPANIES.filter(c => !q || [c.ticker, c.name, c.exchange, ...c.aliases].some(v => v.toLowerCase().includes(q)))
    .sort((a,b) => Number(b.ticker.toLowerCase() === q || b.aliases.includes(q)) - Number(a.ticker.toLowerCase() === q || a.aliases.includes(q))).slice(0, 8);
}
export function resolveTicker(query: string) {
  const q = query.trim().toLowerCase();
  return COMPANIES.find(c => c.ticker.toLowerCase() === q || c.aliases.includes(q) || c.name.toLowerCase() === q)?.ticker ?? query.trim().toUpperCase();
}
const fmt = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? 'Unavailable' : new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v));
export { fmt };
export function SourceLinks({ ticker }: { ticker: string }) {
  return <span className="space-x-2 text-[10px]">
    <a className="text-primary underline" href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`} target="_blank" rel="noreferrer">Yahoo Finance</a>
    <a className="text-primary underline" href={`https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(ticker)}`} target="_blank" rel="noreferrer">SEC EDGAR</a>
  </span>;
}

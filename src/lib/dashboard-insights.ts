type Run = { ticker: string; status: string; created_at: string; is_demo: boolean };
export function dashboardStocks(runs: Run[]) {
  const counts = new Map<string, { ticker: string; count: number; lastAnalyzed: string }>();
  for (const run of runs) {
    if (run.status !== 'completed' || run.is_demo) continue;
    const ticker = run.ticker.toUpperCase();
    const previous = counts.get(ticker);
    counts.set(ticker, { ticker, count: (previous?.count ?? 0) + 1, lastAnalyzed: previous && previous.lastAnalyzed > run.created_at ? previous.lastAnalyzed : run.created_at });
  }
  const stocks = [...counts.values()];
  return { recent: [...stocks].sort((a, b) => b.lastAnalyzed.localeCompare(a.lastAnalyzed)).slice(0, 6), frequent: stocks.sort((a, b) => b.count - a.count || b.lastAnalyzed.localeCompare(a.lastAnalyzed)).slice(0, 6) };
}
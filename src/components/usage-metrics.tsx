export function UsageMetrics({ input, output, cost, demo = false }: { input: number; output: number; cost: number; demo?: boolean }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3 sm:grid-cols-4">
    {[['Prompt / input', input.toLocaleString()], ['Completion / output', output.toLocaleString()], ['Combined tokens', (input+output).toLocaleString()], [demo ? 'Simulated cost · USD' : 'Report cost · USD', `$${cost.toFixed(4)}`]].map(([label,value]) => <div key={label}><dt className="text-[10px] uppercase text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-lg font-semibold">{value}</dd></div>)}
  </dl>;
}
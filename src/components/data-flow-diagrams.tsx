import { ArrowDown, ArrowRight } from 'lucide-react';

function Node({ title, sub, tone = 'default' }: { title: string; sub?: string; tone?: 'default' | 'primary' | 'muted' }) {
  const cls = tone === 'primary'
    ? 'border-primary/50 bg-primary/10'
    : tone === 'muted'
      ? 'border-border bg-secondary/40'
      : 'border-border bg-card';
  return (
    <div className={`min-w-32 max-w-44 rounded-md border px-3 py-2 text-center ${cls}`}>
      <p className="text-xs font-semibold leading-tight">{title}</p>
      {sub && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{sub}</p>}
    </div>
  );
}
function HArrow() { return <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden />; }
function VArrow() { return <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />; }
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-2">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

/** Data pipeline: sources through processing stages to the saved report. */
export function DataPipelineDiagram() {
  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label="Diagram: data sources flow through collect, normalize, deduplicate, quality checks and caching into analysts and an immutable report snapshot.">
      <Group label="Sources">
        <Node title="SEC filings" tone="muted" />
        <Node title="Market data" sub="Yahoo · FMP · Alpha Vantage" tone="muted" />
        <Node title="News" sub="RSS · GDELT · Firecrawl" tone="muted" />
        <Node title="Macro" sub="FRED · World Bank" tone="muted" />
        <Node title="Other" sub="Wikipedia · Polymarket · FINRA" tone="muted" />
      </Group>
      <VArrow />
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        <Node title="Collect" sub="dated, sourced facts" />
        <HArrow />
        <Node title="Normalize" sub="periods, currencies, URLs" />
        <HArrow />
        <Node title="Dedupe & cross-check" sub="event groups, conflict audit" />
        <HArrow />
        <Node title="Quality checks" sub="accounting identities, plausibility" />
      </div>
      <VArrow />
      <Node title="Account-scoped cache" sub="credential-versioned; reused across pages" tone="primary" />
      <VArrow />
      <Node title="Analyst handoff" sub="processed subsets per role" />
      <VArrow />
      <Node title="Immutable report snapshot" sub="evidence saved with the report" tone="primary" />
    </div>
  );
}

/** Overall framework: analyst roles, debate, risk and synthesis. */
export function FrameworkDiagram() {
  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label="Diagram: processed evidence feeds five analyst roles, then a bull and bear debate, risk review, and synthesis into the final report.">
      <Node title="Processed evidence hub" sub="from the pipeline above" tone="primary" />
      <VArrow />
      <Group label="Analysts · your selected models">
        <Node title="Fundamentals" />
        <Node title="Technical" />
        <Node title="News" />
        <Node title="Sentiment" />
        <Node title="Macro" />
      </Group>
      <VArrow />
      <Group label="Debate">
        <Node title="Bull case" />
        <Node title="Bear case" />
      </Group>
      <VArrow />
      <Node title="Risk review" sub="stress-tests the thesis" />
      <VArrow />
      <Node title="Synthesis" sub="rating, conviction, target when justified" tone="primary" />
      <VArrow />
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        <Node title="Report" sub="evidence, references, data map" tone="primary" />
        <HArrow />
        <Node title="Scorecard" sub="outcome tracking over time" tone="muted" />
      </div>
    </div>
  );
}

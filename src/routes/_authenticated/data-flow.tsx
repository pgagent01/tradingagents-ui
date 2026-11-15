import { createFileRoute } from '@tanstack/react-router';
import { generalDataMap } from '@/lib/evidence-map';
import { pageHead } from '@/lib/page-head';
import { DataError } from '@/components/route-feedback';

export const Route = createFileRoute('/_authenticated/data-flow')({
  head: () => pageHead('Data Flow & Sources', 'What data is collected, how it is cleaned and cached, and which analysts receive it.'),
  errorComponent: DataError,
  component: DataFlow,
});

const pipeline = [
  { step: '1 · Collect', text: 'Each run pulls from the sources below. Every fact keeps its source, publication or filing date, and retrieval time. Historical runs only use data filed or published on or before the analysis date, so no look-ahead bias.' },
  { step: '2 · Normalize', text: 'URLs are canonicalized, dates and currencies are standardized, and financial periods are aligned to filings. Quarters are derived only from same-filing comparatives — YTD figures are never relabelled as quarters.' },
  { step: '3 · Deduplicate & cross-check', text: 'Repeated articles are merged into grouped events with a duplicate/rejection/conflict audit. When several sources provide the same figure, directly sourced standard values are preferred; values are calculated only when no source provides them, and derived values are labelled.' },
  { step: '4 · Quality checks', text: 'Accounting identities (assets = liabilities + equity, cash-flow consistency), figure-to-evidence matching, and plausibility guardrails run before analyst handoff. Failures withhold affected inputs — for example an implausible valuation input blocks the price target rather than fabricating one.' },
  { step: '5 · Cache', text: 'Processed evidence is stored in account-scoped, credential-versioned caches so repeat runs and page views reuse retrieval without re-fetching. Replacing an API key invalidates evidence gathered with the old key. Interrupted runs keep their partial evidence for resume.' },
  { step: '6 · Analyst handoff', text: 'Each analyst role receives only the processed subsets relevant to it — never raw provider payloads. The map below shows exactly which roles receive which data.' },
  { step: '7 · Snapshot', text: 'The evidence used is saved immutably inside the report, so a saved report never changes when sources or keys change later. Exports include the same references and quality audit.' },
];

const storage = [
  { name: 'Research runs', text: 'One row per analysis: ticker, dates, model choices, status, heartbeat, token and cost totals. Supports resume after interruption.' },
  { name: 'Analyst outputs', text: 'Each analyst stage saves its own output and per-stage evidence snapshot, so a resumed run never re-bills completed work.' },
  { name: 'Reports', text: 'Final report with immutable evidence snapshots, valuation inputs, quality-check results, references and the data map — isolated to your account.' },
  { name: 'Evidence caches', text: 'Account-scoped, credential-versioned caches for SEC facts, news, company profiles and provider statistics. Caches are never shared across accounts.' },
  { name: 'Credentials', text: 'Your API keys are encrypted (AES-GCM) and decrypted only on the server for your own requests. Keys are never returned to the browser or shared with other accounts.' },
];

function DataFlow() {
  const map = generalDataMap();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-lg font-semibold">Data Flow &amp; Sources</h1>
        <p className="mt-1 text-xs text-muted-foreground">What data is collected, how it is cleaned, and which analysts receive it.</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">How data flows through a run</h2>
        <ol className="space-y-3">
          {pipeline.map(p => (
            <li key={p.step} className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-primary">{p.step}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Data map — what is collected and who receives it</h2>
        <p className="mb-3 text-xs text-muted-foreground">Processed evidence snapshots, not an archive of original provider payloads. Availability depends on the run date, the company, and your enabled keys.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">Source</th><th className="pr-3">What is collected</th><th className="pr-3">Analysts</th><th className="pr-3">Availability</th><th>Rules &amp; limits</th>
              </tr>
            </thead>
            <tbody>
              {map.map(row => (
                <tr key={row.source} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-semibold">{row.source}</td>
                  <td className="py-2 pr-3">{row.fields}</td>
                  <td className="py-2 pr-3">{row.agents.length ? row.agents.join(', ') : 'None'}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.state}</td>
                  <td className="py-2 text-muted-foreground">{row.policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Structure &amp; storage</h2>
        <div className="space-y-3">
          {storage.map(s => (
            <div key={s.name} className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold">{s.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Every report page also shows its own “Collected data → Analyst input map” with the actual availability states for that run.</p>
      </section>
    </div>
  );
}

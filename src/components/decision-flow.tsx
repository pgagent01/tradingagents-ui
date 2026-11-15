const steps = [
  { title: '1. Evidence collected', text: 'Filings, prices, news, macro and company context are gathered, cleaned, de-duplicated and cross-checked. Unavailable values stay empty rather than guessed.' },
  { title: '2. Valuation calculated', text: 'A calculator (not the AI) computes intrinsic value scenarios, comparables and sensitivities from the filed figures, with every assumption recorded.' },
  { title: '3. Analysts report', text: 'Fundamentals, news, sentiment, technical and risk analysts each read only the evidence relevant to their role and cite their sources.' },
  { title: '4. Bull vs bear debate', text: 'Two sides argue the strongest case for and against. They must decide which case is stronger, not settle on a polite HOLD.' },
  { title: '5. Risk review', text: 'Downside scenarios, leverage, volatility and event risks are stress-tested against the debate.' },
  { title: '6. Final decision', text: 'The synthesis model you selected weighs everything and must return a rating (Strong Buy to Strong Sell), conviction 0–100 and risk level.' },
  { title: '7. Safety checks', text: 'The answer is rejected if the rating is missing. A price target is withheld if it copies the current price or rests on figures that failed a data check.' },
];

const rules = [
  'Conviction follows the margin of safety only when a calculated intrinsic value exists.',
  'A 12-month target is given only with a current price and a defensible valuation; otherwise it is left blank with a reason.',
  'Thin evidence means HOLD with low conviction, explained.',
  'Each report explains what would change the view.',
  'The rating is the AI’s judgement over the evidence, not a fixed formula.',
];

export function DecisionFlow() {
  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap items-stretch gap-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-2">
            <div className="w-56 rounded-md border border-border bg-card p-3">
              <h3 className="text-xs font-semibold text-primary">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
            </div>
            {i < steps.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <h3 className="text-xs font-semibold">Decision rules</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {rules.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

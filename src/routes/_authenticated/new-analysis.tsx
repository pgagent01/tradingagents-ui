import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/new-analysis')({
  head: () => pageHead('New Analysis Shortcut', 'Open the TradingAgents analysis wizard.'),
  beforeLoad: () => { throw redirect({ to: '/analysis/new', search: { ticker: '' } }); },
});

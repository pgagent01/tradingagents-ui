# Remix of TradingAgents Terminal

Build the initial version of TradingAgents AI, a modern financial research terminal inspired by Bloomberg, Koyfin, and Linear.

1. Visual Identity & Shell:
- Default dark mode with palette: primary background #0B1120, secondary #111827, card backgrounds #1F2937, accent #3B82F6, positive #10B981, negative #EF4444.
- High information density, compact typography, subtle borders, and smooth collapsible sidebar.
- Left navigation: Dashboard, New Analysis, Research Reports, Watchlists, Token & Cost Analytics, Settings.

2. Supabase / Lovable Cloud Database Schema:
Create tables with Row Level Security (RLS) enabled:
- user_settings: user_id (UUID references auth.users), default_provider, default_depth, daily_budget_usd, theme.
- research_runs: id (UUID, PK), user_id, ticker (text), analysis_date (date), status ('pending'|'running'|'completed'|'failed'|'cancelled'), research_depth ('quick'|'standard'|'deep'), selected_agents (jsonb array), model_config (jsonb), total_input_tokens (int), total_output_tokens (int), total_cost_usd (numeric), error_message (text), started_at (timestamptz), completed_at (timestamptz).
- research_events: id (UUID), run_id (UUID references research_runs), agent_id (text), event_type (text), message (text), data (jsonb), created_at (timestamptz).
- agent_outputs: id (UUID), run_id (UUID references research_runs), agent_id (text), model_used (text), content (text), status (text), input_tokens (int), output_tokens (int), cost_usd (numeric), created_at (timestamptz).
- research_reports: id (UUID), run_id (UUID references research_runs), ticker (text), recommendation ('BUY'|'HOLD'|'SELL'), conviction_score (int), price_target (numeric), executive_summary (text), sections (jsonb), created_at (timestamptz).

3. Dashboard View:
- Metric summary cards: Total Researched Tickers, Active Runs, Month-to-date Token Spend ($), Cache Hit Rate (%).
- Recent Research table showing ticker, date, recommendation badge, conviction score, cost, and action button to open report.
- Quick Ticker Search bar with auto-suggestions for major symbols (AAPL, NVDA, MSFT, TSLA).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tradingagents-ui.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/60816980-49f8-4749-b42a-97caff6ae8b4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

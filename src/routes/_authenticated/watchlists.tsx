import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/watchlists")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Watchlists — TradingAgents AI" },
      { name: "description", content: "Track and group tickers you follow." },
      { property: "og:title", content: "Watchlists — TradingAgents AI" },
      { property: "og:description", content: "Track and group tickers you follow." },
    ],
  }),
  component: () => <PlaceholderPage title="Watchlists" description="Track and group tickers you follow." />,
});

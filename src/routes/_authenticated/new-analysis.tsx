import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/new-analysis")({
  head: () => ({
    meta: [
      { title: "New Analysis — TradingAgents AI" },
      { name: "description", content: "Configure agents, depth and models to start a research run." },
      { property: "og:title", content: "New Analysis — TradingAgents AI" },
      { property: "og:description", content: "Configure agents, depth and models to start a research run." },
    ],
  }),
  component: () => <PlaceholderPage title="New Analysis" description="Configure agents, depth and models to start a research run." />,
});

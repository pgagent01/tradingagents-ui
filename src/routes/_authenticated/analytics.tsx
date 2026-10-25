import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Token & Cost Analytics — TradingAgents AI" },
      { name: "description", content: "Token usage and spend breakdown per run, agent and model." },
      { property: "og:title", content: "Token & Cost Analytics — TradingAgents AI" },
      { property: "og:description", content: "Token usage and spend breakdown per run, agent and model." },
    ],
  }),
  component: () => <PlaceholderPage title="Token & Cost Analytics" description="Token usage and spend breakdown per run, agent and model." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TradingAgents AI" },
      { name: "description", content: "Default provider, research depth and daily budget." },
      { property: "og:title", content: "Settings — TradingAgents AI" },
      { property: "og:description", content: "Default provider, research depth and daily budget." },
    ],
  }),
  component: () => <PlaceholderPage title="Settings" description="Default provider, research depth and daily budget." />,
});

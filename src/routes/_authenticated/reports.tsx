import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Research Reports — TradingAgents AI" },
      { name: "description", content: "Completed research reports will be listed here." },
      { property: "og:title", content: "Research Reports — TradingAgents AI" },
      { property: "og:description", content: "Completed research reports will be listed here." },
    ],
  }),
  component: () => <PlaceholderPage title="Research Reports" description="Completed research reports will be listed here." />,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TradingAgents AI — Research Terminal" },
      { name: "description", content: "AI multi-agent equity research terminal with reports, watchlists and cost analytics." },
      { property: "og:title", content: "TradingAgents AI — Research Terminal" },
      { property: "og:description", content: "AI multi-agent equity research terminal." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

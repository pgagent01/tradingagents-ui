import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const TRADINGAGENTS_REPO_URL = "https://github.com/TauricResearch/TradingAgents";

/** Compact credit shown at the bottom of the app sidebar. */
export function SidebarAttribution({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <a
        href={TRADINGAGENTS_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Powered by the open-source TradingAgents framework"
        className="mx-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <div className="border-t border-sidebar-border px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
      <span className="block">Powered by the open-source</span>
      <a
        href={TRADINGAGENTS_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        TradingAgents framework
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
      <span className="block text-[9px]">Credit: Tauric Research</span>
    </div>
  );
}

/** Attribution bar shown at the bottom of the dashboard. */
export function DashboardAttribution({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <span>
        This platform is powered by the open-source{" "}
        <a
          href={TRADINGAGENTS_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          TradingAgents framework
        </a>
        , with credit to Tauric Research.
      </span>
      <a
        href={TRADINGAGENTS_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
      >
        github.com/TauricResearch/TradingAgents
        <ExternalLink className="h-3 w-3" />
      </a>
    </footer>
  );
}

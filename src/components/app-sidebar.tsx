import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, FileText, LayoutDashboard, LogOut, PlusCircle, Settings, GitCompare, Star } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { SidebarAttribution } from "@/components/attribution-note";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Stocks", url: "/stocks", icon: Activity },
  { title: "Compare Tickers", url: "/compare", icon: GitCompare },
  { title: "New Analysis", url: "/analysis/new", icon: PlusCircle },
  { title: "Research Reports", url: "/reports", icon: FileText },
  { title: "Watchlists", url: "/watchlists", icon: Star },
  { title: "Token & Cost Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-10 flex-row items-center gap-2 border-b border-sidebar-border px-3">
        <Activity className="h-4 w-4 shrink-0 text-primary" />
        {!collapsed && (
          <span className="font-mono text-xs font-semibold tracking-tight">
            TRADINGAGENTS<span className="text-primary">.AI</span>
          </span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title} size="sm">
                    <Link to={i.url}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarAttribution collapsed={collapsed} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" tooltip="Sign out" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

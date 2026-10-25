import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TradingAgents AI" },
      { name: "description", content: "Sign in to your TradingAgents AI research terminal." },
      { property: "og:title", content: "Sign in — TradingAgents AI" },
      { property: "og:description", content: "Access your AI research terminal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      nav({ to: "/dashboard" });
      return;
    }

    const code = invite.trim().toUpperCase();
    if (!code) {
      setBusy(false);
      toast.error("An invite code is required to create an account.");
      return;
    }

    const { data: valid, error: checkError } = await supabase.rpc("is_valid_invite_code", {
      _code: code,
    });
    if (checkError) {
      setBusy(false);
      toast.error(checkError.message);
      return;
    }
    if (!valid) {
      setBusy(false);
      toast.error("That invite code is invalid or already used.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { invite_code: code } },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check your email to confirm your account.");
    setMode("in");
    setInvite("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-md border border-border bg-secondary p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-semibold tracking-tight">TRADINGAGENTS<span className="text-primary">.AI</span></span>
        </div>
        <h1 className="text-lg font-semibold">{mode === "in" ? "Sign in to terminal" : "Create account"}</h1>
        {mode === "up" && (
          <div className="space-y-1.5">
            <Label htmlFor="invite">Invite code</Label>
            <Input
              id="invite"
              required
              autoComplete="off"
              placeholder="TA-XXXX-XXXX-XXXX"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Accounts can only be created with a valid invite code from an admin.
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? "Sign in" : "Sign up"}
        </Button>
        <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

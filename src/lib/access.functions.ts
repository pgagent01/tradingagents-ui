import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptSecret } from "@/lib/crypto.server";
import {
  assertCanRunResearch,
  generateInviteCode,
  maskKey,
  normalizeProvider,
  normalizeCredentialProvider,
  validateTicker,
  type CredentialProvider,
} from "@/lib/access-rules";

type Authed = { context: { supabase: any; userId: string } };

async function assertAdmin({ context }: Authed) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Admin access required.");
}

/** Role of the signed-in account — used to gate the admin-only panels. */
export const getMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    return { isAdmin: roles.includes("admin"), roles };
  });

/** Stores the caller's own key, encrypted, under the caller's user_id only. */
export const saveMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; apiKey: string }) => input)
  .handler(async ({ data, context }) => {
    const provider = normalizeCredentialProvider(data.provider);
    const apiKey = data.apiKey.trim();
    if (apiKey.length < 8) throw new Error("That API key looks too short.");
    const { error } = await context.supabase.from("user_api_keys").upsert(
      {
        user_id: context.userId,
        provider,
        key_ciphertext: await encryptSecret(apiKey, process.env['API_KEY_ENCRYPTION_SECRET']),
        key_hint: maskKey(apiKey),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
    return { provider, hint: maskKey(apiKey) };
  });

/** Lists only what is safe to show: provider, masked hint, timestamps. */
export const listMyApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_api_keys")
      .select("provider, key_hint, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("provider");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      provider: r.provider as CredentialProvider,
      hint: "•••••••• (configured)",
      updatedAt: r.updated_at as string,
    }));
  });

export const deleteMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => input)
  .handler(async ({ data, context }) => {
    const provider = normalizeCredentialProvider(data.provider);
    const { error } = await context.supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", provider);
    if (error) throw error;
    return { removed: provider };
  });

/** Creates a run only when the caller has its own key for the chosen provider. */
export const createResearchRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { ticker: string; provider: string; depth: string; agents: string[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const provider = normalizeProvider(data.provider);
    const ticker = validateTicker(data.ticker);

    const { data: ownKey, error: keyErr } = await context.supabase
      .from("user_api_keys")
      .select("id")
      .eq("user_id", context.userId)
      .eq("provider", provider)
      .maybeSingle();
    if (keyErr) throw keyErr;
    assertCanRunResearch({ hasOwnApiKey: Boolean(ownKey), provider });

    const { data: run, error } = await context.supabase
      .from("research_runs")
      .insert({
        user_id: context.userId,
        ticker,
        status: "pending",
        research_depth: data.depth,
        selected_agents: data.agents,
        model_config: { provider },
      })
      .select("id")
      .single();
    if (error) throw error;
    return { runId: run.id as string, ticker, provider };
  });

export const createInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { note?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin({ context } as Authed);
    const code = generateInviteCode();
    const { error } = await context.supabase.from("invite_codes").insert({
      code,
      note: data.note?.trim() || null,
      created_by: context.userId,
    });
    if (error) throw error;
    return { code };
  });

export const listInviteCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin({ context } as Authed);
    const { data, error } = await context.supabase
      .from("invite_codes")
      .select("id, code, note, used_at, revoked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const revokeInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin({ context } as Authed);
    const { error } = await context.supabase
      .from("invite_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { revoked: data.id };
  });

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const allowedOrigins = new Set([
  "https://admin.egshop.az",
  "https://egshop.az",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://admin.egshop.az",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

const allowedActions = new Set([
  "activate", "restore", "deactivate", "temporary_block", "permanent_block", "edit", "hard_delete",
]);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return json({ ok: true }, 200, origin);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403, null);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization");
  if (!url || !serviceKey) return json({ error: "server_not_configured" }, 503, origin);
  if (!authorization?.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401, origin);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const admin = userData.user;
  if (userError || !admin) return json({ error: "authentication_required" }, 401, origin);

  const [{ data: adminRole }, { data: adminProfile }] = await Promise.all([
    service.from("user_roles").select("user_id").eq("user_id", admin.id).eq("role", "admin").maybeSingle(),
    service.from("profiles").select("account_status,blocked_until").eq("id", admin.id).maybeSingle(),
  ]);
  const temporaryExpired = adminProfile?.account_status === "temporary_blocked"
    && adminProfile.blocked_until && new Date(adminProfile.blocked_until) <= new Date();
  if (!adminRole || !adminProfile || (adminProfile.account_status !== "active" && !temporaryExpired)) {
    return json({ error: "admin_required" }, 403, origin);
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id : "";
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
    const profilePatch = body.profile_patch && typeof body.profile_patch === "object"
      ? { ...(body.profile_patch as Record<string, unknown>) }
      : {};
    if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "invalid_target" }, 400, origin);
    if (!allowedActions.has(action)) return json({ error: "invalid_action" }, 400, origin);
    if (targetId === admin.id) return json({ error: "self_action_forbidden" }, 409, origin);

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ipAddress = forwarded && /^[0-9a-f:.]+$/i.test(forwarded) ? forwarded : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const adminEmail = admin.email ?? null;

    if (action === "hard_delete") {
      const { error: prepareError } = await service.rpc("admin_prepare_account_deletion", {
        _admin_id: admin.id,
        _target_id: targetId,
        _reason: reason,
        _admin_email: adminEmail,
        _ip_address: ipAddress,
        _user_agent: userAgent,
      });
      if (prepareError) throw prepareError;

      const { error: deleteError } = await service.auth.admin.deleteUser(targetId, false);
      await service.rpc("admin_log_account_deletion", {
        _admin_id: admin.id,
        _target_id: targetId,
        _success: !deleteError,
        _message: deleteError?.message ?? reason ?? "Hesab tam silindi",
        _admin_email: adminEmail,
        _ip_address: ipAddress,
        _user_agent: userAgent,
      });
      if (deleteError) throw deleteError;
      return json({ ok: true, action }, 200, origin);
    }

    if (action === "edit" && typeof profilePatch.email === "string") {
      const email = profilePatch.email.trim().toLowerCase();
      delete profilePatch.email;
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "invalid_email" }, 400, origin);
      const { error } = await service.auth.admin.updateUserById(targetId, { email, email_confirm: true });
      if (error) throw error;
    }

    let blockedUntil: string | null = null;
    if (action === "temporary_block") {
      const minutes = Math.min(Math.max(Number(body.block_minutes ?? 1440), 5), 525600);
      blockedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await service.auth.admin.updateUserById(targetId, { ban_duration: `${Math.ceil(minutes)}m` });
      if (error) throw error;
    } else if (action === "permanent_block" || action === "deactivate") {
      const { error } = await service.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      if (error) throw error;
    } else if (action === "activate" || action === "restore") {
      const { error } = await service.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (error) throw error;
    }

    const { data, error } = await service.rpc("admin_apply_account_action", {
      _admin_id: admin.id,
      _target_id: targetId,
      _action: action,
      _reason: reason,
      _blocked_until: blockedUntil,
      _profile_patch: profilePatch,
      _admin_email: adminEmail,
      _ip_address: ipAddress,
      _user_agent: userAgent,
    });
    if (error) throw error;
    return json({ ok: true, result: data }, 200, origin);
  } catch (error) {
    console.error("Admin user management failed", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "request_failed" }, 400, origin);
  }
});


const API_BASE = "https://epoint.az/api/1";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const LANGUAGES = new Set(["az", "en", "ru"]);
const FINAL_STATUSES = new Set(["success", "returned", "error", "server_error"]);

type Json = Record<string, unknown>;

function envJsonKey(name: string, legacy: string): string | null {
  const value = Deno.env.get(name);
  if (value) {
    try { return (JSON.parse(value) as Record<string, string>).default ?? null; } catch { /* fallback */ }
  }
  return Deno.env.get(legacy) ?? null;
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowed = new Set([
    new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az").origin,
    new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az").origin,
    new URL(Deno.env.get("ADMIN_SITE_URL") ?? "https://admin.egshop.az").origin,
    new URL(Deno.env.get("PVZ_SITE_URL") ?? "https://pvz.egshop.az").origin,
  ]);
  if (allowed.has(origin)) return origin;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null;
}

function reply(body: Json, status: number, origin: string | null): Response {
  const cors = allowedOrigin(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...(cors ? { "Access-Control-Allow-Origin": cors, Vary: "Origin" } : {}) },
  });
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sign(privateKey: string, data: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${privateKey}${data}${privateKey}`),
  );
  return base64(new Uint8Array(digest));
}

function text(value: unknown, max = 1_000): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, max) : null;
}

function language(value: unknown): string {
  const result = text(value, 2) ?? "az";
  return LANGUAGES.has(result) ? result : "az";
}

function providerStatus(value: unknown): string {
  const status = (text(value, 32) ?? "error").toLowerCase().replaceAll("-", "_");
  if (status === "failed") return "error";
  return new Set(["new", "success", "returned", "error", "server_error"]).has(status) ? status : "error";
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1));
  if (!value || typeof value !== "object") return typeof value === "string" ? value.slice(0, 2_000) : value;
  const output: Json = {};
  for (const [key, item] of Object.entries(value as Json).slice(0, 100)) {
    output[key] = /^(cvv|cvc|pan|private_key|secret|signature|card_number|card_id|cart_id|provider_card_id)$/i.test(key)
      ? "[redacted]"
      : redact(item, depth + 1);
  }
  return output;
}

function safeProviderUrl(value: unknown): string | null {
  const raw = text(value, 2_000);
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== "https:" || (url.hostname !== "epoint.az" && !url.hostname.endsWith(".epoint.az"))) {
    throw new Error("invalid_epoint_url");
  }
  return url.toString();
}

function amount(value: unknown): number {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) throw new Error("invalid_amount");
  return Number(result.toFixed(2));
}

function dbHeaders(secretKey: string): HeadersInit {
  return {
    apikey: secretKey,
    ...(secretKey.startsWith("eyJ") ? { Authorization: `Bearer ${secretKey}` } : {}),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Prefer: "return=representation",
  };
}

async function dbGet<T>(url: string, secretKey: string): Promise<T[]> {
  const response = await fetch(url, { headers: dbHeaders(secretKey) });
  if (!response.ok) throw new Error(`database_read_failed:${response.status}`);
  return await response.json() as T[];
}

async function dbWrite<T>(url: string, secretKey: string, method: string, body: Json): Promise<T[]> {
  const response = await fetch(url, { method, headers: dbHeaders(secretKey), body: JSON.stringify(body) });
  if (!response.ok) {
    console.error("Database write failed", response.status, (await response.text()).slice(0, 800));
    throw new Error("database_write_failed");
  }
  const raw = await response.text();
  return raw ? JSON.parse(raw) as T[] : [];
}

async function rpc(url: string, secretKey: string, name: string, body: Json): Promise<unknown> {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST", headers: dbHeaders(secretKey), body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`RPC ${name} failed`, response.status, (await response.text()).slice(0, 800));
    throw new Error("database_rpc_failed");
  }
  return await response.json();
}

async function epoint(endpoint: string, payload: Json, privateKey: string): Promise<Json> {
  const data = base64(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(privateKey, data);
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ data, signature }),
  });
  const raw = await response.text();
  let result: Json;
  try { result = JSON.parse(raw) as Json; } catch { throw new Error("epoint_invalid_response"); }
  if (!response.ok) throw new Error(`epoint_http_${response.status}`);
  return result;
}

interface Intent {
  id: string; user_id: string; merchant_order_id: string; amount: number | string; currency: string;
  description: string; status: string; provider_transaction_id?: string | null;
}
interface Card { id: string; user_id: string; provider_card_id: string; status: string; purpose: string; }
interface Operation { id: string; merchant_order_id?: string | null; payment_intent_id?: string | null; amount?: number | string | null; provider_transaction_id?: string | null; status: string; kind: string; }

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = allowedOrigin(origin);
  if (req.method === "OPTIONS") {
    if (origin && !cors) return reply({ error: "origin_not_allowed" }, 403, null);
    return new Response(null, { status: 204, headers: {
      ...(cors ? { "Access-Control-Allow-Origin": cors, Vary: "Origin" } : {}),
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400",
    }});
  }
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405, origin);
  if (origin && !cors) return reply({ error: "origin_not_allowed" }, 403, null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const anonKey = envJsonKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = envJsonKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization");
  if (!supabaseUrl || !publicKey || !privateKey || !anonKey || !secretKey) {
    return reply({ error: "payment_not_configured" }, 503, origin);
  }
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "authentication_required" }, 401, origin);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!userResponse.ok) return reply({ error: "authentication_required" }, 401, origin);
    const user = await userResponse.json() as { id?: string };
    if (!user.id) return reply({ error: "authentication_required" }, 401, origin);

    const roles = await dbGet<{ id: string }>(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=id&limit=1`, secretKey,
    );
    const isAdmin = roles.length > 0;
    const body = await req.json() as Json;
    const action = text(body.action, 64) ?? "";
    const lang = language(body.language);
    const callbackBase = new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az");
    const successUrl = new URL("/payment/success", callbackBase);
    const errorUrl = new URL("/payment/error", callbackBase);

    const loadIntent = async (allowCompleted = false): Promise<Intent> => {
      const id = text(body.payment_intent_id, 64);
      if (!id) throw new Error("payment_intent_required");
      const rows = await dbGet<Intent>(`${supabaseUrl}/rest/v1/payment_intents?id=eq.${encodeURIComponent(id)}&select=*`, secretKey);
      const intent = rows[0];
      if (!intent || (!isAdmin && intent.user_id !== user.id)) throw new Error("payment_intent_not_found");
      if (!allowCompleted && !new Set(["pending", "new", "processing"]).has(intent.status)) throw new Error("payment_intent_not_payable");
      return intent;
    };

    const loadCard = async (requiredPurpose = "payment"): Promise<Card> => {
      const id = text(body.saved_card_id, 64);
      if (!id) throw new Error("saved_card_required");
      const rows = await dbGet<Card>(`${supabaseUrl}/rest/v1/epoint_saved_cards?id=eq.${encodeURIComponent(id)}&select=*`, secretKey);
      const card = rows[0];
      if (!card || (!isAdmin && card.user_id !== user.id) || card.status !== "active") throw new Error("saved_card_not_found");
      if (requiredPurpose === "payment" && !new Set(["payment", "both"]).has(card.purpose)) throw new Error("card_purpose_invalid");
      if (requiredPurpose === "payout" && !new Set(["payout", "both"]).has(card.purpose)) throw new Error("card_purpose_invalid");
      return card;
    };

    const createOperation = async (kind: string, fields: Json): Promise<Operation> => {
      const rows = await dbWrite<Operation>(`${supabaseUrl}/rest/v1/epoint_api_operations`, secretKey, "POST", {
        kind, user_id: fields.user_id ?? user.id, created_by: user.id, status: "processing", ...fields,
      });
      if (!rows[0]) throw new Error("operation_create_failed");
      return rows[0];
    };

    const finishOperation = async (operation: Operation, result: Json, errorCode: string | null = null): Promise<void> => {
      const status = errorCode ? "error" : providerStatus(result.status);
      await dbWrite(`${supabaseUrl}/rest/v1/epoint_api_operations?id=eq.${operation.id}`, secretKey, "PATCH", {
        status,
        provider_transaction_id: text(result.transaction, 256),
        provider_invoice_id: text(result.id ?? result.invoice_id, 128),
        response_payload: redact(result),
        error_code: errorCode,
        error_message: text(result.message, 1_000),
        completed_at: FINAL_STATUSES.has(status) ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    };

    if (action === "card_registration") {
      const purpose = body.purpose === "payout" ? "payout" : body.purpose === "both" ? "both" : "payment";
      const operation = await createOperation(action, { request_payload: { language: lang, purpose } });
      successUrl.searchParams.set("card_registration", "success");
      errorUrl.searchParams.set("card_registration", "error");
      const result = await epoint("card-registration", {
        public_key: publicKey, language: lang, refund: purpose === "payment" ? 0 : 1,
        description: "EG Shop saxlanmÄ±ÅŸ kart qeydiyyatÄ±",
        success_redirect_url: successUrl.toString(), error_redirect_url: errorUrl.toString(),
      }, privateKey);
      const providerCardId = text(result.card_id ?? result.cart_id, 512);
      if (!providerCardId) { await finishOperation(operation, result, "card_id_missing"); throw new Error("card_registration_failed"); }
      const cards = await dbWrite<Card>(`${supabaseUrl}/rest/v1/epoint_saved_cards`, secretKey, "POST", {
        user_id: user.id, provider_card_id: providerCardId, purpose, status: "pending",
        card_mask: text(result.card_mask, 64), card_name: text(result.card_name, 128), provider_payload: redact(result),
      });
      await dbWrite(`${supabaseUrl}/rest/v1/epoint_api_operations?id=eq.${operation.id}`, secretKey, "PATCH", {
        saved_card_id: cards[0]?.id ?? null, status: providerStatus(result.status), response_payload: redact(result), updated_at: new Date().toISOString(),
      });
      return reply({ ok: true, operation_id: operation.id, saved_card_id: cards[0]?.id, redirect_url: safeProviderUrl(result.redirect_url) }, 200, origin);
    }

    if (action === "wallet_status") {
      const operation = await createOperation(action, { request_payload: {} });
      const result = await epoint("wallet/status", { public_key: publicKey }, privateKey);
      await finishOperation(operation, result);
      return reply({ ok: true, wallets: redact(result.wallets ?? result.data ?? result), operation_id: operation.id }, 200, origin);
    }

    if (action.startsWith("invoice_")) {
      if (!isAdmin) return reply({ error: "admin_required" }, 403, origin);
      const endpointMap: Record<string, string> = {
        invoice_create: "invoices/create", invoice_update: "invoices/update", invoice_view: "invoices/view",
        invoice_list: "invoices/list", invoice_send_sms: "invoices/send-sms", invoice_send_email: "invoices/send-email",
      };
      const endpoint = endpointMap[action];
      if (!endpoint) throw new Error("unknown_invoice_action");
      const input = body.invoice && typeof body.invoice === "object" && !Array.isArray(body.invoice) ? body.invoice as Json : {};
      const allowed = new Set(["id", "sum", "display", "save_as_template", "status_installment", "name", "description", "phone", "email", "inn", "contract_number", "merchant_order_id", "period_from", "period_to", "type", "order"]);
      const invoice: Json = { public_key: publicKey };
      for (const [key, value] of Object.entries(input)) if (allowed.has(key)) invoice[key] = value;
      if (action === "invoice_create" || action === "invoice_update") {
        invoice.sum = amount(invoice.sum);
        invoice.display = Number(invoice.display) === 0 ? 0 : 1;
        invoice.save_as_template = Number(invoice.save_as_template) === 1 ? 1 : 0;
        if (!text(invoice.period_from, 32) || !text(invoice.period_to, 32)) throw new Error("invoice_period_required");
      }
      const operation = await createOperation(action, { amount: invoice.sum ?? null, request_payload: redact(invoice) });
      const result = await epoint(endpoint, invoice, privateKey);
      await finishOperation(operation, result);
      return reply({ ok: providerStatus(result.status) === "success", result: redact(result), operation_id: operation.id }, 200, origin);
    }

    if (action === "refund_request") {
      if (!isAdmin) return reply({ error: "admin_required" }, 403, origin);
      const payoutId = text(body.payout_request_id, 64);
      if (!payoutId) throw new Error("payout_request_required");
      const payouts = await dbGet<{ id: string; seller_id: string; amount: number | string; status: string }>(
        `${supabaseUrl}/rest/v1/payout_requests?id=eq.${encodeURIComponent(payoutId)}&select=*`, secretKey,
      );
      const payout = payouts[0];
      if (!payout || !new Set(["pending", "approved", "processing"]).has(payout.status)) throw new Error("payout_not_payable");
      body.saved_card_id = text(body.saved_card_id, 64);
      const card = await loadCard("payout");
      if (card.user_id !== payout.seller_id) throw new Error("payout_card_owner_mismatch");
      const merchant = `op_${crypto.randomUUID()}`;
      const value = amount(payout.amount);
      const operation = await createOperation(action, {
        user_id: payout.seller_id, payout_request_id: payout.id, saved_card_id: card.id,
        merchant_order_id: merchant, amount: value, request_payload: { payout_request_id: payout.id },
      });
      const result = await epoint("refund-request", {
        public_key: publicKey, language: lang, card_id: card.provider_card_id, order_id: merchant,
        amount: value.toFixed(2), currency: "AZN", description: `EG Shop payout ${payout.id}`,
      }, privateKey);
      await finishOperation(operation, result);
      if (providerStatus(result.status) === "success") {
        await dbWrite(`${supabaseUrl}/rest/v1/payout_requests?id=eq.${payout.id}`, secretKey, "PATCH", {
          status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          admin_note: `Epoint: ${text(result.transaction, 256) ?? operation.id}`,
        });
      }
      return reply({ ok: providerStatus(result.status) === "success", result: redact(result), operation_id: operation.id }, 200, origin);
    }

    if (action === "reverse") {
      if (!isAdmin) return reply({ error: "admin_required" }, 403, origin);
      const intent = await loadIntent(true);
      if (intent.status !== "paid" || !intent.provider_transaction_id) throw new Error("payment_not_reversible");
      const reverseAmount = body.amount == null ? amount(intent.amount) : amount(body.amount);
      if (reverseAmount > amount(intent.amount)) throw new Error("reverse_amount_too_high");
      const operation = await createOperation(action, {
        user_id: intent.user_id, payment_intent_id: intent.id, amount: reverseAmount,
        request_payload: { original_payment_intent_id: intent.id, partial: reverseAmount < amount(intent.amount) },
      });
      const result = await epoint("reverse", {
        public_key: publicKey, language: lang, transaction: intent.provider_transaction_id,
        amount: reverseAmount.toFixed(2), currency: intent.currency,
      }, privateKey);
      await finishOperation(operation, result);
      if (providerStatus(result.status) === "success" && reverseAmount === amount(intent.amount)) {
        await rpc(supabaseUrl, secretKey, "apply_payment_intent_callback", {
          _merchant_order_id: intent.merchant_order_id, _amount: amount(intent.amount), _currency: intent.currency,
          _status: "returned", _provider_transaction_id: intent.provider_transaction_id,
          _message: text(result.message, 1_000) ?? "Epoint reverse",
        });
      }
      return reply({ ok: providerStatus(result.status) === "success", result: redact(result), operation_id: operation.id }, 200, origin);
    }

    if (action === "preauth_complete") {
      if (!isAdmin) return reply({ error: "admin_required" }, 403, origin);
      const sourceId = text(body.operation_id, 64);
      const rows = sourceId ? await dbGet<Operation>(`${supabaseUrl}/rest/v1/epoint_api_operations?id=eq.${encodeURIComponent(sourceId)}&kind=eq.preauth_request&select=*`, secretKey) : [];
      const source = rows[0];
      if (!source?.payment_intent_id || !source.provider_transaction_id || source.status !== "success") throw new Error("preauth_not_completable");
      body.payment_intent_id = source.payment_intent_id;
      const intent = await loadIntent();
      const operation = await createOperation(action, {
        user_id: intent.user_id, payment_intent_id: intent.id, amount: amount(intent.amount),
        request_payload: { preauth_operation_id: source.id },
      });
      const result = await epoint("pre-auth-complete", {
        public_key: publicKey, amount: amount(intent.amount).toFixed(2), transaction: source.provider_transaction_id,
      }, privateKey);
      await finishOperation(operation, result);
      if (providerStatus(result.status) === "success") {
        await rpc(supabaseUrl, secretKey, "apply_payment_intent_callback", {
          _merchant_order_id: intent.merchant_order_id, _amount: amount(intent.amount), _currency: intent.currency,
          _status: "success", _provider_transaction_id: source.provider_transaction_id,
          _message: text(result.message, 1_000) ?? "Epoint preauth completed",
        });
      }
      return reply({ ok: providerStatus(result.status) === "success", result: redact(result), operation_id: operation.id }, 200, origin);
    }

    const intent = await loadIntent(action === "get_status");
    const merchant = action === "get_status" ? intent.merchant_order_id : `op_${crypto.randomUUID()}`;
    successUrl.searchParams.set("payment_id", intent.id);
    errorUrl.searchParams.set("payment_id", intent.id);
    const paymentPayload: Json = {
      public_key: publicKey, amount: amount(intent.amount).toFixed(2), currency: intent.currency,
      language: lang, order_id: merchant, description: intent.description,
    };
    let endpoint = "";
    let savedCard: Card | null = null;

    if (action === "get_status") {
      endpoint = "get-status";
      delete paymentPayload.amount; delete paymentPayload.currency; delete paymentPayload.language; delete paymentPayload.description;
    } else if (action === "execute_pay") {
      endpoint = "execute-pay"; savedCard = await loadCard(); paymentPayload.card_id = savedCard.provider_card_id;
    } else if (action === "card_registration_with_pay") {
      endpoint = "card-registration-with-pay";
      paymentPayload.success_redirect_url = successUrl.toString(); paymentPayload.error_redirect_url = errorUrl.toString();
    } else if (action === "preauth_request") {
      endpoint = "pre-auth-request";
      paymentPayload.success_redirect_url = successUrl.toString(); paymentPayload.error_redirect_url = errorUrl.toString();
    } else if (action === "token_widget") {
      endpoint = "token/widget";
      delete paymentPayload.currency; delete paymentPayload.language;
    } else if (action === "wallet_payment") {
      endpoint = "wallet/payment";
      const walletId = text(body.wallet_id, 128); if (!walletId) throw new Error("wallet_required"); paymentPayload.wallet_id = walletId;
    } else if (new Set(["split_request", "split_execute_pay", "split_card_registration_with_pay"]).has(action)) {
      const settings = await dbGet<{ epoint_split_user: string | null; epoint_split_percent: number | string }>(
        `${supabaseUrl}/rest/v1/system_settings?select=epoint_split_user,epoint_split_percent&limit=1`, secretKey,
      );
      const splitUser = settings[0]?.epoint_split_user;
      const percent = Number(settings[0]?.epoint_split_percent ?? 0);
      if (!splitUser || percent <= 0 || percent > 100) throw new Error("split_not_configured");
      paymentPayload.split_user = splitUser;
      paymentPayload.split_amount = Number((amount(intent.amount) * percent / 100).toFixed(2)).toFixed(2);
      if (action === "split_request") endpoint = "split-request";
      if (action === "split_execute_pay") { endpoint = "split-execute-pay"; savedCard = await loadCard(); paymentPayload.card_id = savedCard.provider_card_id; }
      if (action === "split_card_registration_with_pay") endpoint = "split-card-registration-with-pay";
      if (action !== "split_execute_pay") {
        paymentPayload.success_redirect_url = successUrl.toString(); paymentPayload.error_redirect_url = errorUrl.toString();
      }
    } else {
      throw new Error("unsupported_action");
    }

    const operation = await createOperation(action, {
      user_id: intent.user_id, payment_intent_id: intent.id, saved_card_id: savedCard?.id ?? null,
      merchant_order_id: action === "get_status" ? null : merchant,
      amount: action === "get_status" ? null : amount(intent.amount), currency: intent.currency,
      request_payload: { payment_intent_id: intent.id, endpoint },
    });
    const result = await epoint(endpoint, paymentPayload, privateKey);
    await finishOperation(operation, result);

    if (new Set([
      "execute_pay", "card_registration_with_pay", "split_request", "split_execute_pay",
      "split_card_registration_with_pay", "wallet_payment",
    ]).has(action) && FINAL_STATUSES.has(providerStatus(result.status))) {
      await rpc(supabaseUrl, secretKey, "apply_payment_intent_callback", {
        _merchant_order_id: intent.merchant_order_id, _amount: amount(intent.amount), _currency: intent.currency,
        _status: providerStatus(result.status), _provider_transaction_id: text(result.transaction, 256),
        _message: text(result.message, 1_000),
      });
    }

    const returnedCardId = text(result.card_id ?? result.cart_id, 512);
    let savedCardId: string | null = null;
    if (returnedCardId && new Set(["card_registration_with_pay", "split_card_registration_with_pay"]).has(action)) {
      const cards = await dbWrite<Card>(`${supabaseUrl}/rest/v1/epoint_saved_cards`, secretKey, "POST", {
        user_id: intent.user_id, provider_card_id: returnedCardId, purpose: "payment", status: "pending",
        card_mask: text(result.card_mask, 64), card_name: text(result.card_name, 128), provider_payload: redact(result),
      });
      savedCardId = cards[0]?.id ?? null;
      if (savedCardId) await dbWrite(`${supabaseUrl}/rest/v1/epoint_api_operations?id=eq.${operation.id}`, secretKey, "PATCH", { saved_card_id: savedCardId });
    }

    if (action === "get_status" && FINAL_STATUSES.has(providerStatus(result.status))) {
      await rpc(supabaseUrl, secretKey, "apply_payment_intent_callback", {
        _merchant_order_id: intent.merchant_order_id, _amount: amount(intent.amount), _currency: intent.currency,
        _status: providerStatus(result.status), _provider_transaction_id: text(result.transaction, 256),
        _message: text(result.message, 1_000),
      });
    }

    return reply({
      ok: providerStatus(result.status) === "success",
      operation_id: operation.id, saved_card_id: savedCardId,
      redirect_url: safeProviderUrl(result.redirect_url), widget_url: safeProviderUrl(result.widget_url),
      result: redact(result),
    }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    console.error("Epoint operation failed", message);
    const clientErrors = new Set([
      "payment_intent_required", "payment_intent_not_found", "payment_intent_not_payable", "saved_card_required",
      "saved_card_not_found", "card_purpose_invalid", "payout_request_required", "payout_not_payable",
      "payout_card_owner_mismatch", "payment_not_reversible", "reverse_amount_too_high", "preauth_not_completable",
      "wallet_required", "split_not_configured", "unsupported_action", "invoice_period_required", "invalid_amount",
    ]);
    return reply({ error: clientErrors.has(message) ? message : "epoint_operation_failed" }, clientErrors.has(message) ? 400 : 502, origin);
  }
});


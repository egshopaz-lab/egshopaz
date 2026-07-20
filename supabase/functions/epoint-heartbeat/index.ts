const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const started = Date.now();

  try {
    const response = await fetch("https://epoint.az/api/heartbeat", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    const raw = await response.text();
    let provider: unknown = raw.slice(0, 500);
    try {
      provider = JSON.parse(raw);
    } catch {
      // Retain bounded text when the provider returns non-JSON content.
    }

    return new Response(
      JSON.stringify({
        ok: response.ok && (typeof provider !== "object" || provider === null || (provider as Record<string, unknown>).status === "ok"),
        provider_status: response.status,
        latency_ms: Date.now() - started,
        checked_at: new Date().toISOString(),
        provider,
      }),
      { status: response.ok ? 200 : 502, headers: JSON_HEADERS },
    );
  } catch (error) {
    console.error("Epoint heartbeat failed", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "epoint_unavailable",
        latency_ms: Date.now() - started,
        checked_at: new Date().toISOString(),
      }),
      { status: 503, headers: JSON_HEADERS },
    );
  }
});

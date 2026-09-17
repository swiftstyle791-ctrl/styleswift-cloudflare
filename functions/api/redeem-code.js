const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ valid: false, reason: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const code = (body.code || "").trim().toUpperCase();
  if (!code) {
    return new Response(JSON.stringify({ valid: false, reason: "missing_code" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const raw = await env.STYLESWIFT_KV.get(code);
  if (!raw) {
    return new Response(JSON.stringify({ valid: false, reason: "not_found" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const record = JSON.parse(raw);
  if (record.used) {
    return new Response(JSON.stringify({ valid: false, reason: "already_used" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const expiresAt = Date.now() + THIRTY_DAYS_MS;
  await env.STYLESWIFT_KV.put(code, JSON.stringify({
    ...record,
    used: true,
    redeemedAt: new Date().toISOString(),
    expiresAt
  }));

  return new Response(JSON.stringify({ valid: true, plan: record.plan, expiresAt }), {
    headers: { "Content-Type": "application/json" }
  });
}

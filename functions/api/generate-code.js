const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSegment(length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

function generateCode() {
  return `SS-${randomSegment(4)}-${randomSegment(4)}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const adminKey = env.STYLESWIFT_ADMIN_KEY;

  if (!adminKey) {
    return new Response(
      JSON.stringify({ error: "Server not configured: STYLESWIFT_ADMIN_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!key || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  let code;
  do {
    code = generateCode();
  } while (await env.STYLESWIFT_KV.get(code));

  await env.STYLESWIFT_KV.put(code, JSON.stringify({
    plan: "pro",
    used: false,
    createdAt: new Date().toISOString()
  }));

  return new Response(JSON.stringify({ code }), {
    headers: { "Content-Type": "application/json" }
  });
}

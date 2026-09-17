export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const adminKey = env.STYLESWIFT_ADMIN_KEY;

  if (!adminKey || !key || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const list = await env.STYLESWIFT_KV.list({ prefix: "signup:" });
  const records = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.STYLESWIFT_KV.get(k.name);
      return raw ? JSON.parse(raw) : null;
    })
  );
  const signups = records
    .filter(Boolean)
    .sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

  return new Response(JSON.stringify({ count: signups.length, signups }), {
    headers: { "Content-Type": "application/json" }
  });
}

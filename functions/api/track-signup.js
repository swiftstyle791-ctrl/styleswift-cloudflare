export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  await env.STYLESWIFT_KV.put("signup:" + id, JSON.stringify({
    studio: body.studio || "",
    email: body.email || "",
    signedUpAt: new Date().toISOString()
  }));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" }
  });
}

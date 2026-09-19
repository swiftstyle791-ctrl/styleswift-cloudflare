export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { strings, lang } = body;
  if (!Array.isArray(strings) || !lang) {
    return new Response(JSON.stringify({ error: "Missing strings or lang" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const langNames = { tw: "Twi", gaa: "Ga", ee: "Ewe" };
  const langName = langNames[lang];
  if (!langName) {
    return new Response(JSON.stringify({ error: "Unsupported language" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Cache key: this exact set of strings, for this language.
  // The quiz text is fixed/shared across every designer's clients,
  // so once translated, every future visitor in every studio reuses it —
  // Gemini only ever gets called once per language, total.
  const cacheKey = "i18n:" + lang + ":" + strings.join("|");
  const cached = await env.STYLESWIFT_KV.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { "Content-Type": "application/json" } });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server not configured: GEMINI_API_KEY missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const prompt = `Translate each of these ${strings.length} English UI strings into ${langName} (a Ghanaian language). ` +
    `Return ONLY a JSON array of ${strings.length} translated strings, in the same order, no other text, no markdown. ` +
    `Strings:\n` + JSON.stringify(strings);

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!geminiRes.ok) {
    return new Response(JSON.stringify({ error: "Translation service failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  const geminiData = await geminiRes.json();
  let raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  raw = raw.replace(/```json|```/g, "").trim();

  let translations;
  try {
    translations = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "Could not parse translation response" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = JSON.stringify({ translations });
  await env.STYLESWIFT_KV.put(cacheKey, result);

  return new Response(result, { headers: { "Content-Type": "application/json" } });
}

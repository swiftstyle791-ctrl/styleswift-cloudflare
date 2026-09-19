export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await request.json();
    const { text, targetLanguage } = body;

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: 'text' or 'targetLanguage'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is missing in Cloudflare settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert translator specializing in Ghanaian languages. Translate the following English text into ${targetLanguage}. Output ONLY the direct translation text with no additional explanations, intro text, or quotation marks:\n\n"${text}"`,
              },
            ],
          },
        ],
      }),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Gemini API call failed" }),
        { status: geminiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

    return new Response(
      JSON.stringify({ translation: translatedText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

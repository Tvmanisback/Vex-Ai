import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in to use VEX AI." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Your session is invalid. Please sign in again." }, 401);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured yet. Add GEMINI_API_KEY to your Supabase Edge Function secrets." }, 503);

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    if (!message || message.length > 8000) return json({ error: "Enter a message under 8,000 characters." }, 400);

    const contents = [
      ...history.filter((item: any) =>
        item && ["user", "model"].includes(item.role) &&
        Array.isArray(item.parts) &&
        item.parts.every((part: any) => typeof part.text === "string")
      ),
      { role: "user", parts: [{ text: message }] },
    ];

    const systemInstruction = { parts: [{ text: "You are VEX AI by FROSTAI: helpful, clear, warm, and capable with coding, learning, productivity, creative work, and supportive mental wellness conversations. Do not claim to be a licensed therapist or replace professional care. Explain homework so the user can learn. Be honest about uncertainty." }] };
    const models = ["gemini-3.8-flash", "gemini-3.6-flash"];
    let result: any = null;
    let response: Response | null = null;
    let lastError = "Unknown Gemini error";

    // Retry transient overload/rate-limit errors with exponential backoff,
    // then try a secondary stable model if the primary remains unavailable.
    for (const model of models) {
      let shouldTryFallback = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction,
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1800 },
              }),
            },
          );

          result = await response.json().catch(() => ({}));
          if (response.ok) break;

          const status = response.status;
          lastError = result?.error?.message ?? `HTTP ${status}`;
          const transient = status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
          if (!transient) {
            // Try the fallback model for model availability/capacity errors,
            // but don't retry permanent authentication or malformed requests.
            shouldTryFallback = status === 404 || status === 503 || /high demand|overload|unavailable|not available/i.test(lastError);
            break;
          }
          if (attempt < 2) {
            const delayMs = 1000 * (2 ** attempt) + Math.floor(Math.random() * 300);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            shouldTryFallback = true;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          if (attempt < 2) {
            const delayMs = 1000 * (2 ** attempt) + Math.floor(Math.random() * 300);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            shouldTryFallback = true;
          }
        }
      }

      if (response?.ok) break;
      console.error(`Gemini model ${model} failed:`, lastError);
      if (!shouldTryFallback) break;
      response = null;
      result = null;
    }

    if (!response?.ok) {
      return json({ error: "VEX is temporarily busy. Please try again in a moment." }, 502);
    }
    const text = result?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text ?? "").join("").trim();
    if (!text) return json({ error: "VEX returned an empty response. Try again." }, 502);
    return json({ reply: text });
  } catch (error) {
    console.error("VEX chat error:", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

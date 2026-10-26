import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
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

    // Generate a short, useful chat title from the user's opening message.
    if (body.action === "title") {
      const titlePrompt = "Create a concise title for this chat based on the user's message. Use 3–6 words, no quotation marks, no ending punctuation, and return only the title. User message: " + message;
      for (const model of ["gemini-3.8-flash", "gemini-3.6-flash"]) {
        try {
          const titleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(8000),
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: titlePrompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 24 },
              }),
            },
          );
          const titleResult = await titleResponse.json().catch(() => ({}));
          if (titleResponse.ok) {
            const title = titleResult?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("").trim()
              .replace(/^["'“”]+|["'“”]+$/g, "").replace(/[.!?]+$/g, "").slice(0, 64);
            if (title) return json({ title });
          }
        } catch (titleError) {
          console.error("Chat title generation failed:", titleError instanceof Error ? titleError.message : String(titleError));
        }
      }
      return json({ title: message.split(/\\s+/).slice(0, 6).join(" ").slice(0, 64) || "New chat" });
    }

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
    let sawHighDemand = false;

    // One bounded request per model: primary, then one fallback. Each request
    // is aborted after 8 seconds so a stalled provider cannot hang indefinitely.
    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
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
        if (/high demand|overload|resource exhausted|temporarily unavailable/i.test(lastError) || status === 429 || status === 503) {
          sawHighDemand = true;
        }

        // Only try the fallback for capacity, timeout, server, or model-not-found errors.
        const canFallback = status === 408 || status === 429 || status === 500 ||
          status === 502 || status === 503 || status === 504 || status === 404 ||
          /high demand|overload|unavailable|not available/i.test(lastError);
        if (!canFallback) break;
        response = null;
        result = null;
      } catch (error) {
        lastError = error instanceof Error
          ? (error.name === "AbortError" ? "Gemini request timed out after 8 seconds." : error.message)
          : String(error);
        sawHighDemand = true;
        response = null;
        result = null;
        // The next loop iteration is the single fallback attempt.
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!response?.ok) {
      if (sawHighDemand) {
        return json({ reply: "Vex Ai is on high demand :(, please try again later." });
      }
      return json({ error: "VEX is temporarily busy. Please try again in a moment." }, 502);
    }
    const text = result?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text ?? "").join("").trim();
    if (!text) return json({ error: "VEX returned an empty response. Try again." }, 502);
    return json({ reply: text });
  } catch (error) {
    console.error("VEX chat error:", error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error));
    return json({ error: "VEX encountered a server error. Please try again." }, 500);
  }
});

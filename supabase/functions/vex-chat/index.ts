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

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return json({ error: "Groq is not configured yet. Add GROQ_API_KEY to your Supabase Edge Function secrets." }, 503);

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    if (!message || message.length > 8000) return json({ error: "Enter a message under 8,000 characters." }, 400);

    const systemPrompt = "You are VEX AI by FROSTAI: helpful, clear, warm, and capable with coding, learning, productivity, creative work, and supportive mental wellness conversations. Do not claim to be a licensed therapist or replace professional care. Explain homework so the user can learn. Be honest about uncertainty.";

    if (body.action === "title") {
      const titlePrompt = "Create a concise title for this chat based on the user's message. Use 3–6 words, no quotation marks, no ending punctuation, and return only the title. User message: " + message;
      try {
        const titleResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              { role: "system", content: "Return only a short chat title of 3–6 words." },
              { role: "user", content: titlePrompt },
            ],
            temperature: 0.2,
            max_completion_tokens: 32,
          }),
        });
        const titleResult = await titleResponse.json().catch(() => ({}));
        if (titleResponse.ok) {
          const title = titleResult?.choices?.[0]?.message?.content?.trim()
            .replace(/^[\"'“”]+|[\"'“”]+$/g, "").replace(/[.!?]+$/g, "").slice(0, 64);
          if (title) return json({ title });
        }
        console.error("Groq title generation failed:", titleResponse.status, titleResult?.error?.message ?? "Unknown provider error");
      } catch (titleError) {
        console.error("Chat title generation failed:", titleError instanceof Error ? titleError.message : String(titleError));
      }
      return json({ title: message.split(/\s+/).slice(0, 6).join(" ").slice(0, 64) || "New chat" });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.filter((item: any) =>
        item && ["user", "model", "assistant"].includes(item.role) &&
        Array.isArray(item.parts) &&
        item.parts.every((part: any) => typeof part.text === "string")
      ).map((item: any) => ({
        role: item.role === "model" || item.role === "assistant" ? "assistant" : "user",
        content: item.parts.map((part: any) => part.text).join(""),
      })),
      { role: "user", content: message },
    ];

    let response: Response;
    let result: any;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          temperature: 0.7,
          max_completion_tokens: 1800,
        }),
      });
      result = await response.json().catch(() => ({}));
    } catch (error) {
      console.error("Groq chat request threw an error:", error instanceof Error ? error.message : String(error));
      return json({ error: "VEX could not reach Groq. Please try again in a moment." }, 502);
    }

    if (!response.ok) {
      const providerError = result?.error?.message ?? "HTTP " + response.status;
      console.error("Groq chat request failed:", response.status, providerError);
      if (response.status === 429) {
        return json({ error: "Groq is rate-limiting requests right now. Wait a little and try again, or check your Groq limits." }, 503);
      }
      if (response.status === 401 || response.status === 403) {
        return json({ error: "Groq rejected the API key. Check that GROQ_API_KEY is set correctly in Supabase Edge Function secrets." }, 502);
      }
      return json({ error: "Groq request failed: " + providerError.slice(0, 180) }, 502);
    }

    const reply = result?.choices?.[0]?.message?.content?.trim();
    if (!reply) return json({ error: "VEX returned an empty response. Try again." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("VEX chat error:", error instanceof Error ? error.name + ": " + error.message + "\n" + (error.stack ?? "") : String(error));
    return json({ error: "VEX encountered a server error. Please try again." }, 500);
  }
});

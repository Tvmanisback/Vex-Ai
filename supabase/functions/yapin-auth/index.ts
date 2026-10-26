import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://tvmanisback.github.io/Vex-Ai/";
const CLIENT_ID = Deno.env.get("YAPIN_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("YAPIN_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STATE_SECRET = Deno.env.get("YAPIN_STATE_SECRET") ?? "";
const CALLBACK_URL = SUPABASE_URL + "/functions/v1/yapin-auth/callback";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(STATE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
async function hash(value: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
function go(url: string) { return Response.redirect(url, 302); }

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!CLIENT_ID || !CLIENT_SECRET || !SERVICE_KEY || !STATE_SECRET) {
    return new Response("Missing function secrets: YAPIN_CLIENT_ID, YAPIN_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY, YAPIN_STATE_SECRET", { status: 503 });
  }

  if (url.pathname.endsWith("/start") || url.pathname.endsWith("/yapin-auth")) {
    const payload = b64url(new TextEncoder().encode(JSON.stringify({ nonce: crypto.randomUUID(), time: Date.now() })));
    const state = payload + "." + await hmac(payload);
    const auth = new URL("https://www.yapin.gg/oauth/authorize");
    auth.search = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: CALLBACK_URL, response_type: "code", scope: "identify", state }).toString();
    return go(auth.toString());
  }
  if (!url.pathname.endsWith("/callback")) return new Response("Not found", { status: 404 });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const parts = state.split(".");
  if (!code || parts.length !== 2 || !(await hmac(parts[0])).split("").every((c, i) => c === parts[1][i]) || parts[1].length !== (await hmac(parts[0])).length) {
    return go(SITE_URL + "?yapin_error=invalid_state");
  }

  try {
    const payload = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload + "=".repeat((4 - payload.length % 4) % 4));
    const stateData = JSON.parse(decoded);
    if (!stateData.time || Date.now() - stateData.time > 10 * 60 * 1000) return go(SITE_URL + "?yapin_error=state_expired");

    const tokenRes = await fetch("https://www.yapin.gg/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK_URL, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const token = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || typeof token.access_token !== "string") {
      console.error("Yapin token exchange failed:", tokenRes.status, JSON.stringify(token).slice(0, 300));
      return go(SITE_URL + "?yapin_error=token_exchange");
    }
    const meRes = await fetch("https://www.yapin.gg/api/oauth/me", { headers: { Authorization: "Bearer " + token.access_token } });
    const me = await meRes.json().catch(() => ({}));
    if (!meRes.ok || (typeof me.id !== "string" && typeof me.id !== "number")) {
      console.error("Yapin /me failed:", meRes.status);
      return go(SITE_URL + "?yapin_error=identity");
    }

    const identity = String(me.id);
    const email = "yapin-" + await hash(identity) + "@accounts.vexai.invalid";
    const password = await hmac("vex-yapin-login:" + identity);
    const username = String(me.username || me.display_name || "yapin_user").replace(/[^A-Za-z0-9_]/g, "").slice(0, 24) || "yapin_user";
    let result = await admin.auth.signInWithPassword({ email, password });
    if (result.error) {
      const created = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: {
          username, auth_provider: "yapin", yapin_id: identity,
          display_name: String(me.display_name || me.username || "").slice(0, 80),
          avatar_url: typeof me.avatar_url === "string" ? me.avatar_url.slice(0, 500) : null,
        },
      });
      if (created.error && !/already|exists/i.test(created.error.message)) {
        console.error("Could not create Supabase user:", created.error.message);
        return go(SITE_URL + "?yapin_error=account_creation");
      }
      result = await admin.auth.signInWithPassword({ email, password });
    }
    if (result.error || !result.data.session) {
      console.error("Could not create Supabase session:", result.error?.message ?? "session missing");
      return go(SITE_URL + "?yapin_error=session");
    }
    const session = result.data.session;
    const fragment = new URLSearchParams({ access_token: session.access_token, refresh_token: session.refresh_token, token_type: "bearer" });
    return go(SITE_URL + "#" + fragment.toString());
  } catch (error) {
    console.error("Yapin callback failed:", error instanceof Error ? error.message : String(error));
    return go(SITE_URL + "?yapin_error=server");
  }
});

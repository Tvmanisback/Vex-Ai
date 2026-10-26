# FROSTAI — VEX AI

A dark, cosmic-themed AI assistant website with email/password registration, unique usernames, Google sign-in, and a Gemini-powered chat endpoint protected by Supabase Auth.

## Stack

- React + Vite
- Supabase Auth (email/password + Google OAuth)
- Supabase Postgres + Row Level Security for user profiles
- Supabase Edge Function for Gemini calls (the Gemini key stays server-side)
- Responsive cosmic/orbital VEX mark, dark and light workspace themes

## 1. Create your Supabase project

Create a project at https://supabase.com/dashboard.

In **SQL Editor**, run the complete file `supabase/schema.sql`. It creates the `profiles` table, enforces username format/uniqueness, enables RLS, and creates a profile automatically when a new email or Google account is created.

## 2. Configure the frontend

Copy `.env.example` to `.env` and fill in the values from **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the publishable/anon key only. Never expose a service-role or secret key in browser code.

## 3. Enable email and Google login

In Supabase Dashboard:

1. Open **Authentication → Providers** and enable **Email**.
2. Enable **Google** and enter the OAuth Client ID and Client Secret from Google Cloud Console.
3. In **Authentication → URL Configuration**, set your local Site URL to `http://localhost:5173` while developing.
4. Add `http://localhost:5173` and your deployed website origin to the allowed redirect URLs.
5. In Google Cloud Console, configure the OAuth consent screen and add the Supabase callback URL shown by the Google provider settings as an authorized redirect URI.

Email confirmation may be enabled. If it is, new users must confirm their email before they can sign in. Google sign-in can be used after its provider is configured.

## 4. Set up Gemini chat securely

Create a Gemini API key in Google AI Studio. Do **not** put it in `.env` or any `VITE_*` variable.

Install the Supabase CLI, sign in, and link the project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
supabase functions deploy vex-chat
```

The function validates the Supabase user session before sending a prompt to Gemini. It uses the `gemini-2.5-flash` model; change the model in `supabase/functions/vex-chat/index.ts` if needed. Gemini usage and quotas are controlled by your Google AI Studio project.

## 5. Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Build a production bundle with:

```bash
npm run build
npm run preview
```

For Netlify, Vercel, or another static host, set the two `VITE_SUPABASE_*` environment variables in that host's project settings and deploy the Vite build. Configure the deployed origin in Supabase Auth redirect URLs.

## Security notes

- Supabase Auth handles password hashing and sessions; the app never stores raw passwords.
- Profile rows are protected by Row Level Security. Users can only read their own profile.
- The Gemini key belongs in Supabase Edge Function secrets only.
- Keep production rate limits and billing alerts enabled for your Gemini API and Supabase project.
- VEX is a general-purpose assistant, not a substitute for licensed mental-health care or emergency support.

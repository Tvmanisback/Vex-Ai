# FROSTAI — VEX AI

A futuristic AI assistant website with Supabase authentication.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and add your Supabase project URL and anon/publishable key.
4. In Supabase Authentication settings, enable Email and Google providers and set the Site URL / redirect URLs.
5. Install dependencies with `npm install` and start with `npm run dev`.

Never put a Supabase service-role key in frontend code. Google OAuth requires Google provider configuration in Supabase and Google Cloud Console.

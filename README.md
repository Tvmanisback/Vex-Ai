# VEX AI

**Your space to think bigger.**

VEX AI is an AI assistant from **FROSTAI**, designed to help you think through ideas, learn new things, write, code, and get work done — all in one focused workspace.

## ✨ What you can do

- **Chat with VEX** — ask questions, explore ideas, and work through problems.
- **Get help with coding** — understand concepts, debug errors, and plan projects.
- **Learn step by step** — break down unfamiliar topics into manageable explanations.
- **Write and plan** — brainstorm, organize tasks, and shape your ideas.
- **Sign in your way** — use email and password or Google sign-in.
- **Make it yours** — choose between dark and light appearance.
- **Keep your account private** — sign in to access your own workspace.

## 🚀 Deploy VEX AI without a GitHub Actions workflow

This repository is a React + Vite app. GitHub Pages cannot run the source file `src/main.jsx` directly. It needs a production build, and this repository intentionally does not use a YAML workflow.

The project is already configured for Vercel in `vercel.json`. To publish it without adding a workflow:

1. Open [Vercel](https://vercel.com/) and sign in with GitHub.
2. Choose **Add New → Project**, then import **Tvmanisback/Vex-Ai**.
3. Keep the detected Vite settings. The repository's `vercel.json` specifies `npm install`, `npm run build`, and `dist` as the output directory.
4. Click **Deploy**. Vercel builds the app from the source and publishes the generated site.
5. In Supabase → Authentication → URL Configuration, set the Vercel deployment URL as the **Site URL** and add it to **Redirect URLs**. Keep your local or other production URLs there too if needed.
6. In Supabase → Authentication → Providers, make sure Google is enabled and its OAuth redirect URL matches the Supabase callback URL shown by Supabase.

The Supabase project URL and publishable key are public browser configuration. Never put a Supabase service-role key or Gemini API key in frontend files. The Gemini key belongs in the Supabase Edge Function secret settings.

## 🔐 Privacy and important information

VEX AI uses Supabase to manage accounts and Gemini to generate AI responses. Messages you send are processed by the AI service to create replies. Do not enter passwords, payment details, or other sensitive information into chat.

AI responses can be inaccurate or out of date. Verify important information before relying on it.

## 🛠️ Having trouble?

- **The GitHub Pages URL is blank:** GitHub Pages is serving Vite source files rather than a production build. Do not publish the repository root as a static page. Deploy with the Vercel steps above, or publish the generated `dist` folder using a build-capable host.
- **Can't sign in with Google:** enable Google in Supabase Authentication → Providers and configure the authorized redirect URLs in Google Cloud and Supabase.
- **Can't create an account:** check the email address and look for a confirmation message.
- **VEX doesn't reply:** confirm the Supabase Edge Function named `vex-chat` is deployed and its `GEMINI_API_KEY` secret is configured; check function logs and Gemini quota if it still fails.

Never post passwords, API keys, access tokens, or other secrets in an issue.

## About FROSTAI

VEX AI is a FROSTAI project built to give people a useful place to ask questions, explore ideas, and get started on their next big thing.

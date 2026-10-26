import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages builds use /Vex-Ai/; Vercel/Netlify use the domain root.
  base: process.env.GITHUB_PAGES === 'true' ? '/Vex-Ai/' : '/',
});

import { createClient } from '@supabase/supabase-js';

// These are the public Supabase project URL and publishable key.
// Publishable/anon keys are designed for browser use; protect data with RLS.
// Never place a service-role key or Gemini API key in frontend code.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvtigczxiqunchwwypvf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2HEE0R0PGXP-NOBwsRuqCw_7G4KiEdR';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let instance: SupabaseClient | undefined;
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Daily is not connected yet. Please configure the Supabase project.');
  // All private data is requested in the browser with the user's JWT and RLS.
  // No service role, server data cache, or shared authenticated client on server.
  if (!instance) instance = createClient(url, key);
  return instance;
}

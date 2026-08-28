import { createClient } from '@supabase/supabase-js';

export function createServerSupabase(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'mission-english-rag/0.1' } },
  });
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function initSupabase(): Promise<SupabaseClient> {
  const response = await fetch('/api/config/supabase');
  if (!response.ok) {
    throw new Error('Failed to fetch Supabase config');
  }
  const config = await response.json();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  if (!initPromise) {
    initPromise = initSupabase().then(client => {
      supabaseInstance = client;
      return client;
    });
  }
  
  return initPromise;
}

export { supabaseInstance };

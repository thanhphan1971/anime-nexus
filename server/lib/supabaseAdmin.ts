import { createClient, SupabaseClient } from '@supabase/supabase-js';

const isProd = process.env.APP_RUNTIME === 'prod';

const supabaseUrl = isProd
  ? (process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL)
  : (process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL);
const supabaseServiceRoleKey = isProd
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY)
  : (process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseServiceRoleKey);

if (!SUPABASE_CONFIGURED) {
  console.warn('[MIGRATION MODE] Supabase credentials not found - auth will be stubbed');
} else {
  console.log(`[Supabase] Configured (prod=${isProd})`);
}

export const supabaseAdmin: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null as any;

export const isSupabaseConfigured = SUPABASE_CONFIGURED;

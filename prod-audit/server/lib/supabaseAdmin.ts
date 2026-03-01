import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Treat deployed runtime as production. APP_RUNTIME was unreliable (often unset in Replit deploys).
const isProd =
  process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT;

// In production: prefer PRODUCTION keys, with SB_* fallbacks (Replit secret injection can be flaky).
// In dev: allow DEV_* first, then fall back to non-dev.
const supabaseUrl = isProd
  ? (process.env.SUPABASE_URL || process.env.SB_URL)
  : (process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SB_URL);

const supabaseServiceRoleKey = isProd
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SB_SERVICE)
  : (
      process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SB_SERVICE
    );

// Presence-only debug (safe)
console.log('[ENV] NODE_ENV =', process.env.NODE_ENV);
console.log('[ENV] APP_RUNTIME =', process.env.APP_RUNTIME);
console.log('[ENV] SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('[ENV] SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('[ENV] SB_URL present:', !!process.env.SB_URL);
console.log('[ENV] SB_SERVICE present:', !!process.env.SB_SERVICE);

const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseServiceRoleKey);

if (!SUPABASE_CONFIGURED) {
  console.warn('[MIGRATION MODE] Supabase credentials not found - auth will be stubbed');
} else {
  console.log(`[Supabase] Configured (isProd=${isProd})`);
}


export const supabaseAdmin: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    : (null as unknown as SupabaseClient);


export const isSupabaseConfigured = SUPABASE_CONFIGURED;

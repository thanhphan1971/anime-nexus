import { createClient } from '@supabase/supabase-js';

const isDev = process.env.NODE_ENV === 'development';

const supabaseUrl = isDev 
  ? process.env.DEV_SUPABASE_URL 
  : process.env.SUPABASE_URL;
const supabaseServiceRoleKey = isDev 
  ? process.env.DEV_SUPABASE_SERVICE_ROLE_KEY 
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(`Missing Supabase server environment variables (${isDev ? 'DEV_' : ''}SUPABASE_URL, ${isDev ? 'DEV_' : ''}SUPABASE_SERVICE_ROLE_KEY)`);
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

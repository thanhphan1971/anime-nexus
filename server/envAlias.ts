// server/envAlias.ts
// Runs as soon as imported.

if (!process.env.SUPABASE_URL && process.env.SB_URL) {
  process.env.SUPABASE_URL = process.env.SB_URL;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SB_SERVICE) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SB_SERVICE;
}
// Also provide legacy SB_* names when only SUPABASE_* are set
if (!process.env.SB_URL && process.env.SUPABASE_URL) {
  process.env.SB_URL = process.env.SUPABASE_URL;
}

if (!process.env.SB_SERVICE && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

console.log("[ENV ALIAS]", {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});
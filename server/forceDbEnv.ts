import { URL } from "url";

// =====================================================
// Force Supabase over Replit Neon injection
// Runs at import-time (before the rest of the app imports)
// =====================================================
(() => {
  const sbUrl = (process.env.SB_DB_URL || "").trim();

  console.log("[DB] SB_DB_URL present:", !!sbUrl);

  if (!sbUrl) {
    console.warn("[DB] SB_DB_URL missing — leaving DATABASE_URL/PG* as provided");
    return;
  }

  try {
    const u = new URL(sbUrl);

    // Force ORMs / db libs to use Supabase
    process.env.DATABASE_URL = sbUrl;

    // Force PG* too (Replit injects Neon)
    process.env.PGHOST = u.hostname;
    process.env.PGPORT = u.port || "5432";
    process.env.PGDATABASE = (u.pathname || "").replace(/^\//, "") || "postgres";
    process.env.PGUSER = decodeURIComponent(u.username || "");
    process.env.PGPASSWORD = decodeURIComponent(u.password || "");

    if (!process.env.PGSSLMODE) process.env.PGSSLMODE = "require";

    console.log("[DB] Forced DB from SB_DB_URL", {
      host: u.hostname,
      database: process.env.PGDATABASE,
    });
  } catch (e) {
    console.error("[FATAL] Invalid SB_DB_URL:", e);
    throw e;
  }
})();
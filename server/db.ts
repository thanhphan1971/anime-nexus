import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

/**
 * Replit production may overwrite DATABASE_URL with Neon.
 * We prefer SB_DB_URL in prod (set it to Supabase Direct or Session Pooler URI).
 *
 * IMPORTANT:
 * - In prod, we DO NOT hard-crash if the DB is not Supabase, because Replit may force Neon.
 *   We log a loud warning and continue so the service can boot.
 * - Once secrets stabilize, you can re-enable strict Supabase-only enforcement.
 */

const isProdRuntime = process.env.APP_RUNTIME === "prod" || process.env.NODE_ENV === "production";

function safeHost(urlStr: string): string {
  try {
    return new URL(urlStr).host;
  } catch {
    return "";
  }
}

function isSupabaseHost(host: string): boolean {
  // Supabase direct: db.<ref>.supabase.co
  // Supabase session pooler (IPv4): *.pooler.supabase.com
  return host.includes("supabase.co") || host.includes("pooler.supabase.com");
}

function getDatabaseUrl(): { url: string; source: "SB_DB_URL" | "DATABASE_URL" | "PG*" } {
  // -----------------------------
  // PROD: prefer SB_DB_URL, fallback DATABASE_URL
  // -----------------------------
  if (isProdRuntime) {
    const sb = (process.env.SB_DB_URL || "").trim();
    const db = (process.env.DATABASE_URL || "").trim();

    const source: "SB_DB_URL" | "DATABASE_URL" = sb ? "SB_DB_URL" : "DATABASE_URL";
    const raw = (sb || db || "").trim();

    // Safe debug (no values leaked)
    console.log("[DB] isProdRuntime =", true);
    console.log("[DB] SB_DB_URL present:", !!sb);
    console.log("[DB] DATABASE_URL host:", safeHost(db));
    console.log("[DB] Source:", source);

    if (!raw) {
      throw new Error("Missing DB connection in prod: set SB_DB_URL or DATABASE_URL.");
    }

    const host = safeHost(raw);
    if (!host) {
      throw new Error("Production DB misconfigured: SB_DB_URL / DATABASE_URL is not a valid URL.");
    }

    if (!isSupabaseHost(host)) {
      // DO NOT CRASH: Replit may be forcing Neon. Boot anyway so healthcheck can pass.
      console.warn("============================================================");
      console.warn("[DB] WARNING: Production DB host is NOT Supabase.");
      console.warn("[DB] Host =", host);
      console.warn("[DB] This is usually because Replit forces Neon into DATABASE_URL");
      console.warn("[DB] Fix by setting SB_DB_URL to your Supabase connection string.");
      console.warn("============================================================");
    } else {
      console.log("[DB] Production DB looks like Supabase:", host);
    }

    return { url: raw, source };
  }

  // -----------------------------
  // DEV: DATABASE_URL preferred, then PG*
  // -----------------------------
  const raw = (process.env.DATABASE_URL || "").trim();
  if (raw) {
    console.log("[DB] isProdRuntime =", false);
    console.log("[DB] Source: DATABASE_URL");
    console.log("[DB] Host:", safeHost(raw) || "(invalid url)");
    return { url: raw, source: "DATABASE_URL" };
  }

  const host = (process.env.PGHOST || "").trim();
  const port = (process.env.PGPORT || "5432").trim();
  const db = (process.env.PGDATABASE || "postgres").trim();
  const user = (process.env.PGUSER || "").trim();
  const pass = (process.env.PGPASSWORD || "").trim();

  if (host && user && pass) {
    const url = new URL(
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`
    );
    url.searchParams.set("sslmode", "require");

    console.log("[DB] isProdRuntime =", false);
    console.log("[DB] Source: PG*");
    console.log("[DB] Host:", safeHost(url.toString()) || "(invalid url)");

    return { url: url.toString(), source: "PG*" };
  }

  throw new Error("Missing DB connection. Set DATABASE_URL or PG*.");
}

const { url: connectionString, source } = getDatabaseUrl();
const effectiveHost = safeHost(connectionString) || "(invalid url)";

// Final, single-line summary (safe)
console.log("[DB] Using host:", effectiveHost, "| source:", source);

// Pool SSL:
// - Supabase requires SSL in production.
// - Neon also typically works with SSL.
// - In dev, keep it simple.
const pool = new pg.Pool({
  connectionString,
  ssl: isProdRuntime ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);
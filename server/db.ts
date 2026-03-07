import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

/**
 * DB selection policy
 *
 * PROD:
 *   1) SB_DB_URL
 *   2) SUPABASE_DATABASE_URL
 *   3) DATABASE_URL
 *
 * DEV:
 *   1) DATABASE_URL
 *   2) PG*
 *
 * Notes:
 * - Replit production may inject/override DATABASE_URL or PG*.
 * - We want one single, explicit selected connection string.
 * - We log only safe metadata: source, host, db name, runtime.
 */

const isProdRuntime = process.env.APP_RUNTIME === "prod";

type DbSource =
  | "SB_DB_URL"
  | "SUPABASE_DATABASE_URL"
  | "DATABASE_URL"
  | "PG*";

function safeParseUrl(urlStr: string): URL | null {
  try {
    return new URL(urlStr);
  } catch {
    return null;
  }
}

function isSupabaseHost(host: string): boolean {
  return host.includes("supabase.co") || host.includes("pooler.supabase.com");
}

function buildPgUrlFromParts(): string {
  const host = (process.env.PGHOST || "").trim();
  const port = (process.env.PGPORT || "5432").trim();
  const database = (process.env.PGDATABASE || "postgres").trim();
  const user = (process.env.PGUSER || "").trim();
  const password = (process.env.PGPASSWORD || "").trim();

  if (!host || !user || !password) {
    throw new Error("Missing PG* connection pieces. Need PGHOST, PGUSER, PGPASSWORD.");
  }

  const url = new URL(
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  );
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

function getDatabaseConfig(): { url: string; source: DbSource } {
  if (isProdRuntime) {
    const sb = (process.env.SB_DB_URL || "").trim();
    const sbAlt = (process.env.SUPABASE_DATABASE_URL || "").trim();
    const db = (process.env.DATABASE_URL || "").trim();

    if (sb) {
      return { url: sb, source: "SB_DB_URL" };
    }
    if (sbAlt) {
      return { url: sbAlt, source: "SUPABASE_DATABASE_URL" };
    }
    if (db) {
      return { url: db, source: "DATABASE_URL" };
    }

    throw new Error(
      "Missing DB connection in prod. Set SB_DB_URL, SUPABASE_DATABASE_URL, or DATABASE_URL."
    );
  }

  const db = (process.env.DATABASE_URL || "").trim();
  if (db) {
    return { url: db, source: "DATABASE_URL" };
  }

  return { url: buildPgUrlFromParts(), source: "PG*" };
}

const { url: connectionString, source } = getDatabaseConfig();
const parsed = safeParseUrl(connectionString);

if (!parsed) {
  throw new Error(`Selected DB URL from ${source} is invalid.`);
}

const selectedHost = parsed.host;
const selectedDb = parsed.pathname.replace(/^\//, "") || "postgres";

console.log("[DB SELECT]", {
  appRuntime: process.env.APP_RUNTIME,
  isProdRuntime,
  hasSbDbUrl: !!(process.env.SB_DB_URL || "").trim(),
  hasSupabaseDatabaseUrl: !!(process.env.SUPABASE_DATABASE_URL || "").trim(),
  hasDatabaseUrl: !!(process.env.DATABASE_URL || "").trim(),
  hasPgHost: !!(process.env.PGHOST || "").trim(),
  selectedSource: source,
  selectedHost,
  selectedDatabase: selectedDb,
});
console.log("[DB SELECT MARKER]", "be5afa0-live");

if (isProdRuntime) {
  if (!isSupabaseHost(selectedHost)) {
    console.warn("============================================================");
    console.warn("[DB] WARNING: selected production DB host does NOT look like Supabase");
    console.warn("[DB] selectedSource =", source);
    console.warn("[DB] selectedHost =", selectedHost);
    console.warn("============================================================");
  } else {
    console.log("[DB] Production DB looks like Supabase:", selectedHost);
  }
}

// Important: pass the full connection string directly.
// This preserves query params like sslmode, pooler options, etc.

const pool = new pg.Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  database: parsed.pathname.replace(/^\//, "") || "postgres",
  user: decodeURIComponent(parsed.username || ""),
  password: decodeURIComponent(parsed.password || ""),
  ssl: isProdRuntime
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

pool.on("error", (err) => {
  console.error("[DB POOL] unexpected error:", err);
});

export const db = drizzle(pool);
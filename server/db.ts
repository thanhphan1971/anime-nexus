import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const isProdRuntime = process.env.APP_RUNTIME === "prod";

function buildProdSupabasePgUrl() {
  const host = (process.env.PGHOST || "").trim();
  const port = (process.env.PGPORT || "5432").trim();
  const db = (process.env.PGDATABASE || "postgres").trim();
  const user = (process.env.PGUSER || "postgres").trim();
  const pass = (process.env.PGPASSWORD || "").trim();

  if (!host || !user || !pass) return "";

  const url = new URL(`postgresql://${user}:${pass}@${host}:${port}/${db}`);
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

const prodUrl = buildProdSupabasePgUrl();

if (isProdRuntime && !prodUrl) {
  throw new Error(
    "Production DB misconfigured: PGHOST/PGUSER/PGPASSWORD must be set to Supabase."
  );
}

const connectionString = isProdRuntime
  ? prodUrl
  : process.env.DATABASE_URL || prodUrl;

if (!connectionString || !connectionString.trim()) {
  throw new Error("Missing DB connection.");
}

// Safe host log (no passwords)
try {
  console.log("[DB] Using host:", new URL(connectionString).hostname);
} catch {
  console.log("[DB] Invalid database URL format");
}

const pool = new pg.Pool({
  connectionString,
  ssl: isProdRuntime ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);
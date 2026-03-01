import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const isProdRuntime = process.env.APP_RUNTIME === "prod";

// --------------------------------------------------
// Choose the correct database URL
// Replit injects DATABASE_URL (Neon) in production.
// We ignore it and use SUPABASE_DATABASE_URL instead.
// --------------------------------------------------
const connectionString =
  (isProdRuntime ? process.env.SUPABASE_DATABASE_URL : process.env.DATABASE_URL) ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString || !connectionString.trim()) {
  throw new Error(
    "No database connection string. Set SUPABASE_DATABASE_URL for production."
  );
}

// Safe host log (no passwords)
try {
  const host = new URL(connectionString).hostname;
  console.log("[DB] Using host:", host);
} catch {
  console.log("[DB] Invalid database URL format");
}

const pool = new pg.Pool({
  connectionString,
  ssl: isProdRuntime ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);
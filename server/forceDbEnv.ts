// server/forceDbEnv.ts

function forceDbEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const forcedDbUrl =
    "postgresql://postgres.ufebwbmfbsbluxcshyfi:Vinhlong40supabasedatabase@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

  process.env.DATABASE_URL = forcedDbUrl;
  process.env.SB_DB_URL = forcedDbUrl;
  process.env.SUPABASE_DATABASE_URL = forcedDbUrl;

  try {
    const url = new URL(forcedDbUrl);

    process.env.PGHOST = url.hostname;
    process.env.PGPORT = url.port || "5432";
    process.env.PGUSER = decodeURIComponent(url.username);
    process.env.PGPASSWORD = decodeURIComponent(url.password);
    process.env.PGDATABASE = url.pathname.replace(/^\//, "") || "postgres";

    console.log("[DB FORCE OVERRIDE]", {
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSbDbUrl: !!process.env.SB_DB_URL,
      hasSupabaseDatabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
    });
  } catch (error) {
    console.error("[DB FORCE OVERRIDE ERROR]", error);
  }
}

forceDbEnv();

export {};
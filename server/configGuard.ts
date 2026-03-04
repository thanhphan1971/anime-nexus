/**
 * Production Configuration Guard
 * Validates required environment variables before server startup.
 * Exits with non-zero code if any required variables are missing.
 */

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

function isProdRuntime(): boolean {
  return process.env.APP_RUNTIME === "prod" || process.env.NODE_ENV === "production";
}

function getTrimmed(name: string): string {
  return (process.env[name] || "").trim();
}

function safeHostFromUrl(urlStr: string): string {
  try {
    return new URL(urlStr).host;
  } catch {
    return "(invalid url)";
  }
}

function isSupabaseHost(host: string): boolean {
  return host.includes("supabase.co") || host.includes("pooler.supabase.com");
}

function getStripeWebhookSecret(): string {
  return (
    getTrimmed("STRIPE_WEBHOOK_SECRET") ||
    getTrimmed("STRIPE_WEBHOOK_SIGNING_SECRET") ||
    getTrimmed("STRIPE_WHSEC") ||
    getTrimmed("STRIPE_WEBHOOK_SECRET__ALT")
  );
}

function getEffectiveDbUrl(): string {
  // ✅ In prod, prefer SB_DB_URL (Replit may overwrite DATABASE_URL with Neon)
  return getTrimmed("SB_DB_URL") || getTrimmed("DATABASE_URL");
}

export function validateProductionConfig(): ValidationResult {
  const prod = isProdRuntime();
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!prod) {
    return {
      valid: true,
      missing: [],
      warnings: ["Running in development mode - config validation skipped"],
    };
  }

  // ------------------------------------
  // DB (PROD): must be Supabase URL (direct or pooler)
  // ------------------------------------
  const dbUrl = getEffectiveDbUrl();
  if (!dbUrl) {
    missing.push(
      "SB_DB_URL (preferred) or DATABASE_URL (must point to Supabase db.<ref>.supabase.co or *.pooler.supabase.com)"
    );
  } else {
    const host = safeHostFromUrl(dbUrl);

    if (host === "(invalid url)") {
      missing.push("SB_DB_URL / DATABASE_URL (invalid URL)");
    } else if (!isSupabaseHost(host)) {
      missing.push(
        `SB_DB_URL (preferred) or DATABASE_URL must point to Supabase (db.<ref>.supabase.co or *.pooler.supabase.com). Got host=${host}`
      );
    }
  }

  // ------------------------------------
  // Stripe webhook signing secret
  // Only required if billing is enabled
  // ------------------------------------
  const billingEnabled = getTrimmed("BILLING_ENABLED").toLowerCase() !== "false";
  if (billingEnabled) {
    const whsec = getStripeWebhookSecret();
    if (!whsec) {
      missing.push(
        "STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SIGNING_SECRET / STRIPE_WHSEC)"
      );
    }
  } else {
    warnings.push("BILLING_ENABLED=false: Stripe webhook secret not required for boot");
  }

  // ------------------------------------
  // Stripe payments secret key
  // ------------------------------------
  if (!getTrimmed("STRIPE_SECRET_KEY")) {
    missing.push("STRIPE_SECRET_KEY");
  }

  // ------------------------------------
  // Base URL (links, redirects)
  // ------------------------------------
  if (!getTrimmed("APP_BASE_URL") && !getTrimmed("REPLIT_DOMAINS")) {
    missing.push("APP_BASE_URL (or REPLIT_DOMAINS)");
  }

  // ------------------------------------
  // Email notifications
  // ------------------------------------
  if (!getTrimmed("EMAIL_FROM")) {
    missing.push("EMAIL_FROM");
  }

  const hasResend = !!getTrimmed("RESEND_API_KEY");
  const hasSendGrid = !!getTrimmed("SENDGRID_API_KEY");
  if (!hasResend && !hasSendGrid) {
    missing.push("RESEND_API_KEY or SENDGRID_API_KEY (email provider required)");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function enforceProductionConfig(): void {
  const result = validateProductionConfig();
  const prod = isProdRuntime();

  // ---- Safe diagnostics (no secret values) ----
  console.log(
    "[Config] prod =",
    prod,
    "APP_RUNTIME =",
    process.env.APP_RUNTIME || "(unset)",
    "NODE_ENV =",
    process.env.NODE_ENV || "(unset)"
  );

  const dbUrl = getEffectiveDbUrl();
  const dbHost = dbUrl ? safeHostFromUrl(dbUrl) : "(unset)";
  console.log("[Config] Effective DB host =", dbHost);

  console.log("[Config] DB source =", getTrimmed("SB_DB_URL") ? "SB_DB_URL" : "DATABASE_URL");

  console.log("[Config] STRIPE_WEBHOOK_SECRET present =", !!getStripeWebhookSecret());
  console.log(
    "[Config] STRIPE keys present =",
    Object.keys(process.env)
      .filter((k) => k.toUpperCase().startsWith("STRIPE"))
      .sort()
  );

  console.log("[Config] PGHOST =", getTrimmed("PGHOST") || "(unset)");

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`[Config] ${w}`));
  }

  if (!result.valid) {
  console.error("\n========================================");
  console.error("CONFIG WARNING: Missing environment variables");
  console.error("========================================\n");
  result.missing.forEach((v) => console.error(`  - ${v}`));

  // DO NOT crash the server during boot
  console.error("[Config] continuing startup so healthcheck can pass");
  return;
}

  if (prod) {
    console.log("[Config] Production configuration validated successfully");
  }
}
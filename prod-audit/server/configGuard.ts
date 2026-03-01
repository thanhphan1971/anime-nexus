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

export function validateProductionConfig(): ValidationResult {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!isProd) {
    return { valid: true, missing: [], warnings: ['Running in development mode - config validation skipped'] };
  }
  // ------------------------------------
  // Production DB must be Supabase (not Neon)
  // ------------------------------------
  const dbUrl = process.env.DATABASE_URL || "";

  if (!dbUrl) {
    missing.push("DATABASE_URL (must be set in production)");
  } else {
    const isNeon =
      dbUrl.includes("neon.tech") ||
      dbUrl.includes("neondb") ||
      dbUrl.includes("neondb_owner");

    if (isNeon) {
      missing.push("DATABASE_URL is pointing to Neon (must use Supabase Postgres)");
    }
  }

  // Required for Stripe webhook security
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    missing.push('STRIPE_WEBHOOK_SECRET');
  }

  // Required for Stripe payments
  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }

  // Required for generating proper URLs
  if (!process.env.APP_BASE_URL && !process.env.REPLIT_DOMAINS) {
    missing.push('APP_BASE_URL (or REPLIT_DOMAINS)');
  }

  // Required for email notifications
  if (!process.env.EMAIL_FROM) {
    missing.push('EMAIL_FROM');
  }

  // Email provider - at least one must be configured
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  
  if (!hasResend && !hasSendGrid) {
    missing.push('RESEND_API_KEY or SENDGRID_API_KEY (email provider required)');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function enforceProductionConfig(): void {
  const result = validateProductionConfig();
    // Safe diagnostic: show DB host only (no password)
  try {
    const host = process.env.DATABASE_URL
      ? new URL(process.env.DATABASE_URL).hostname
      : "(unset)";
    console.log("[Config] DATABASE_URL host =", host);
  } catch {
    console.log("[Config] DATABASE_URL host = (invalid_url)");
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.log(`[Config] ${w}`));
  }

  if (!result.valid) {
    console.error('\n========================================');
    console.error('FATAL: Missing required environment variables for production');
    console.error('========================================\n');
    console.error('The following variables must be set:\n');
    result.missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nServer cannot start in production mode without these variables.');
   throw new Error('Please set them in your environment or secrets.');

  }

  if (process.env.NODE_ENV === 'production') {
    console.log('[Config] Production configuration validated successfully');
  }
}

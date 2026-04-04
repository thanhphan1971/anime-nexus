import Stripe from "stripe";

// Keep the API version explicit so behavior is stable across deploys.
const STRIPE_API_VERSION = "2026-01-28.clover" as const;

function looksLikeStripeSecretKey(key: string): boolean {
  // covers sk_test_ / sk_live_ / newer formats still start with sk_
  return key.startsWith("sk_") && key.length > 10;
}

const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();

// Exported flag for feature gating
export const isStripeConfigured = looksLikeStripeSecretKey(STRIPE_SECRET_KEY);

// Single cached instance (created only if configured)
let stripeInstance: Stripe | null = null;

/**
 * Safe getter: returns Stripe instance if configured, otherwise null.
 * Use this when you want the server to boot even if secrets are missing.
 */
export function getStripeSafe(): Stripe | null {
  if (!isStripeConfigured) return null;

  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  return stripeInstance;
}

/**
 * Strict getter: throws if Stripe is not configured.
 * Use this inside endpoints that MUST have Stripe (checkout/webhook admin tools).
 */
export function getStripe(): Stripe {
  const s = getStripeSafe();
  if (!s) {
    throw new Error("Stripe is not configured: missing/invalid STRIPE_SECRET_KEY");
  }
  return s;
}

// Backward-compatible export:
// If old code imports { stripe } it will either be a Stripe instance or null.
// Prefer using getStripe()/getStripeSafe() going forward.
export const stripe: Stripe | null = getStripeSafe();

// Loud warning once at boot (safe, no secrets)
if (!isStripeConfigured) {
  console.warn(
    "[Stripe] NOT configured (missing/invalid STRIPE_SECRET_KEY). Payments/webhooks disabled until set."
  );
} else {
  console.log("[Stripe] Configured");
}

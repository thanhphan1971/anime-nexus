import Stripe from "stripe";

const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_');

if (!STRIPE_CONFIGURED) {
  console.warn('[MIGRATION MODE] Stripe credentials not found - payment features will be unavailable');
}

export const stripe = STRIPE_CONFIGURED 
  ? new Stripe(process.env.STRIPE_SECRET_KEY!)
  : null as any;

export const isStripeConfigured = STRIPE_CONFIGURED;

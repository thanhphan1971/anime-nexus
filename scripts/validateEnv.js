#!/usr/bin/env node
/**
 * Environment Validation Script
 * Run this before starting the server or deploying.
 * Usage: node scripts/validateEnv.js
 */

const isProd = process.env.NODE_ENV === 'production';
const missing = [];

if (isProd) {
  console.log('[Validate] Checking production environment variables...\n');

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

  if (missing.length > 0) {
    console.error('========================================');
    console.error('FATAL: Missing required environment variables');
    console.error('========================================\n');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nCannot deploy/start without these variables.\n');
    process.exit(1);
  }

  console.log('[Validate] All required environment variables present.\n');
} else {
  console.log('[Validate] Development mode - skipping strict validation.\n');
}

process.exit(0);

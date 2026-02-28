process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
});

let startupError: unknown = null;

console.log("[BOOT] starting server");
console.log("[ENV] SUPABASE_URL present:", !!process.env.SUPABASE_URL);
console.log("[ENV] SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log(
  "[ENV] keys starting with SUPABASE:",
  Object.keys(process.env).filter(k => k.startsWith("SUPABASE")).sort()
);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { enforceProductionConfig } from "./configGuard";

import Stripe from "stripe";
import { stripe } from "./stripeClient";
import { storage } from "./storage";

import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./lib/supabaseAdmin";

// ------------------------------------
// Validate config early (production safety)
// ------------------------------------
const strictProdEnv = process.env.STRICT_PROD_ENV === "true";

try {
  enforceProductionConfig();
} catch (err) {
  console.error("WARN: Production config validation failed:", err);
  if (strictProdEnv) throw err;
}


// ------------------------------------
// Environment-aware Supabase config (Replit-safe)
// ------------------------------------

// IMPORTANT:
// - Do NOT set APP_RUNTIME in Workspace secrets.
// - Set APP_RUNTIME=prod ONLY in Deployment secrets.
// This avoids Replit secret sync issues.
const isProd = process.env.APP_RUNTIME === "prod";

const SUPABASE_URL = isProd
  ? (process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL)
  : (process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL);

const SUPABASE_SERVICE_ROLE_KEY = isProd
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY)
  : (process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ Safe environment diagnostics (never logs secrets)
try {
  const host = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "(missing)";
  console.log(
    `[ENV CHECK] APP_RUNTIME=${process.env.APP_RUNTIME || "(unset)"} prod=${isProd} supabase_host=${host}`
  );
} catch {
  console.log(
    `[ENV CHECK] APP_RUNTIME=${process.env.APP_RUNTIME || "(unset)"} prod=${isProd} supabase_host=(invalid_url)`
  );
}


// ------------------------------------
// App + server
// ------------------------------------
const app = express();

// 🔍 Environment check endpoint (safe for prod)
app.get("/api/env-check", (_req, res) => {
  const runtime = process.env.APP_RUNTIME || "(unset)";
  const isProd = runtime === "prod";

  const selectedUrl = isProd
    ? process.env.SUPABASE_URL
    : process.env.DEV_SUPABASE_URL;

  let host = "(missing)";
  try {
    host = selectedUrl ? new URL(selectedUrl).hostname : "(missing)";
  } catch {
    host = "(invalid_url)";
  }

  res.json({
    appRuntime: runtime,
    prod: isProd,
    supabaseHost: host,
    nodeEnv: process.env.NODE_ENV,
  });
});
// Supabase public config for client (safe: anon key only)
app.get("/api/config/supabase", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  const url =
    process.env.SUPABASE_URL ||
    process.env.DEV_SUPABASE_URL ||
    process.env.SB_URL;

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.DEV_SUPABASE_ANON_KEY ||
    process.env.SB_ANON;

  if (!url || !anonKey) {
    return res.status(500).json({
      error: "Supabase config missing",
      missing: { url: !url, anonKey: !anonKey },
    });
  }

  return res.json({ url, anonKey });
});


let frontendReady = false;

const httpServer = createServer(app);

// ------------------------------------
// Supabase ADMIN client (SERVER ONLY)
// ------------------------------------
const supabaseAdminLocal = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
  : null;

// ------------------------------------
// Auth helper (used by Stripe + others)
// ------------------------------------
async function requireUser(req: Request) {
  if (!supabaseAdminLocal) {
    return { error: "Authentication service not configured" as const };
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { error: "Missing Authorization token" as const };
  }

  const { data, error } = await supabaseAdminLocal.auth.getUser(token);

  if (error || !data?.user) {
    return { error: "Invalid or expired token" as const };
  }

  return { user: data.user };
}


// ------------------------------------
// DEBUG: verify runtime environment
// ------------------------------------
console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("SUPABASE_URL =", SUPABASE_URL);
console.log("APP_BASE_URL =", process.env.APP_BASE_URL);
console.log(
  "STRIPE_SECRET_KEY starts with =",
  (process.env.STRIPE_SECRET_KEY || "").slice(0, 8)
);

// ------------------------------------
// Types
// ------------------------------------
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ------------------------------------
// Basic health check
// ------------------------------------
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});


// -----------------------------
// Replit port detection probe (fast HEAD)
// -----------------------------
app.use((req, res, next) => {
  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }
  next();
});

// -----------------------------
// Preview startup placeholder (safe)
// -----------------------------
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api")) return next();

  // Never intercept Vite / assets / common static files
  if (
    req.path.startsWith("/@vite") ||
    req.path.startsWith("/src") ||
    req.path.startsWith("/assets") ||
    req.path.startsWith("/@id") ||
    req.path.startsWith("/node_modules") ||
    req.path === "/favicon.ico" ||
    req.path === "/robots.txt" ||
    req.path === "/manifest.webmanifest"
  ) {
    return next();
  }

  if (!frontendReady) {
    return res.status(200).send("Starting AniRealm...");
  }

  return next();
});


// =====================================================
// STRIPE (CLEAN, OWNED BY YOU)
// =====================================================

// 1) Webhook MUST be raw body and must be registered BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) return res.status(400).send("Missing stripe-signature");
    if (!secret) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err: any) {
      console.error("Webhook signature verify failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

   // ✅ Process events (DB updates guarded)
try {
  // -------------------------------------------------------
  // checkout.session.completed
  // -------------------------------------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("checkout.session.completed", {
      eventId: event.id,
      sessionId: session.id,
      mode: session.mode,
      subscriptionId: session.subscription,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    // A) SUBSCRIPTIONS (created via Checkout)
    if (session.mode === "subscription") {
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      const subscriptionId = (session.subscription as string | null) || null;

      if (!userId || !subscriptionId || !customerId) {
        return res.json({ received: true });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.json({ received: true });

      if (user.stripeCustomerId !== customerId) {
        console.error(
          `Webhook security: Customer mismatch for user ${userId}. Expected ${user.stripeCustomerId}, got ${customerId}`
        );
        return res.json({ received: true });
      }

      const subscription: any = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval; // "month" | "year"
      const subscriptionType =
        interval === "year" ? "yearly" : interval === "month" ? "monthly" : null;

      const periodEndSec = Number(subscription?.current_period_end || 0);
      const premiumEndDate = periodEndSec ? new Date(periodEndSec * 1000) : null;

      const willCancelAtPeriodEnd = !!subscription?.cancel_at_period_end;
      const subscriptionStatus = willCancelAtPeriodEnd
        ? "canceling"
        : String(subscription?.status || "active");

      await storage.updateUser(userId, {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus,
        subscriptionType,
        isPremium: true,
        premiumStartDate: new Date(),
        premiumEndDate,
        sclassJoinedAt: new Date(),
        willCancelAtPeriodEnd,
      });

      console.log(`User ${userId} subscription updated: ${subscriptionId}`);
      return res.json({ received: true });
    }

    // B) ONE-TIME PAYMENTS (TOKEN PACKS / MINOR PURCHASES)
    if (session.mode === "payment") {
      if (session.payment_status !== "paid") {
        return res.json({ received: true });
      }

      const type = session.metadata?.type;

      // 1) Minor purchase: delegate to webhookHandlers.ts (your secure flow)
      if (type === "minor_token_purchase") {
        const { WebhookHandlers } = await import("./webhookHandlers");
        await WebhookHandlers.processWebhook(req.body, sig);
        return res.json({ received: true });
      }

      // 2) Adult token purchase: hard idempotency + server-authoritative token amount
      if (type === "token_purchase") {
        const userId = session.metadata?.userId || session.metadata?.user_id;
        if (!userId) return res.json({ received: true });

        // Source of truth: session metadata (set during checkout creation)
        const tokenAmount =
          Number(
            session.metadata?.tokenAmount ??
              session.metadata?.token_amount ??
              0
          ) || 0;

        if (tokenAmount <= 0) {
          console.error("Webhook token_purchase missing tokenAmount", {
            sessionId: session.id,
            metadata: session.metadata,
          });
          return res.json({ received: true });
        }

        const amountCents = Number(session.amount_total ?? 0) || null;
        
        
        const inserted = await storage.tryCreateStripeFulfillment({
          stripeSessionId: session.id,
          stripePaymentIntentId: (session.payment_intent as string | null) ?? null,
          userId,
          type: "token_purchase",
          tokenAmount,
          amountCents: amountCents ?? undefined,
        });

        if (!inserted) {
          console.log("Webhook token_purchase duplicate session, skipping", {
            sessionId: session.id,
          });
          return res.json({ received: true });
        }

        try {
          await storage.incrementUserTokens(userId, tokenAmount);
        } catch (err) {
          console.error("❌ incrementUserTokens failed", {
            userId,
            tokenAmount,
            sessionId: session.id,
            err,
          });
          return res.json({ received: true });
        }

        console.log(
          `[Webhook token_purchase] Credited ${tokenAmount} tokens to user ${userId} (session ${session.id})`
        );

        return res.json({ received: true });
      }
      
      return res.json({ received: true });
    } // closes: if (session.mode === "payment")

      return res.json({ received: true });
    } // closes: if (event.type === "checkout.session.completed")

  // -------------------------------------------------------
  // customer.subscription.updated
  // -------------------------------------------------------
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;

    console.log("customer.subscription.updated", {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (!user) return res.json({ received: true });

    const interval = subscription.items.data[0]?.price?.recurring?.interval; // "month" | "year"
    const subscriptionType =
      interval === "year" ? "yearly" : interval === "month" ? "monthly" : "monthly";

    const periodEnd = (subscription as any).current_period_end;

    if (subscription.cancel_at_period_end) {
      await storage.updateUser(user.id, {
        subscriptionStatus: String(subscription.status || "active"),
        isPremium: true,
        willCancelAtPeriodEnd: true,
        subscriptionType,
        subscriptionCanceledAt: new Date(),
        premiumEndDate: periodEnd ? new Date(periodEnd * 1000) : null,
      });
      return res.json({ received: true });
    }

    if (subscription.status === "active") {
      await storage.updateUser(user.id, {
        subscriptionStatus: "active",
        subscriptionType,
        isPremium: true,
        willCancelAtPeriodEnd: false,
        premiumEndDate: periodEnd ? new Date(periodEnd * 1000) : null,
        subscriptionCanceledAt: null,
      });
      return res.json({ received: true });
    }

    return res.json({ received: true });
  }

  // -------------------------------------------------------
  // customer.subscription.deleted
  // -------------------------------------------------------
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    console.log("customer.subscription.deleted", { subscriptionId: subscription.id });

    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (user) {
      await storage.updateUser(user.id, {
        subscriptionStatus: "expired",
        isPremium: false,
        stripeSubscriptionId: null,
        willCancelAtPeriodEnd: false,
      });
    }

    return res.json({ received: true });
  }

  // Unhandled events
  return res.json({ received: true });
} catch (dbError: any) {
  console.error("Webhook DB update error:", dbError.message);
  return res.json({ received: true });
}
  } // <-- closes async (req, res) => {
);  // <-- closes app.post(

// 2) Normal body parsers for the rest of your API
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      // optional: keep raw bytes for debugging
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// 3) Checkout endpoint moved to routes.ts - this is just a placeholder for webhook order
// The actual checkout endpoint with plan mapping is in server/routes.ts

// =====================================================
// Sessions
// =====================================================
const SessionStore = MemoryStore(session);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "anirealm-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  })
);

// -----------------------------
// Logger helper
// -----------------------------
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// -----------------------------
// API request logging middleware
// -----------------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
  const safe = { ...capturedJsonResponse } as any;
  if (safe.accessToken) safe.accessToken = "[REDACTED]";
  if (safe.refreshToken) safe.refreshToken = "[REDACTED]";
  if (safe.token) safe.token = "[REDACTED]";
  logLine += ` :: ${JSON.stringify(safe)}`;
}

      log(logLine);
    }
  });

  next();
});

// Prevent caching for API responses
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});


// Replit requires binding to the PORT it provides
const port = Number(process.env.PORT) || 5000;

console.log("[BOOT] PORT env =", process.env.PORT);
app.get("/__status", (_req, res) => {
  res.json({ frontendReady });
});






// ✅ Open the port ASAP so Replit Preview can reach the app
httpServer.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);

  // Initialize everything AFTER the port is open
  (async () => {
    try {
      // Register API routes BEFORE static/Vite
      await registerRoutes(httpServer, app);

     // 🔍 Debug endpoint: list registered routes (view in browser)
app.get("/api/__routes", (_req, res) => {
  try {
    const stack = (app as any)?._router?.stack ?? [];
    const routes = stack
      .filter((layer: any) => layer?.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase()),
      }));

    res.json({ count: routes.length, routes });
  } catch (e: any) {
    res.status(500).json({ error: "failed to list routes", detail: e?.message || String(e) });
  }
});

      app.all("/api/*", (req, res) => {
        res.status(404).json({
          error: "API route not found",
          path: req.path,
          method: req.method,
        });
      });

      // Static serving / Vite dev server
      const isProdRuntime = process.env.APP_RUNTIME === "prod";
      if (isProdRuntime) {
        serveStatic(app);
      } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
      }

      frontendReady = true;
      log("Server fully initialized");

      // Error handler (MUST be last middleware)
      app.use((err: any, _req: any, res: any, _next: any) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
      });

      // Optional: seed after start (won’t block routes)
if (process.env.RUN_SEED === "true") {
  try {
    const { seedDatabase } = await import("./seed");
    await seedDatabase();
  } catch (e) {
    console.error("[seed] failed:", e);
  }
} else {
  console.log("[seed] skipped (set RUN_SEED=true to run)");
}
    } catch (err) {
      console.error("Post-listen initialization error:", err);
      // ⚠️ Do NOT process.exit(1) here — keep the port open so you can still hit /api/health and see logs
    }
  })();
});




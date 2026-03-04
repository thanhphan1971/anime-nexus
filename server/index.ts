console.log("[BOOT MARKER TOP]", {
  marker: "DEPLOY_MARKER_9fe2c73_TOP",
  now: new Date().toISOString(),
});

import { seedDatabase } from "./seed";

import "./envAlias";
import "./forceDbEnv"; // must run before any DB-related imports

import express from "express";
import { createServer } from "http";

import session from "express-session";
import MemoryStoreFactory from "memorystore";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { stripe } from "./stripeClient";
import { storage } from "./storage";

import { enforceProductionConfig } from "./configGuard";

console.log("[BUILD ID]", {
  marker: "DEPLOY_MARKER_9fe2c73",
  sha: process.env.REPLIT_GIT_SHA || process.env.GIT_SHA || "(no env sha)",
  now: new Date().toISOString(),
});

// ------------------------------------
// Types (TS-only)
// ------------------------------------
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

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

// --- Alias shim MUST run before enforceProductionConfig is called ---
function applyEnvAlias(): void {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const supabaseService = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!process.env.SB_URL && supabaseUrl) process.env.SB_URL = supabaseUrl;
  if (!process.env.SB_SERVICE && supabaseService) process.env.SB_SERVICE = supabaseService;

  console.log("[ENV AFTER ALIAS]", {
    SB_URL: !!process.env.SB_URL,
    SB_SERVICE: !!process.env.SB_SERVICE,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
applyEnvAlias();

// ✅ create MemoryStore class synchronously so it’s never undefined
const MemoryStore = MemoryStoreFactory(session);



// --------------------------------------------------
// Global error traps
// --------------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
});

console.log("[BOOT] starting server");

// Runtime flags (define ONCE, in-scope for the whole server)
const isProdRuntime =
  process.env.APP_RUNTIME === "prod" || process.env.NODE_ENV === "production";

// NOTE: do NOT throw here. If config is missing, we still want "/" to return 200
// so Deployments doesn't kill the container before we can see logs / env-check.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SB_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SB_SERVICE;

const configOk = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;
if (!configOk) {
  console.error("[BOOT] config missing:", {
    hasSupabaseUrl: !!SUPABASE_URL,
    hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY,
    keysPresent: Object.keys(process.env).filter((k) =>
      ["SUPABASE", "SB_", "DEV_SUPABASE"].some((p) => k.startsWith(p))
    ),
  });
}

const app = express();

// ✅ Replit Deployments healthcheck hits "/" while the app is still booting.
// Always return 200 ASAP in production so the container isn't killed during startup.
// In dev, let GET / fall through to Vite/static handlers.
app.head("/", (_req, res) => res.status(200).end());

app.get("/", (_req, res, next) => {
  if (isProdRuntime) return res.status(200).send("ok");
  return next();
});

app.get("/healthcheck", (_req, res) => res.status(200).send("ok"));
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

// 🔍 Environment check endpoint (safe for prod)
app.get("/api/env-check", (_req, res) => {
  const runtime = process.env.APP_RUNTIME || "(unset)";
  const prod = isProdRuntime;

  const selectedUrl = prod
    ? process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SB_URL
    : process.env.DEV_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SB_URL;

  let host = "(missing)";
  try {
    host = selectedUrl ? new URL(selectedUrl).hostname : "(missing)";
  } catch {
    host = "(invalid_url)";
  }

  return res.json({
    appRuntime: runtime,
    prod,
    configOk,
    supabaseHost: host,
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasDevSupabaseUrl: !!process.env.DEV_SUPABASE_URL,
    hasSbUrl: !!process.env.SB_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasDevServiceRole: !!process.env.DEV_SUPABASE_SERVICE_ROLE_KEY,
    hasSbService: !!process.env.SB_SERVICE,
  });
});

// ✅ Run config validation AFTER alias is applied — but DO NOT crash-loop the container.
// If you want to enforce hard-fail later, do it AFTER listen() or behind a flag.
try {
  enforceProductionConfig();
} catch (e) {
  console.error("[BOOT] enforceProductionConfig failed (non-fatal for boot):", e);
}

  // Supabase public config for client (safe: anon key only)
  app.get("/api/config/supabase", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    const url =
      process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SB_URL;

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
  
  console.log("[ENV SAFE]", {
    nodeEnv: process.env.NODE_ENV,
    appRuntime: process.env.APP_RUNTIME,
    stripeSecretSet: !!process.env.STRIPE_SECRET_KEY,
    appBaseUrlSet: !!process.env.APP_BASE_URL,
    supabaseHost: (() => {
      try {
        const url = (SUPABASE_URL ?? "").trim();
        return url ? new URL(url).host : "(unset)";
      } catch {
        return "(invalid)";
      }
    })(),
  });

  // ... rest of your server continues below (routes, webhook, session, listen, etc.)



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
    
if (!secret) {
  console.warn("[Stripe] Webhook hit but STRIPE_WEBHOOK_SECRET missing");
  return res.json({ received: true });
}

// ✅ INSERT THIS RIGHT HERE (before `let event`)
if (!stripe) {
  console.warn("[Stripe] Webhook hit but Stripe not configured");
  return res.json({ received: true });
}

let event: any;

// ----------------------------------------------------
// Verify Stripe signature
// ----------------------------------------------------
try {
  event = stripe.webhooks.constructEvent(req.body, sig, secret);

  console.log("[WEBHOOK PROD TARGET]", {
    APP_RUNTIME: process.env.APP_RUNTIME,
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SB_URL: process.env.SB_URL,
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
  });

      try {
        const dbHost = process.env.DATABASE_URL
          ? new URL(process.env.DATABASE_URL).hostname
          : "(unset)";
        console.log("[WEBHOOK DB HOST]", { dbHost });
      } catch {
        console.log("[WEBHOOK DB HOST]", { dbHost: "(invalid_url)" });
      }

    } catch (err: any) {
      console.error("Webhook signature verify failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ----------------------------------------------------
    // Process events
    // ----------------------------------------------------
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        console.log("[WEBHOOK SESSION]", {
          sessionId: session.id,
          mode: session.mode,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        });

        // ... your existing logic continues here
    
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
      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
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

        console.log("[FULFILLMENT] about to create", { sessionId: session.id });        
        
        const inserted = await storage.tryCreateStripeFulfillment({
          
          stripeSessionId: session.id,
          stripePaymentIntentId: (session.payment_intent as string | null) ?? null,
          userId,
          type: "token_purchase",
          tokenAmount,
          amountCents: amountCents ?? undefined,
        });
        console.log("[FULFILLMENT] result", { sessionId: session.id, inserted });

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
    const subscription = event.data.object as any;

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
    const subscription = event.data.object as any;

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

// ✅ Required for secure cookies behind Replit / reverse proxies
app.set("trust proxy", 1);

const SessionStore = MemoryStore;

app.use(
  session({
    // ✅ Fail fast in production if missing (don’t silently ship a known secret)
    secret:
      process.env.SESSION_SECRET ??
      (process.env.NODE_ENV === "production"
        ? (() => {
            throw new Error("SESSION_SECRET is required in production");
          })()
        : "dev-secret"),

    resave: false,
    saveUninitialized: false,

    // ✅ Helps cookie behavior behind proxies
    proxy: process.env.NODE_ENV === "production",

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
// API request logging middleware
// -----------------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: any = undefined;

  // Capture JSON responses
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  // Redaction helpers
  const redactKeys = new Set([
    "accessToken",
    "refreshToken",
    "token",
    "idToken",
    "session",
    "sessionId",
    "secret",
    "password",
    "apiKey",
    "authorization",
  ]);

  const redactDeep = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(redactDeep);

    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactKeys.has(k) ? "[REDACTED]" : redactDeep(v);
    }
    return out;
  };

  // Log once when response finishes
  res.once("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    if (capturedJsonResponse !== undefined) {
      try {
        logLine += ` :: ${JSON.stringify(redactDeep(capturedJsonResponse))}`;
      } catch {
        logLine += ` :: [unserializable json response]`;
      }
    }

    log(logLine);
  });

  next();
});

// --------------------------------------------------
// Prevent caching for API responses
// --------------------------------------------------
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

// --------------------------------------------------
// Replit requires binding to the PORT it provides
// (IMPORTANT: only define port ONCE in the file)
// --------------------------------------------------
const port = Number(process.env.PORT) || 5000;

// --------------------------------------------------
// Boot diagnostics (before listen)
// --------------------------------------------------
console.log("[BOOT] PORT env =", process.env.PORT);
console.log("[BOOT] about to listen; routes will register inside listen callback");

app.get("/__status", (_req, res) => {
  res.json({ frontendReady });
});

// --------------------------------------------------
// Debug endpoint: list registered routes
// MUST be defined BEFORE listen
// --------------------------------------------------
app.get("/api/__routes", (_req, res) => {
  try {
    const stack = (app as any)?._router?.stack ?? [];

    const routes = stack
      .filter((layer: any) => layer?.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase()),
      }));

    return res.json({ count: routes.length, routes });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

// --------------------------------------------------
// Listen ASAP so Replit health checks can reach the app
// --------------------------------------------------
console.log("[BOOT] reached pre-listen checkpoint");

console.log("[BOOT] about to listen", {
  portEnv: process.env.PORT,
  resolvedPort: port,
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log("[BOOT] listen callback entered");
  log(`serving on port ${port}`);

  // Run async initialization AFTER port is open
(async () => {
  try {
    console.log("[BOOT] registering routes...");
    await registerRoutes(httpServer, app);
    console.log("[BOOT] routes registered");

    // --------------------------------------------------
    // 404 for unknown API routes (after registerRoutes)
    // --------------------------------------------------
    app.all("/api/*", (req, res) => {
      res.status(404).json({
        error: "API route not found",
        path: req.path,
        method: req.method,
      });
    });

    // --------------------------------------------------
    // Static serving / Vite dev server
    // --------------------------------------------------
    const isProdRuntime = process.env.APP_RUNTIME === "prod";
    if (isProdRuntime) {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // --------------------------------------------------
    // App ready
    // --------------------------------------------------
    frontendReady = true;
    log("Server fully initialized");

    // --------------------------------------------------
    // Error handler (must be last)
    // --------------------------------------------------
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

// --------------------------------------------------
// Optional seed (non-blocking)
// --------------------------------------------------
// --------------------------------------------------
// Optional seed (non-blocking)
// --------------------------------------------------
if (process.env.RUN_SEED === "true") {
  seedDatabase().catch((e) => console.error("[seed] failed:", e));
} else {
  console.log("[seed] skipped (set RUN_SEED=true to run)");
}

  } catch (err) {
    console.error("[FATAL] post-listen initialization failed:", err);
    // Keep port open for debugging instead of exiting
  }
})(); // closes async init IIFE

}); // closes httpServer.listen callback

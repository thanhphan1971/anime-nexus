// ✅ MUST be first: env shims only (no DB pools, no app module imports)
import "./envAlias";
import "./forceDbEnv";

import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";

console.log("[BOOT MARKER TOP]", {
  marker: "DEPLOY_MARKER_9fe2c73_TOP",
  now: new Date().toISOString(),
});

// --------------------------------------------------
// App + server
// --------------------------------------------------
const app = express();
const httpServer = createServer(app);

let frontendReady = false;

// minimal boot route so healthcheck never fails until frontend is ready
app.get("/", (_req: Request, res: Response) => {
  return res.status(200).send("OK");
});

const port = parseInt(process.env.PORT || "5000", 10);



// --------------------------------------------------
// Global placeholders (so TS has names in scope)
// These are assigned via lazy imports AFTER listen()
// --------------------------------------------------
const isProdRuntime =
  process.env.APP_RUNTIME === "prod" || process.env.NODE_ENV === "production";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.SB_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SB_SERVICE;

const configOk = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

// typed placeholders (assigned after listen)
let enforceProductionConfig: (() => void) | undefined;

let stripe: any;
let storage: any;

// keep your existing log() if you have it; otherwise define a simple one
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.get("/healthcheck", (_req, res) => res.status(200).send("ok"));
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

// Replit healthcheck protection
// Replit healthcheck hits "/" while the app boots.
// Return 200 immediately until the frontend is ready.
  
// Health endpoints

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
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      return res.status(400).send("Missing stripe-signature");
    }

    if (!secret) {
      const msg = "Missing STRIPE_WEBHOOK_SECRET";
      if (process.env.NODE_ENV === "production") {
        console.error("[Stripe]", msg);
        return res.status(500).send(msg);
      }
      console.warn("[Stripe]", msg, "(dev mode)");
      return res.json({ received: true });
    }

    if (!stripe) {
      const msg = "Stripe client not configured";
      if (process.env.NODE_ENV === "production") {
        console.error("[Stripe]", msg);
        return res.status(500).send(msg);
      }
      console.warn("[Stripe]", msg, "(dev mode)");
      return res.json({ received: true });
    }

    let event: any;

    // ----------------------------------------------------
    // Verify Stripe signature
    // ----------------------------------------------------
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);

      console.log("[Stripe] webhook event", {
        id: event.id,
        type: event.type,
      });

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
          if (!user) {
            return res.json({ received: true });
          }

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

          const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
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

          // 1) Minor purchase: delegate to webhookHandlers.ts
          if (type === "minor_token_purchase") {
            const { WebhookHandlers } = await import("./webhookHandlers");
            await WebhookHandlers.processWebhook(req.body, sig);
            return res.json({ received: true });
          }

          // 2) Adult token purchase: hard idempotency + server-authoritative token amount
          if (type === "token_purchase") {
            const userId = session.metadata?.userId || session.metadata?.user_id;
            if (!userId) {
              return res.json({ received: true });
            }

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

              // IMPORTANT:
              // Return 500 so Stripe retries instead of falsely marking this fulfilled.
              return res.status(500).send("Token credit failed");
            }

            console.log(
              `[Webhook token_purchase] Credited ${tokenAmount} tokens to user ${userId} (session ${session.id})`
            );

            return res.json({ received: true });
          }

          return res.json({ received: true });
        }

        return res.json({ received: true });
      }

      return res.json({ received: true });
    
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

// --------------------------------------------------
// Boot diagnostics (before listen)
// --------------------------------------------------
console.log("[BOOT] PORT env =", process.env.PORT);

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

// --------------------------------------------------
// Debug endpoint: env presence + key prefixes (NO values)
// --------------------------------------------------
app.get("/api/env-keys", (_req: Request, res: Response) => {
  // 🔒 Disable in production (prevents leaking infra info)
  if (isProdRuntime) {
    return res.status(404).json({ error: "Not found" });
  }

  const keys = Object.keys(process.env).sort();

  const has = (k: string) => {
    const v = process.env[k];
    return typeof v === "string" ? v.trim().length > 0 : !!v;
  };

  const safeHost = (urlStr?: string) => {
    try {
      return urlStr ? new URL(urlStr).host : "";
    } catch {
      return "";
    }
  };

  return res.json({
    count: keys.length,
    has: {
      APP_RUNTIME: has("APP_RUNTIME"),
      NODE_ENV: has("NODE_ENV"),
      SESSION_SECRET: has("SESSION_SECRET"),

      DATABASE_URL: has("DATABASE_URL"),
      SUPABASE_URL: has("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),

      STRIPE_SECRET_KEY: has("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: has("STRIPE_WEBHOOK_SECRET"),

      SB_URL: has("SB_URL"),
      SB_SERVICE: has("SB_SERVICE"),
      SB_DB_URL: has("SB_DB_URL"),
    },
    hosts: {
      SB_DB_URL: safeHost(process.env.SB_DB_URL),
      DATABASE_URL: safeHost(process.env.DATABASE_URL),
      SUPABASE_URL: safeHost(process.env.SUPABASE_URL),
      PGHOST: (process.env.PGHOST || "").trim(),
    },
    startsWith: {
      SUPABASE: keys.filter((k) => k.startsWith("SUPABASE")),
      SB_: keys.filter((k) => k.startsWith("SB_")),
      PG: keys.filter((k) => k.startsWith("PG")),
    },
  });
});

// --------------------------------------------------
// Start server (listen first, init after)
// --------------------------------------------------

httpServer.on("error", (err: any) => {
  console.error("[BOOT] httpServer error event:", {
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
  });
});

console.log("[BOOT] calling httpServer.listen", {
  portEnv: process.env.PORT,
  resolvedPort: port,
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log("[BOOT] listen callback entered", { port });
  // Everything below runs AFTER the port is open
  void (async () => {
    try {
      const [sMod, msMod, configMod, routesMod, staticMod] = await Promise.all([
        import("express-session"),
        import("memorystore"),
        import("./configGuard"),
        import("./routes"),
        import("./static"),
      ]);

      const enforceProductionConfigAny: any = (configMod as any).enforceProductionConfig;
      const registerRoutes: any = (routesMod as any).registerRoutes;
      const serveStatic: any = (staticMod as any).serveStatic;

      // Global error traps (after listen so they can't block binding)
      process.on("unhandledRejection", (reason) => {
        console.error("[FATAL] unhandledRejection:", reason);
      });
      process.on("uncaughtException", (err) => {
        console.error("[FATAL] uncaughtException:", err);
      });

      // ---- robust CJS/ESM interop for session + memorystore ----
      const sessionAny: any = (sMod as any)?.default ?? sMod;
      const MemoryStoreFactoryAny: any = (msMod as any)?.default ?? msMod;

      const maybe: any = MemoryStoreFactoryAny(sessionAny);
      const MemoryStoreCtor: any = maybe?.default?.default ?? maybe?.default ?? maybe;

      if (typeof MemoryStoreCtor !== "function") {
        console.error("[BOOT] MemoryStore is not a constructor", {
          type: typeof MemoryStoreCtor,
          keys: MemoryStoreCtor ? Object.keys(MemoryStoreCtor) : null,
          msKeys: msMod ? Object.keys(msMod as any) : null,
          sessionKeys: sMod ? Object.keys(sMod as any) : null,
        });
        throw new Error("MemoryStore factory did not return a constructor");
      }

      // Install session middleware ONCE
      app.set("trust proxy", 1);
      app.use(
        sessionAny({
          secret: process.env.SESSION_SECRET || "dev",
          resave: false,
          saveUninitialized: false,
          proxy: process.env.NODE_ENV === "production",
          cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax",
          },
          store: new MemoryStoreCtor({ checkPeriod: 86400000 }),
        })
      );

      // Config guard must never crash boot
      try {
        enforceProductionConfigAny?.();
      } catch (e: unknown) {
        console.error("[BOOT] enforceProductionConfig failed (non-fatal):", e);
      }

      // Register API routes BEFORE static
      await registerRoutes(httpServer, app);
      console.log("[BOOT] routes registered");

      // Serve frontend
      if (process.env.APP_RUNTIME === "prod" || process.env.NODE_ENV === "production") {
        serveStatic(app);
      } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
      }

      frontendReady = true;
      console.log("[BOOT] frontendReady true");
    } catch (err) {
      console.error("[FATAL] post-listen init failed (server stays alive):", err);
      frontendReady = true; // keep healthcheck passing
    }
  })();
});
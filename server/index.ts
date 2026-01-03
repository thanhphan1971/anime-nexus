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

// Validate config early (keeps production sane)
enforceProductionConfig();

const app = express();
let frontendReady = false;


const httpServer = createServer(app);
// 🔍 DEBUG: verify which environment the server is actually using
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("APP_BASE_URL =", process.env.APP_BASE_URL);
console.log(
  "STRIPE_SECRET_KEY starts with =",
  (process.env.STRIPE_SECRET_KEY || "").slice(0, 8)
);

// -----------------------------
// Types
// -----------------------------
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

// -----------------------------
// Basic health check
// -----------------------------
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
// Preview startup placeholder (non-API GETs)
// -----------------------------
app.use((req, res, next) => {
  if (!frontendReady && req.method === "GET" && !req.path.startsWith("/api")) {
    return res.status(200).send("Starting AniRealm...");
  }
  next();
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

    // ✅ Proof logs (we’ll wire DB update next)
    try {
      // Handle checkout.session.completed - new subscription
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("checkout.session.completed", {
          sessionId: session.id,
          subscriptionId: session.subscription,
          customerId: session.customer,
          metadata: session.metadata,
        });

        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;
        
        if (userId && subscriptionId && customerId) {
          // Security: Verify user exists and their stripeCustomerId matches the session customer
          const user = await storage.getUser(userId);
          if (!user) {
            console.error(`Webhook security: User ${userId} not found`);
            return res.json({ received: true });
          }
          if (user.stripeCustomerId !== customerId) {
            console.error(`Webhook security: Customer mismatch for user ${userId}. Expected ${user.stripeCustomerId}, got ${customerId}`);
            return res.json({ received: true });
          }
          
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          const isYearly = priceId === "price_1SlFUbRdxAAD392445O8ScqK";
          
          await storage.updateUser(userId, {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
            subscriptionType: isYearly ? "yearly" : "monthly",
            isPremium: true,
            premiumStartDate: new Date(),
            premiumEndDate: new Date((subscription as any).current_period_end * 1000),
            sclassJoinedAt: new Date(),
          });
          console.log(`User ${userId} subscription activated: ${subscriptionId}`);
        }
      }

      // Handle subscription updates (renewals, plan changes, cancellations)
      if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("customer.subscription.updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        const user = await storage.getUserByStripeSubscriptionId(subscription.id);
        if (user) {
          const priceId = subscription.items.data[0]?.price?.id;
          const isYearly = priceId === "price_1SlFUbRdxAAD392445O8ScqK";
          const periodEnd = (subscription as any).current_period_end;
          
          if (subscription.cancel_at_period_end) {
            await storage.updateUser(user.id, {
              subscriptionStatus: "canceled_pending_expiry",
              subscriptionCanceledAt: new Date(),
              premiumEndDate: periodEnd ? new Date(periodEnd * 1000) : null,
            });
            console.log(`User ${user.id} subscription canceled (access until period end)`);
          } else if (subscription.status === "active") {
            await storage.updateUser(user.id, {
              subscriptionStatus: "active",
              subscriptionType: isYearly ? "yearly" : "monthly",
              isPremium: true,
              premiumEndDate: periodEnd ? new Date(periodEnd * 1000) : null,
              subscriptionCanceledAt: null,
            });
            console.log(`User ${user.id} subscription renewed/updated`);
          }
        }
      }

      // Handle subscription deletion
      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("customer.subscription.deleted", { subscriptionId: subscription.id });

        const user = await storage.getUserByStripeSubscriptionId(subscription.id);
        if (user) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "expired",
            isPremium: false,
            stripeSubscriptionId: null,
          });
          console.log(`User ${user.id} subscription expired`);
        }
      }
    } catch (dbError: any) {
      console.error("Webhook DB update error:", dbError.message);
    }

    return res.json({ received: true });
  }
);

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
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine);
    }
  });

  next();
});

// -----------------------------
// Start listening IMMEDIATELY (Replit)
// -----------------------------
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);

    // Do async initialization AFTER listening
    (async () => {
      try {
        // Seed database on startup
        const { seedDatabase } = await import("./seed");
        await seedDatabase();

        // Register API routes
        await registerRoutes(httpServer, app);

        // Error handler
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          res.status(status).json({ message });
        });

        // Static serving / Vite dev server
        if (process.env.NODE_ENV === "production") {
          serveStatic(app);
        } else {
          const { setupVite } = await import("./vite");
          await setupVite(httpServer, app);
        }

        frontendReady = true;
        log("Server fully initialized");
      } catch (err) {
        console.error("Server initialization error:", err);
        process.exit(1);
      }
    })();
  }
);

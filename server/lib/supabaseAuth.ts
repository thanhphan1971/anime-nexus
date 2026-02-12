import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabaseAdmin";
import { storage } from "../storage";
import type { User } from "@shared/schema";

// ✅ Client used ONLY to validate user access tokens (Bearer JWT)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  (process.env.SB_ANON || process.env.SUPABASE_ANON_KEY)!,
);

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: {
        id: string;
        email: string;
      } | null;

      dbUser?: User | null;

      // Canonical fields set by verifySupabaseToken / optionalSupabaseAuth
      user?: any | null;
      userId?: string | null;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const raw = req.headers.authorization || "";
  const parts = raw.split(" ");
  if (parts.length < 2) return null;
  const [scheme, token] = parts;
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const trimmed = (token || "").trim();
  return trimmed.length ? trimmed : null;
}

// Safe helper for debugging: decode JWT payload without verifying signature.
// Only used for logs (iss/sub), never for auth decisions.
function safeDecodeJwtPayload(token: string): any | null {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function verifySupabaseToken(req: Request, res: Response, next: NextFunction) {
  if (!isSupabaseConfigured) {
    console.error("[auth] Supabase not configured (isSupabaseConfigured=false)");
    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return res.status(503).json({ error: "Authentication service not configured" });
  }

  const token = getBearerToken(req);

  if (!token) {
    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user) {
      const payload = safeDecodeJwtPayload(token);
      console.error("[auth] getUser failed:", error?.message || error);
      if (payload?.iss) console.error("[auth] token iss:", payload.iss);
      if (payload?.sub) console.error("[auth] token sub:", payload.sub);

      req.supabaseUser = null;
      req.dbUser = null;
      (req as any).user = null;
      (req as any).userId = null;
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = data.user;

    (req as any).user = user;
    (req as any).userId = user.id;

    req.supabaseUser = {
      id: user.id,
      email: user.email || "",
    };

    // ✅ IMPORTANT: profile/db row might not exist yet. Do NOT fail auth.
    try {
      const dbUser = await storage.getUserBySupabaseId(user.id);
      req.dbUser = dbUser || null;
    } catch (e) {
      console.warn("[auth] DB user lookup failed (continuing):", e);
      req.dbUser = null;
    }

    return next();
  } catch (err: any) {
    const payload = safeDecodeJwtPayload(token);
    console.error("[auth] verifySupabaseToken threw:", err?.message || err);
    if (payload?.iss) console.error("[auth] token iss:", payload.iss);
    if (payload?.sub) console.error("[auth] token sub:", payload.sub);

    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export async function optionalSupabaseAuth(req: Request, _res: Response, next: NextFunction) {
  if (!isSupabaseConfigured) {
    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return next();
  }

  const token = getBearerToken(req);

  if (!token) {
    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return next();
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (!error && data?.user) {
      const user = data.user;

      (req as any).user = user;
      (req as any).userId = user.id;

      req.supabaseUser = {
        id: user.id,
        email: user.email || "",
      };

      // optional db lookup (never blocks)
      try {
        const dbUser = await storage.getUserBySupabaseId(user.id);
        req.dbUser = dbUser || null;
      } catch (e) {
        console.warn("[auth] DB user lookup failed (optional auth, continuing):", e);
        req.dbUser = null;
      }
    } else {
      req.supabaseUser = null;
      req.dbUser = null;
      (req as any).user = null;
      (req as any).userId = null;
    }

    return next();
  } catch {
    req.supabaseUser = null;
    req.dbUser = null;
    (req as any).user = null;
    (req as any).userId = null;
    return next();
  }
}

// ✅ Admin-only middleware (use with: app.use("/api/admin", verifySupabaseToken, requireAdmin))
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

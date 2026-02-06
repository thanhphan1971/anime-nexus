import { Request, Response, NextFunction } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin";
import { storage } from "../storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: {
        id: string;
        email: string;
      } | null;
      dbUser?: User | null;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim() || null;
}

export async function verifySupabaseToken(req: Request, res: Response, next: NextFunction) {
  if (!isSupabaseConfigured) {
    req.supabaseUser = null;
    req.dbUser = null;
    return res.status(503).json({ error: "Authentication service not configured" });
  }

  const token = getBearerToken(req);

  if (!token) {
    req.supabaseUser = null;
    req.dbUser = null;
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      req.supabaseUser = null;
      req.dbUser = null;
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = data.user;

    req.supabaseUser = {
      id: user.id,
      email: user.email || "",
    };

    const dbUser = await storage.getUserBySupabaseId(user.id);
    req.dbUser = dbUser || null;

    return next();
  } catch (err) {
    console.error("Token verification error:", err);
    req.supabaseUser = null;
    req.dbUser = null;
    return res.status(500).json({ error: "Auth verification failed" });
  }
}

export async function optionalSupabaseAuth(req: Request, _res: Response, next: NextFunction) {
  if (!isSupabaseConfigured) {
    req.supabaseUser = null;
    req.dbUser = null;
    return next();
  }

  const token = getBearerToken(req);

  if (!token) {
    req.supabaseUser = null;
    req.dbUser = null;
    return next();
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && data?.user) {
      const user = data.user;

      req.supabaseUser = {
        id: user.id,
        email: user.email || "",
      };

      const dbUser = await storage.getUserBySupabaseId(user.id);
      req.dbUser = dbUser || null;
    } else {
      req.supabaseUser = null;
      req.dbUser = null;
    }

    return next();
  } catch (err) {
    req.supabaseUser = null;
    req.dbUser = null;
    return next();
  }
}

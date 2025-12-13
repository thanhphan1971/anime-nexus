import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from './supabaseAdmin';
import { storage } from '../storage';
import type { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: {
        id: string;
        email: string;
      };
      dbUser?: User;
    }
  }
}

export async function verifySupabaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.supabaseUser = {
      id: user.id,
      email: user.email || '',
    };
    
    // Look up the database user by supabaseUserId
    const dbUser = await storage.getUserBySupabaseId(user.id);
    if (dbUser) {
      req.dbUser = dbUser;
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

export async function optionalSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      req.supabaseUser = {
        id: user.id,
        email: user.email || '',
      };
      // Look up the database user by supabaseUserId
      const dbUser = await storage.getUserBySupabaseId(user.id);
      if (dbUser) {
        req.dbUser = dbUser;
      }
    }
    next();
  } catch {
    next();
  }
}

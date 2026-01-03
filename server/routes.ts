import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertUserSchema, insertPostSchema, insertSwipeActionSchema, insertCommunityMessageSchema, insertDrawSchema, insertPrizeSchema, insertDrawEntrySchema, insertCardCategorySchema } from "@shared/schema";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { verifySupabaseToken, optionalSupabaseAuth } from "./lib/supabaseAuth";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { calculateAgeBand, canViewFullProfile } from "./lib/dbAdapter";
import { FREE_ODDS, PAID_ODDS, PREMIUM_PAID_ODDS, FREE_SUMMON_LIMITS, PAID_SUMMON_CONFIG, PAID_SUMMON_REMINDER, selectRarity, getNextResetTime, getNext7PMETResetTime, needsReset } from "./config/gachaOdds";
import { getDrawLockTime, getCooldownEndTime, getDrawCycleStatus } from "./drawCycle";
import { fromZonedTime } from "date-fns-tz";

const createProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().min(1).max(100),
  handle: z.string().min(3).max(30).regex(/^@[a-zA-Z0-9_]+$/),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  animeInterests: z.array(z.string()).max(20).optional(),
  theme: z.enum(['cyberpunk', 'neon', 'sakura', 'ocean']).optional(),
  birthDate: z.string().optional(),
  isMinor: z.boolean().optional(),
  parentEmail: z.string().email().optional().nullable(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Supabase config endpoint (public keys only)
  app.get("/api/config/supabase", (req, res) => {
    res.json({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    });
  });
  
  // Profile routes for Supabase Auth
  app.get("/api/profiles/:id", verifySupabaseToken, async (req, res) => {
    try {
      // First try to find by Supabase user ID, then fall back to database ID
      let user = await storage.getUserBySupabaseId(req.params.id);
      if (!user) {
        user = await storage.getUser(req.params.id);
      }
      if (!user) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      const { password, ...profile } = user;
      
      // Check if requester can see full profile (owner or approved parent)
      const requesterId = req.dbUser?.id;
      const approvedParentLink = user.isMinor ? await storage.getParentLink(user.id) : undefined;
      const canViewFull = canViewFullProfile(requesterId, user.id, approvedParentLink?.parentId);
      
      // Calculate ageBand from birthDate if not set
      const ageBand = user.ageBand || calculateAgeBand(user.birthDate);
      
      if (canViewFull) {
        // Owner or parent - return full profile including birthDate
        res.json({ ...profile, ageBand });
      } else {
        // Public view - hide sensitive fields
        const { birthDate, email, parentEmail, ...publicProfile } = profile;
        res.json({ ...publicProfile, ageBand });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/profiles", verifySupabaseToken, async (req, res) => {
    try {
      const validationResult = createProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0]?.message || "Invalid profile data" });
      }
      
      const { id, email, username, name, handle, avatar, bio, animeInterests, theme, birthDate, isMinor, parentEmail } = validationResult.data;
      
      // Verify the request is from the same user
      if (req.supabaseUser?.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Check if username or handle already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const existingHandle = await storage.getUserByHandle(handle);
      if (existingHandle) {
        return res.status(400).json({ error: "Handle already taken" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      // Calculate age-related fields from birthDate
      const parsedBirthDate = birthDate ? new Date(birthDate) : undefined;
      const ageBand = calculateAgeBand(parsedBirthDate || null);
      const birthYear = parsedBirthDate ? parsedBirthDate.getFullYear() : undefined;
      const calculatedIsMinor = ageBand === 'child' || ageBand === 'teen';
      
      // Create profile with Supabase user ID
      const user = await storage.createUserWithId(id, {
        email,
        username,
        name,
        handle,
        avatar,
        bio: bio || "New to AniRealm",
        animeInterests: animeInterests || [],
        theme: theme || "cyberpunk",
        birthDate: parsedBirthDate,
        birthYear,
        ageBand,
        isMinor: calculatedIsMinor,
        parentEmail,
        password: '', // No local password for Supabase Auth users
      });
      
      // Link the Supabase user ID to the profile
      await storage.updateUserSupabaseId(user.id, id);
      
      const { password, ...profile } = user;
      res.json({ ...profile, supabaseUserId: id });
    } catch (error: any) {
      console.error("Profile creation error:", error);
      res.status(400).json({ error: error.message || "Failed to create profile" });
    }
  });
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      // Parse birthDate from ISO string if provided
      const bodyWithParsedDate = {
        ...req.body,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
      };
      
      const validatedData = insertUserSchema.parse(bodyWithParsedDate);
      
      // Check if username or handle already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const existingHandle = await storage.getUserByHandle(validatedData.handle);
      if (existingHandle) {
        return res.status(400).json({ error: "Handle already taken" });
      }
      
      // Hash password (only if provided - Supabase Auth users won't have local password)
      const hashedPassword = validatedData.password 
        ? await bcrypt.hash(validatedData.password, 10)
        : '';
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Set session
      req.session.userId = user.id;
      
      // Remove password before sending
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Signup failed" });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Check legacy auth kill switch
      const legacyAuthEnabled = process.env.LEGACY_AUTH_ENABLED !== 'false';
      if (!legacyAuthEnabled) {
        return res.status(410).json({ 
          error: "Legacy authentication is no longer available. Please use Supabase Auth to sign in.",
          code: "LEGACY_AUTH_DISABLED"
        });
      }
      
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ error: "Account banned" });
      }
      
      const validPassword = user.password && await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Remove password before sending
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  
  // Migrate legacy user to Supabase Auth
  // Links a legacy user account to a Supabase Auth account by matching email
  app.post("/api/auth/migrate", verifySupabaseToken, async (req, res) => {
    try {
      const supabaseUser = req.supabaseUser;
      if (!supabaseUser || !supabaseUser.email) {
        return res.status(401).json({ error: "Supabase authentication required" });
      }
      
      // Check if this Supabase user is already linked to an account
      const existingLinkedUser = await storage.getUserBySupabaseId(supabaseUser.id);
      if (existingLinkedUser) {
        const { password, ...userWithoutPassword } = existingLinkedUser;
        return res.json({ 
          message: "Already linked",
          user: userWithoutPassword 
        });
      }
      
      // Find legacy user by email
      const legacyUser = await storage.getUserByEmail(supabaseUser.email);
      if (!legacyUser) {
        return res.status(404).json({ 
          error: "No legacy account found with this email",
          code: "NO_LEGACY_ACCOUNT"
        });
      }
      
      // Check if legacy user is already linked to a different Supabase account
      if (legacyUser.supabaseUserId && legacyUser.supabaseUserId !== supabaseUser.id) {
        return res.status(409).json({ 
          error: "This account is already linked to a different Supabase user",
          code: "ALREADY_LINKED"
        });
      }
      
      // Link the legacy user to the Supabase account
      const updatedUser = await storage.updateUserSupabaseId(legacyUser.id, supabaseUser.id);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to link accounts" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ 
        message: "Account successfully linked",
        user: userWithoutPassword 
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ error: error.message || "Migration failed" });
    }
  });
  
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // ========== ONBOARDING ENDPOINTS ==========
  
  // Get onboarding status
  app.get("/api/onboarding/status", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const status = await storage.getOnboardingStatus(req.dbUser.id);
      const hasBadge = await storage.hasUserBadge(req.dbUser.id, 'REALMWALKER_I');
      
      res.json({
        completed: status.completed,
        steps: {
          claimFreeSummon: !!status.firstSummonAt,
          earnFirstBadge: hasBadge,
          shareFirstPull: !!status.firstShareAt, // Optional step
        },
        firstSummonAt: status.firstSummonAt,
        firstShareAt: status.firstShareAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dismiss onboarding banner (called when user dismisses the completion banner)
  app.post("/api/onboarding/dismiss", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Mark onboarding as completed (in case it wasn't already)
      await storage.completeOnboarding(req.dbUser.id);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== END ONBOARDING ==========
  
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => {
        const { password, email, parentEmail, birthDate, stripeCustomerId, stripeSubscriptionId, ...publicUser } = user;
        return {
          ...publicUser,
          ageBand: user.ageBand || calculateAgeBand(birthDate ? new Date(birthDate) : null),
        };
      });
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, email, parentEmail, birthDate, stripeCustomerId, stripeSubscriptionId, ...publicUser } = user;
      res.json({
        ...publicUser,
        ageBand: user.ageBand || calculateAgeBand(birthDate ? new Date(birthDate) : null),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/users/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (req.dbUser.id !== req.params.id && !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized to update this user" });
      }
      
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Preset avatars whitelist (security: only allow these IDs)
  const PRESET_AVATARS = [
    'preset_001', 'preset_002', 'preset_003', 'preset_004',
    'preset_005', 'preset_006', 'preset_007', 'preset_008',
    'preset_009', 'preset_010', 'preset_011', 'preset_012',
  ];

  // Update user avatar
  app.patch("/api/users/:id/avatar", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (req.dbUser.id !== req.params.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { avatarId } = req.body;
      if (!avatarId || typeof avatarId !== 'string') {
        return res.status(400).json({ error: "avatarId is required" });
      }
      
      // Validate against whitelist
      if (!PRESET_AVATARS.includes(avatarId)) {
        return res.status(400).json({ error: "Invalid avatar selection" });
      }
      
      const avatarUrl = `/avatars/${avatarId}.svg`;
      
      const updatedUser = await storage.updateUser(req.params.id, {
        avatar: avatarUrl,
        avatarType: 'preset',
        avatarId: avatarId,
        avatarUpdatedAt: new Date(),
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get available preset avatars
  app.get("/api/avatars/presets", (req, res) => {
    const presets = PRESET_AVATARS.map(id => ({
      id,
      url: `/avatars/${id}.svg`,
      name: `Avatar ${id.split('_')[1]}`
    }));
    res.json(presets);
  });

  // ============== PROFILE & BADGES API ==============

  // Get user profile with badges and collection stats (public)
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [userBadges, uniqueCardCount] = await Promise.all([
        storage.getUserBadges(user.id),
        storage.getUserUniqueCardCount(user.id),
      ]);

      // Check and grant any missing collection milestones
      await storage.checkAndGrantCollectionMilestones(user.id);

      // Calculate next milestone
      const milestones = [10, 25, 50, 100];
      const nextMilestone = milestones.find(m => uniqueCardCount < m) || null;
      
      // Add S-Class badge dynamically if user is premium
      const badges = userBadges.map(ub => ({
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        category: ub.badge.category,
        grantedAt: ub.createdAt,
      }));
      
      // Include S-Class badge if premium and not already in badges
      if (user.isPremium && !badges.find(b => b.code === 's_class')) {
        const sclassBadge = await storage.getBadgeByCode('s_class');
        if (sclassBadge) {
          badges.push({
            code: sclassBadge.code,
            name: sclassBadge.name,
            description: sclassBadge.description,
            icon: sclassBadge.icon,
            category: sclassBadge.category,
            grantedAt: user.premiumStartDate || new Date(),
          });
        }
      }

      // Calculate relative join time
      const joinedDaysAgo = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      let joinedRelative = 'just joined';
      if (joinedDaysAgo >= 365) {
        joinedRelative = `${Math.floor(joinedDaysAgo / 365)} year(s) ago`;
      } else if (joinedDaysAgo >= 30) {
        joinedRelative = `${Math.floor(joinedDaysAgo / 30)} month(s) ago`;
      } else if (joinedDaysAgo > 0) {
        joinedRelative = `${joinedDaysAgo} day(s) ago`;
      }

      res.json({
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        isPremium: user.isPremium,
        joinedRelative,
        totalUniqueCards: uniqueCardCount,
        nextMilestone,
        badges,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user profile by handle (public)
  app.get("/api/profile/:handle", async (req, res) => {
    try {
      let handle = req.params.handle;
      if (!handle.startsWith('@')) {
        handle = '@' + handle;
      }
      
      const user = await storage.getUserByHandle(handle);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Redirect to the /api/users/:id/profile endpoint logic
      const [userBadges, uniqueCardCount] = await Promise.all([
        storage.getUserBadges(user.id),
        storage.getUserUniqueCardCount(user.id),
      ]);

      await storage.checkAndGrantCollectionMilestones(user.id);

      const milestones = [10, 25, 50, 100];
      const nextMilestone = milestones.find(m => uniqueCardCount < m) || null;
      
      const badges = userBadges.map(ub => ({
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        category: ub.badge.category,
        grantedAt: ub.createdAt,
      }));
      
      if (user.isPremium && !badges.find(b => b.code === 's_class')) {
        const sclassBadge = await storage.getBadgeByCode('s_class');
        if (sclassBadge) {
          badges.push({
            code: sclassBadge.code,
            name: sclassBadge.name,
            description: sclassBadge.description,
            icon: sclassBadge.icon,
            category: sclassBadge.category,
            grantedAt: user.premiumStartDate || new Date(),
          });
        }
      }

      const joinedDaysAgo = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      let joinedRelative = 'just joined';
      if (joinedDaysAgo >= 365) {
        joinedRelative = `${Math.floor(joinedDaysAgo / 365)} year(s) ago`;
      } else if (joinedDaysAgo >= 30) {
        joinedRelative = `${Math.floor(joinedDaysAgo / 30)} month(s) ago`;
      } else if (joinedDaysAgo > 0) {
        joinedRelative = `${joinedDaysAgo} day(s) ago`;
      }

      res.json({
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        isPremium: user.isPremium,
        joinedRelative,
        totalUniqueCards: uniqueCardCount,
        nextMilestone,
        badges,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get current user's collection progress
  app.get("/api/users/me/collection-progress", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const uniqueCardCount = await storage.getUserUniqueCardCount(req.dbUser.id);
      const milestones = [10, 25, 50, 100];
      const nextMilestone = milestones.find(m => uniqueCardCount < m) || null;
      const prevMilestone = [...milestones].reverse().find(m => uniqueCardCount >= m) || 0;

      // Check and grant any missing badges
      const newBadges = await storage.checkAndGrantCollectionMilestones(req.dbUser.id);

      res.json({
        uniqueCards: uniqueCardCount,
        nextMilestone,
        prevMilestone,
        progress: nextMilestone ? (uniqueCardCount / nextMilestone) * 100 : 100,
        newBadgesGranted: newBadges,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Grant badge to user
  app.post("/api/badges/grant", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId, badgeCode, reason } = req.body;
      if (!userId || !badgeCode) {
        return res.status(400).json({ error: "userId and badgeCode are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const badge = await storage.getBadgeByCode(badgeCode);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      const userBadge = await storage.grantBadge(userId, badgeCode, 'admin', reason);
      if (!userBadge) {
        return res.status(400).json({ error: "User already has this badge" });
      }

      res.json({ success: true, badge: badge.name });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Revoke badge from user
  app.post("/api/badges/revoke", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId, badgeCode } = req.body;
      if (!userId || !badgeCode) {
        return res.status(400).json({ error: "userId and badgeCode are required" });
      }

      await storage.revokeBadge(userId, badgeCode);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all available badges (for admin panel)
  app.get("/api/badges", async (req, res) => {
    try {
      const allBadges = await storage.getAllBadges();
      res.json(allBadges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reserved words that cannot be used as handles (all lowercase for comparison)
  const RESERVED_HANDLES = [
    // Routes
    'cards', 'events', 'summons', 'admin', 'login', 'signup', 'api', 
    'profile', 'settings', 'home', 'help', 'support', 'about', 'terms',
    'privacy', 'contact', 'feeds', 'friends', 'communities', 'community',
    'draws', 'tokens', 'sclass', 'premium', 'benefits', 'game', 'universe',
    'checkout', 'gacha', 'market', 'watchlist', 'create', 'parent',
    // Staff/system
    'mod', 'moderator', 'staff', 'official', 'anirealm', 'system', 'bot',
    'null', 'undefined', 'test', 'demo', 'example', 'user', 'users', 'anonymous',
    // Auth/security
    'auth', 'authenticate', 'authentication', 'password', 'reset', 'verify',
    'confirm', 'register', 'signin', 'signout', 'oauth', 'sso',
    // Legal/support
    'legal', 'tos', 'eula', 'dmca', 'copyright', 'trademark', 'faq',
    'helpdesk', 'feedback', 'report', 'abuse', 'spam',
    // Common reserved
    'root', 'admin123', 'administrator', 'superuser', 'webmaster', 'postmaster',
    'hostmaster', 'info', 'mail', 'email', 'www', 'ftp', 'cdn', 'static',
    // App-specific
    'anime', 'manga', 'otaku', 'waifu', 'nakama', 'kawaii', 'senpai',
  ];

  // Handle validation schema
  const handleSchema = z.string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle must be 20 characters or less")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Handle must start with a letter and contain only letters, numbers, and underscores");

  // Get user by handle (public endpoint for /@username routes)
  app.get("/api/users/by-handle/:handle", async (req, res) => {
    try {
      let handle = req.params.handle;
      // Normalize handle - add @ prefix if not present
      if (!handle.startsWith('@')) {
        handle = '@' + handle;
      }
      
      const user = await storage.getUserByHandle(handle.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if handle is available
  app.get("/api/handles/check/:handle", async (req, res) => {
    try {
      let handle = req.params.handle.toLowerCase();
      
      // Validate format
      const validation = handleSchema.safeParse(handle);
      if (!validation.success) {
        return res.json({ available: false, reason: validation.error.errors[0]?.message });
      }
      
      // Check reserved words
      if (RESERVED_HANDLES.includes(handle.toLowerCase())) {
        return res.json({ available: false, reason: "This handle is reserved" });
      }
      
      // Check if already taken (add @ prefix for database lookup)
      const existingUser = await storage.getUserByHandle('@' + handle);
      if (existingUser) {
        return res.json({ available: false, reason: "Handle already taken" });
      }
      
      res.json({ available: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's handle
  app.patch("/api/users/:id/handle", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (req.dbUser.id !== req.params.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { handle: newHandle } = req.body;
      if (!newHandle) {
        return res.status(400).json({ error: "Handle is required" });
      }
      
      // Normalize to lowercase without @ prefix for validation
      const handleWithoutAt = newHandle.replace(/^@/, '').toLowerCase();
      
      // Validate format
      const validation = handleSchema.safeParse(handleWithoutAt);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0]?.message });
      }
      
      // Check reserved words
      if (RESERVED_HANDLES.includes(handleWithoutAt)) {
        return res.status(400).json({ error: "This handle is reserved" });
      }
      
      // Check cooldown (30 days)
      const user = await storage.getUser(req.params.id);
      if (user?.handleChangedAt) {
        const daysSinceChange = (Date.now() - new Date(user.handleChangedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 30) {
          const daysRemaining = Math.ceil(30 - daysSinceChange);
          return res.status(400).json({ 
            error: `You can change your handle again in ${daysRemaining} days`,
            cooldownRemaining: daysRemaining
          });
        }
      }
      
      // Normalize handle with @ prefix
      const normalizedHandle = '@' + handleWithoutAt;
      
      // Check if already taken (case-insensitive)
      const existingUser = await storage.getUserByHandle(normalizedHandle);
      if (existingUser && existingUser.id !== req.params.id) {
        return res.status(400).json({ error: "Handle already taken" });
      }
      
      // Update handle and set change timestamp
      const updatedUser = await storage.updateUser(req.params.id, {
        handle: normalizedHandle,
        handleChangedAt: new Date(),
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Post routes
  app.get("/api/posts", verifySupabaseToken, async (req, res) => {
    try {
      // If user is authenticated, return posts with like status
      if (req.dbUser) {
        const posts = await storage.getPostsWithLikeStatus(req.dbUser.id);
        res.json(posts);
      } else {
        const posts = await storage.getPosts();
        res.json(posts);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/posts", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.dbUser.id,
      });
      
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Summon share endpoint with rate limiting (max 5 per day)
  app.post("/api/posts/summon-share", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { cardId, source } = req.body;
      if (!cardId) {
        return res.status(400).json({ error: "Card ID is required" });
      }

      // Check rate limit: max 5 summon shares per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const summonSharesToday = await storage.countSummonSharesToday(req.dbUser.id, today);
      
      if (summonSharesToday >= 5) {
        return res.status(429).json({ error: "You've reached the daily limit of 5 summon shares" });
      }

      // Get card details
      const card = await storage.getCard(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Create post with fixed template
      const postContent = `⚡ I pulled ${card.name} — ${card.rarity}!`;
      const post = await storage.createPost({
        userId: req.dbUser.id,
        content: postContent,
        image: card.image,
        postType: 'summon',
        cardId: cardId,
        summonSource: source || 'paid',
      });

      // Mark first share for onboarding (optional step)
      await storage.markFirstShare(req.dbUser.id);

      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post("/api/posts/:id/like", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const result = await storage.toggleLikePost(req.params.id, req.dbUser.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Card routes
  app.get("/api/cards", async (req, res) => {
    try {
      const cards = await storage.getAllCards();
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trending cards - most acquired in last 7 days
  app.get("/api/cards/trending", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const trendingCards = await storage.getTrendingCards(limit);
      res.json(trendingCards);
    } catch (error: any) {
      console.error("Error fetching trending cards:", error);
      res.json([]); // Graceful empty state
    }
  });

  // Top collectors - users with most unique cards
  app.get("/api/collectors/top", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const topCollectors = await storage.getTopCollectors(limit);
      res.json(topCollectors);
    } catch (error: any) {
      console.error("Error fetching top collectors:", error);
      res.json([]); // Graceful empty state
    }
  });

  // Card catalog with pagination and filtering
  app.get("/api/cards/catalog", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);
      const sortOrder = (req.query.sort as string) === 'oldest' ? 'oldest' : 'newest';
      
      // Whitelist valid rarities to prevent injection
      const validRarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
      let rarities: string[] | undefined;
      if (req.query.rarities) {
        const requestedRarities = (req.query.rarities as string).split(',');
        rarities = requestedRarities.filter(r => validRarities.includes(r));
        if (rarities.length === 0) rarities = undefined;
      }
      
      const result = await storage.getCatalogCards({ page, limit, rarities, sortOrder });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/users/:userId/cards", async (req, res) => {
    try {
      const userCards = await storage.getUserCards(req.params.userId);
      res.json(userCards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/cards/summon", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = req.dbUser;
      if (user.tokens < 100) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }
      
      // Get only active (non-archived) cards and pick random ones
      const allCards = await storage.getActiveCards();
      if (allCards.length === 0) {
        return res.status(400).json({ error: "No cards available in the gacha pool" });
      }
      const numPulls = user.isPremium ? 2 : 1;
      const pulledCards = [];
      
      for (let i = 0; i < numPulls; i++) {
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        pulledCards.push(randomCard);
        await storage.addCardToUser({
          userId: user.id,
          cardId: randomCard.id,
        });
      }
      
      // Deduct tokens
      await storage.updateUser(user.id, {
        tokens: user.tokens - 100,
      });
      
      // Track daily paid summons for soft reminder
      let paidSummonsToday = user.paidSummonsToday || 0;
      let paidResetAt = user.paidSummonsResetAt ? new Date(user.paidSummonsResetAt) : null;
      let reminderShownToday = user.paidReminderShownToday || false;
      
      // Check if paid summon counter needs reset (7:00 PM ET)
      if (needsReset(paidResetAt)) {
        paidSummonsToday = 0;
        paidResetAt = getNext7PMETResetTime();
        reminderShownToday = false;
        await storage.updateUser(user.id, {
          paidSummonsToday: 0,
          paidSummonsResetAt: paidResetAt,
          paidReminderShownToday: false,
        });
      }
      
      // Increment paid summon counter
      paidSummonsToday += 1;
      await storage.updateUser(user.id, {
        paidSummonsToday: paidSummonsToday,
      });
      
      // Check if we should show the reminder (threshold reached and not shown yet today)
      let showReminder = false;
      if (paidSummonsToday >= PAID_SUMMON_REMINDER.THRESHOLD && !reminderShownToday) {
        showReminder = true;
        await storage.updateUser(user.id, {
          paidReminderShownToday: true,
        });
      }
      
      // Check and grant collection milestone badges
      const newBadges = await storage.checkAndGrantCollectionMilestones(user.id);
      
      // Mark first summon for onboarding (auto-grants Realmwalker I badge)
      await storage.markFirstSummon(user.id);
      
      res.json({ 
        cards: pulledCards, 
        newBadges,
        showPaidSummonReminder: showReminder,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== FREE DAILY GACHA ENDPOINTS ==========
  
  // Get free summon status for current user
  app.get("/api/gacha/free-status", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = req.dbUser;
      const dailyLimit = user.isPremium ? FREE_SUMMON_LIMITS.PREMIUM_USER : FREE_SUMMON_LIMITS.FREE_USER;
      
      // Check if reset is needed
      let usedToday = user.freeSummonsUsedToday || 0;
      let resetAt = user.freeSummonsResetAt ? new Date(user.freeSummonsResetAt) : null;
      
      if (needsReset(resetAt)) {
        // Reset the counter
        usedToday = 0;
        resetAt = getNextResetTime();
        await storage.updateUser(user.id, {
          freeSummonsUsedToday: 0,
          freeSummonsResetAt: resetAt,
        });
      }
      
      res.json({
        dailyFreeLimit: dailyLimit,
        usedToday: usedToday,
        remainingToday: Math.max(0, dailyLimit - usedToday),
        nextResetAt: resetAt?.toISOString() || getNextResetTime().toISOString(),
        isPremium: user.isPremium,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Perform free summon (Standard Banner only)
  app.post("/api/gacha/free-summon", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = req.dbUser;
      const dailyLimit = user.isPremium ? FREE_SUMMON_LIMITS.PREMIUM_USER : FREE_SUMMON_LIMITS.FREE_USER;
      
      // Check if reset is needed
      let usedToday = user.freeSummonsUsedToday || 0;
      let resetAt = user.freeSummonsResetAt ? new Date(user.freeSummonsResetAt) : null;
      
      if (needsReset(resetAt)) {
        usedToday = 0;
        resetAt = getNextResetTime();
        await storage.updateUser(user.id, {
          freeSummonsUsedToday: 0,
          freeSummonsResetAt: resetAt,
        });
      }
      
      // Check if user has free summons remaining
      if (usedToday >= dailyLimit) {
        return res.status(400).json({
          error: "No free summons remaining today",
          nextResetAt: resetAt?.toISOString() || getNextResetTime().toISOString(),
        });
      }
      
      // Get standard banner cards only
      const standardCards = await storage.getStandardBannerCards();
      if (standardCards.length === 0) {
        return res.status(400).json({ error: "No cards available in the Standard Banner pool" });
      }
      
      // Use FREE_ODDS table to select rarity
      const selectedRarity = selectRarity(FREE_ODDS);
      
      // Filter cards by selected rarity
      let eligibleCards = standardCards.filter(c => c.rarity === selectedRarity);
      
      // Fallback: if no cards of that rarity, pick from any available
      if (eligibleCards.length === 0) {
        eligibleCards = standardCards;
      }
      
      // Pick a random card
      const pulledCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
      
      // Add card to user's collection
      await storage.addCardToUser({
        userId: user.id,
        cardId: pulledCard.id,
      });
      
      // Update free summons counter
      const newUsedToday = usedToday + 1;
      await storage.updateUser(user.id, {
        freeSummonsUsedToday: newUsedToday,
      });
      
      // Check and grant collection milestone badges
      const newBadges = await storage.checkAndGrantCollectionMilestones(user.id);
      
      // Mark first summon for onboarding (auto-grants Realmwalker I badge)
      await storage.markFirstSummon(user.id);
      
      res.json({
        card: pulledCard,
        remainingToday: Math.max(0, dailyLimit - newUsedToday),
        nextResetAt: resetAt?.toISOString() || getNextResetTime().toISOString(),
        newBadges,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== END FREE DAILY GACHA ==========
  
  // Admin: Create new card
  app.post("/api/cards", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const card = await storage.createCard(req.body);
      res.json(card);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Admin: Delete card (only if no owners)
  app.delete("/api/cards/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const ownerCount = await storage.getCardOwnerCount(req.params.id);
      const forceDelete = req.query.force === 'true';
      
      if (ownerCount > 0 && !forceDelete) {
        return res.status(400).json({ 
          error: `Cannot delete card owned by ${ownerCount} user(s). Use archive instead or force delete.`,
          ownerCount 
        });
      }
      
      await storage.deleteCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Archive card (removes from gacha, keeps in user collections)
  app.post("/api/cards/:id/archive", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.archiveCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Unarchive card
  app.post("/api/cards/:id/unarchive", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.unarchiveCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get cards with owner counts
  app.get("/api/cards/admin", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const cardsWithCounts = await storage.getCardsWithOwnerCounts();
      res.json(cardsWithCounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Update card
  app.patch("/api/cards/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const card = await storage.updateCard(req.params.id, req.body);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.json(card);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get signed upload URL for card images
  app.post("/api/admin/cards/upload-url", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { contentType } = req.body;
      if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ error: "Invalid content type. Only images allowed." });
      }
      
      const extension = contentType.split('/')[1] || 'png';
      const filename = `${nanoid()}.${extension}`;
      const objectKey = `cards/${filename}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .createSignedUploadUrl(objectKey, { upsert: false });
      
      if (error || !data) {
        console.error('Supabase upload URL error:', error);
        return res.status(500).json({ error: error?.message || 'Failed to create upload URL' });
      }
      
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('media')
        .getPublicUrl(objectKey);
      
      res.json({
        uploadUrl: data.signedUrl,
        objectKey,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get scheduled cards
  app.get("/api/admin/cards/scheduled", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const cards = await storage.getScheduledCards();
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get cards by status
  app.get("/api/admin/cards/by-status/:status", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const validStatuses = ['draft', 'scheduled', 'active', 'retired'];
      if (!validStatuses.includes(req.params.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const cards = await storage.getCardsByStatus(req.params.status);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Update card status (scheduling)
  app.patch("/api/admin/cards/:id/status", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { status, scheduledReleaseDate } = req.body;
      const validStatuses = ['draft', 'scheduled', 'active', 'retired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      if (status === 'scheduled' && !scheduledReleaseDate) {
        return res.status(400).json({ error: "Scheduled status requires a release date" });
      }
      
      const releaseDate = scheduledReleaseDate ? new Date(scheduledReleaseDate) : null;
      const card = await storage.updateCardStatus(req.params.id, status, releaseDate);
      
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      
      res.json(card);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Activate all scheduled cards that are past their release date
  app.post("/api/admin/cards/activate-scheduled", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const activated = await storage.activateScheduledCards();
      res.json({ activated, message: `${activated} card(s) activated` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get cards for a specific pool (daily, weekly, monthly, event)
  app.get("/api/cards/pool/:pool", async (req, res) => {
    try {
      const validPools = ['daily', 'weekly', 'monthly', 'event'];
      if (!validPools.includes(req.params.pool)) {
        return res.status(400).json({ error: "Invalid pool" });
      }
      
      const cards = await storage.getCardsForPool(req.params.pool);
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Card Categories CRUD
  app.get("/api/admin/card-categories", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const categories = await storage.getAllCardCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/card-categories", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const validatedData = insertCardCategorySchema.parse(req.body);
      const category = await storage.createCardCategory(validatedData);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.patch("/api/admin/card-categories/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const category = await storage.updateCardCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/admin/card-categories/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.deleteCardCategory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Marketplace routes
  app.get("/api/market/listings", async (req, res) => {
    try {
      const listings = await storage.getActiveListings();
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/market/listings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const listing = await storage.createListing({
        ...req.body,
        sellerId: req.session.userId,
      });
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post("/api/market/listings/:id/purchase", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.purchaseListing(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Community routes
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/communities/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getCommunityMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/communities/:id/messages", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertCommunityMessageSchema.parse({
        ...req.body,
        communityId: req.params.id,
        userId: req.session.userId,
      });
      
      const message = await storage.sendMessage(validatedData);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Swipe routes (Find Nakama)
  app.get("/api/swipe/candidates", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const candidates = await storage.getSwipeCandidates(req.session.userId);
      const candidatesWithoutPasswords = candidates.map(({ password, ...user }) => user);
      res.json(candidatesWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/swipe", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertSwipeActionSchema.parse({
        ...req.body,
        fromUserId: req.session.userId,
      });
      
      const swipe = await storage.recordSwipe(validatedData);
      res.json(swipe);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get("/api/swipe/matches", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const matches = await storage.getMatches(req.session.userId);
      const matchesWithoutPasswords = matches.map(({ password, ...user }) => user);
      res.json(matchesWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin routes
  app.post("/api/admin/users/:id/ban", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { isBanned: true });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/users/:id/unban", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { isBanned: false });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/users/:id/premium", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { startDate, endDate } = req.body;
      
      const updates: any = { isPremium: true };
      if (startDate) {
        updates.premiumStartDate = new Date(startDate);
      }
      if (endDate) {
        updates.premiumEndDate = new Date(endDate);
      }
      
      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Revoke premium access
  app.post("/api/admin/users/:id/revoke-premium", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { 
        isPremium: false,
        premiumStartDate: null,
        premiumEndDate: null
      });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Grant admin S-Class access (separate from paid subscriptions)
  app.post("/api/admin/users/:id/grant-access", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { expiresAt, forceOverwrite } = req.body;
      if (!expiresAt) {
        return res.status(400).json({ error: "expiresAt is required for admin grants" });
      }
      
      const expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ error: "Invalid expiration date" });
      }
      
      // Get current user to check existing state
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user already has an active subscription - warn admin but allow
      const hasActiveSubscription = targetUser.subscriptionStatus === 'active' || targetUser.subscriptionStatus === 'canceled_pending_expiry';
      const hasExistingGrant = targetUser.accessSource === 'admin_grant';
      
      // If user has existing grant or subscription and forceOverwrite not set, return warning
      if ((hasActiveSubscription || hasExistingGrant) && !forceOverwrite) {
        return res.status(409).json({ 
          error: "User already has S-Class access",
          details: {
            hasActiveSubscription,
            hasExistingGrant,
            existingAccessExpiresAt: targetUser.accessExpiresAt,
            subscriptionStatus: targetUser.subscriptionStatus
          },
          message: "Set forceOverwrite: true to override existing access"
        });
      }
      
      const user = await storage.updateUser(req.params.id, { 
        isPremium: true,
        accessSource: 'admin_grant',
        accessExpiresAt: expirationDate
      });
      
      res.json({
        ...user,
        warning: hasActiveSubscription ? "User also has an active paid subscription that will continue after admin grant expires" : undefined
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Revoke admin-granted S-Class access
  app.post("/api/admin/users/:id/revoke-grant", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser || !req.dbUser.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only revoke if access was admin-granted
      if (user.accessSource !== 'admin_grant') {
        return res.status(400).json({ error: "User does not have admin-granted access" });
      }
      
      // Check if user has an active paid subscription to fall back to
      // subscriptionStatus 'active' means ongoing subscription (premiumEndDate may be null for auto-renewing)
      // 'canceled_pending_expiry' means they canceled but still have access until premiumEndDate
      const now = new Date();
      const hasPaidSubscription = user.subscriptionStatus === 'active' || 
        (user.subscriptionStatus === 'canceled_pending_expiry' && user.premiumEndDate && new Date(user.premiumEndDate) > now);
      
      const updates: any = {
        accessSource: null,
        accessExpiresAt: null
      };
      
      // If no paid subscription, revoke premium entirely
      if (!hasPaidSubscription) {
        updates.isPremium = false;
      }
      
      const updatedUser = await storage.updateUser(req.params.id, updates);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Payment Exceptions routes
  app.get("/api/admin/payments-exceptions", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const status = (req.query.status as string) || 'EXPIRED_AFTER_PAYMENT';
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      const requests = await storage.getPurchaseRequestsWithExceptions(status, limit);
      
      res.json(requests.map(r => ({
        requestId: r.id,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        approvedAt: r.approvedAt,
        paidAt: r.paidAt,
        parent: {
          id: r.parent.id,
          username: r.parent.username,
          email: r.parent.email,
          name: r.parent.name,
        },
        child: {
          id: r.child.id,
          username: r.child.username,
          handle: r.child.handle,
          name: r.child.name,
        },
        tokenAmount: r.totalTokens,
        priceCents: r.unitAmountCents,
        currency: r.currency,
        stripeCheckoutSessionId: r.stripeCheckoutSessionId,
        stripePaymentIntentId: r.stripePaymentIntentId,
        hasLedgerEntry: r.hasLedgerEntry,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/purchase-requests/:id/grant-tokens", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await storage.grantTokensForExpiredPayment(req.params.id, req.dbUser.id);
      
      if (!result) {
        return res.status(400).json({ error: "Cannot grant tokens for this request. Status may not be EXPIRED_AFTER_PAYMENT or tokens already granted." });
      }
      
      res.json({
        success: true,
        request: result,
        message: "Tokens granted successfully"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/purchase-requests/:id/mark-resolved", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await storage.markPurchaseResolved(req.params.id, req.dbUser.id);
      
      if (!result) {
        return res.status(400).json({ error: "Cannot resolve this request. Status may not be EXPIRED_AFTER_PAYMENT." });
      }
      
      res.json({
        success: true,
        request: result,
        message: "Request marked as resolved"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Security Metrics API endpoints (admin-only)
  app.get("/api/admin/security-metrics/overview", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const days = parseInt(req.query.days as string) || 30;
      const overview = await storage.getSecurityMetricsOverview(days);
      
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/admin/security-metrics/blocked", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const days = parseInt(req.query.days as string) || 30;
      const blocked = await storage.getSecurityMetricsBlocked(days);
      
      res.json(blocked);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Prize routes
  app.get("/api/prizes", async (req, res) => {
    try {
      const prizes = await storage.getAllPrizes();
      res.json(prizes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/prizes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const validatedData = insertPrizeSchema.parse(req.body);
      const prize = await storage.createPrize(validatedData);
      res.json(prize);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Draw routes - public
  app.get("/api/draws", async (req, res) => {
    try {
      const draws = await storage.getAllDraws();
      res.json(draws);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/active", async (req, res) => {
    try {
      const draws = await storage.getActiveDraws();
      res.json(draws);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/featured", async (req, res) => {
    try {
      const draw = await storage.getFeaturedDraw();
      res.json(draw || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper: Get next Friday at 7PM America/Toronto using date-fns-tz
  function getNextFridayToronto(): Date {
    const TORONTO_TZ = 'America/Toronto';
    const now = new Date();
    
    // Calculate what day/time it is in Toronto
    const torontoFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TORONTO_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
    });
    const parts = torontoFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    const torontoYear = parseInt(getPart('year'));
    const torontoMonth = parseInt(getPart('month')) - 1;
    const torontoDay = parseInt(getPart('day'));
    const torontoHour = parseInt(getPart('hour'));
    const weekdayStr = getPart('weekday');
    
    // Map weekday string to number (0=Sun, 5=Fri)
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? new Date(torontoYear, torontoMonth, torontoDay).getDay();
    
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday === 0 && torontoHour >= 19) {
      daysUntilFriday = 7; // Next Friday if it's Friday after 7PM
    }
    
    // Calculate target date components in Toronto timezone
    const targetDate = new Date(torontoYear, torontoMonth, torontoDay + daysUntilFriday);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    
    // Create a naive Date object with Toronto wall-clock time (hour=19)
    // This Date's internal UTC representation doesn't matter - we're using it as a container for the values
    const naiveTorontoTime = new Date(year, month, day, 19, 0, 0, 0);
    // fromZonedTime reads the local date parts (getFullYear, getMonth, etc.) and treats them as Toronto time
    return fromZonedTime(naiveTorontoTime, TORONTO_TZ);
  }

  // Helper: Get last Friday of current/next month at 7PM Toronto
  function getLastFridayOfMonthToronto(): Date {
    const TORONTO_TZ = 'America/Toronto';
    const now = new Date();
    
    // Get Toronto current date
    const torontoFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TORONTO_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const parts = torontoFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    let year = parseInt(getPart('year'));
    let month = parseInt(getPart('month')) - 1;
    const torontoDay = parseInt(getPart('day'));
    const torontoHour = parseInt(getPart('hour'));
    const torontoMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    
    // Find last Friday of a month (using UTC to avoid local timezone issues)
    function findLastFriday(y: number, m: number): { year: number; month: number; day: number } {
      // Last day of month m in year y
      const lastDayDate = new Date(Date.UTC(y, m + 1, 0));
      const lastDayOfMonth = lastDayDate.getUTCDate();
      for (let d = lastDayOfMonth; d >= 1; d--) {
        const testDate = new Date(Date.UTC(y, m, d));
        if (testDate.getUTCDay() === 5) { // Friday
          return { year: y, month: m, day: d };
        }
      }
      return { year: y, month: m, day: lastDayOfMonth }; // fallback
    }
    
    let lastFriday = findLastFriday(year, month);
    
    // Check if last Friday 7PM has passed in Toronto time
    const torontoNowMins = torontoDay * 24 * 60 + torontoHour * 60 + torontoMinute;
    const lastFridayMins = lastFriday.day * 24 * 60 + 19 * 60;
    
    if (torontoNowMins >= lastFridayMins) {
      // Move to next month
      month++;
      if (month > 11) { month = 0; year++; }
      lastFriday = findLastFriday(year, month);
    }
    
    // Create a naive Date object with Toronto wall-clock time (hour=19)
    const naiveTorontoTime = new Date(lastFriday.year, lastFriday.month, lastFriday.day, 19, 0, 0, 0);
    // fromZonedTime reads the local date parts and treats them as Toronto time
    return fromZonedTime(naiveTorontoTime, TORONTO_TZ);
  }

  app.get("/api/draws/next", optionalSupabaseAuth, async (req, res) => {
    try {
      const MONTHLY_TOKEN_COST = 100;
      
      let [weeklyDraw, monthlyDraw] = await Promise.all([
        storage.getNextDrawByCadence('weekly'),
        storage.getNextDrawByCadence('monthly'),
      ]);

      // Auto-create weekly draw if none exists
      if (!weeklyDraw) {
        const nextFriday = getNextFridayToronto();
        const cycleId = `weekly-${nextFriday.toISOString().slice(0, 10)}`;
        // Check if draw with this cycleId exists (in any status)
        const existing = await storage.getDrawByCycleId(cycleId);
        if (!existing) {
          weeklyDraw = await storage.createDraw({
            name: 'Weekly Token Jackpot',
            description: 'Win up to 5,000 tokens every week! All members can enter.',
            cadence: 'weekly',
            cycleId,
            status: 'open',
            startAt: new Date(),
            endAt: nextFriday,
            drawAt: nextFriday,
            prizePool: [
              { name: '5,000 Tokens', type: 'tokens', value: 5000, quantity: 1 },
              { name: '2,000 Tokens', type: 'tokens', value: 2000, quantity: 3 },
              { name: '500 Tokens', type: 'tokens', value: 500, quantity: 10 }
            ],
            entryRules: { minAccountAgeDays: 1 },
            maxEntriesPerUser: 1,
            premiumEntriesPerUser: 2,
            isVisible: true,
            isFeatured: true
          });
        } else if (existing.status === 'open' || existing.status === 'scheduled') {
          weeklyDraw = existing;
        }
      }

      // Auto-create monthly draw if none exists
      if (!monthlyDraw) {
        const lastFriday = getLastFridayOfMonthToronto();
        const cycleId = `monthly-${lastFriday.toISOString().slice(0, 7)}`;
        const existing = await storage.getDrawByCycleId(cycleId);
        if (!existing) {
          monthlyDraw = await storage.createDraw({
            name: 'Monthly Card Giveaway',
            description: 'Win legendary and mythic cards! S-Class gets 1 free entry. Free users: 100 tokens.',
            cadence: 'monthly',
            cycleId,
            status: 'open',
            startAt: new Date(),
            endAt: lastFriday,
            drawAt: lastFriday,
            prizePool: [
              { name: 'Mythic Card Pack', type: 'card', rarity: 'mythic', quantity: 1 },
              { name: 'Legendary Card Pack', type: 'card', rarity: 'legendary', quantity: 3 },
              { name: '30 Days S-Class', type: 'premium', value: 30, quantity: 2 }
            ],
            entryRules: { minAccountAgeDays: 7 },
            maxEntriesPerUser: 1,
            premiumEntriesPerUser: 1,
            isVisible: true,
            isFeatured: false
          });
        } else if (existing.status === 'open' || existing.status === 'scheduled') {
          monthlyDraw = existing;
        }
      }

      // Use dbUser from optionalSupabaseAuth middleware (Supabase token) or fallback to session
      let user = req.dbUser ?? null;
      const userId = user?.id || req.session?.userId || null;
      
      // Fallback: if no dbUser but session exists, fetch user
      if (!user && req.session?.userId) {
        user = (await storage.getUser(req.session.userId)) ?? null;
      }
      
      let weeklyEntry = null;
      let monthlyEntry = null;
      let weeklyEntryCount = 0;
      let monthlyEntryCount = 0;

      if (weeklyDraw) {
        weeklyEntryCount = await storage.getEntryCount(weeklyDraw.id);
        if (userId) {
          weeklyEntry = await storage.getUserEntryForDraw(userId, weeklyDraw.id);
        }
      }
      if (monthlyDraw) {
        monthlyEntryCount = await storage.getEntryCount(monthlyDraw.id);
        if (userId) {
          monthlyEntry = await storage.getUserEntryForDraw(userId, monthlyDraw.id);
        }
      }

      // Calculate monthly entry cost and eligibility for the current user
      let monthlyEntryCost = MONTHLY_TOKEN_COST; // Default for non-logged in or free users
      let monthlyEntryReason = 'Free users: 100 tokens to enter monthly';
      let isSClass = false;
      let freeEntriesTotal = 0;
      let freeEntriesUsed = 0;
      let freeEntriesRemaining = 0;
      
      if (user) {
        // Check if user has S-Class access (isPremium OR valid admin-granted access)
        const hasAdminGrant = user.accessSource === 'admin_grant' && 
          user.accessExpiresAt && new Date(user.accessExpiresAt) > new Date();
        isSClass = !!(user.isPremium || hasAdminGrant);
        
        // Debug log for S-Class detection
        console.log("[draws.next]", { 
          userId: user.id, 
          handle: user.username, 
          isSClass,
          source: user.isPremium ? 'isPremium' : hasAdminGrant ? 'admin_grant' : 'none',
          isPremium: user.isPremium,
          accessSource: user.accessSource,
          accessExpiresAt: user.accessExpiresAt
        });
        
        // S-Class gets 1 free entry per monthly cycle
        freeEntriesTotal = isSClass ? 1 : 0;
        // Check if user already used their free entry (any entry counts as using free first)
        freeEntriesUsed = monthlyEntry ? Math.min(1, freeEntriesTotal) : 0;
        freeEntriesRemaining = freeEntriesTotal - freeEntriesUsed;
        
        if (isSClass && freeEntriesRemaining > 0) {
          // S-Class user hasn't entered yet - free entry available
          monthlyEntryCost = 0;
          monthlyEntryReason = 'S-Class: 1 free monthly entry available';
        } else if (monthlyEntry) {
          // Already entered, additional entries cost tokens
          monthlyEntryCost = MONTHLY_TOKEN_COST;
          monthlyEntryReason = 'Already entered • Extra entries: 100 tokens';
        } else if (!isSClass) {
          // Free user without entry
          monthlyEntryReason = 'Free users: 100 tokens to enter monthly';
        }
      }

      res.json({
        weekly: weeklyDraw ? {
          ...weeklyDraw,
          userEntry: weeklyEntry,
          entryCount: weeklyEntryCount,
        } : null,
        monthly: monthlyDraw ? {
          ...monthlyDraw,
          userEntry: monthlyEntry,
          entryCount: monthlyEntryCount,
          entryCost: monthlyEntryCost,
          entryReason: monthlyEntryReason,
          isSClass,
          freeEntriesTotal,
          freeEntriesUsed,
          freeEntriesRemaining,
          paidEntryCostTokens: MONTHLY_TOKEN_COST,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/:id", async (req, res) => {
    try {
      const draw = await storage.getDraw(req.params.id);
      if (!draw) {
        return res.status(404).json({ error: "Draw not found" });
      }
      res.json(draw);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/:id/entries", async (req, res) => {
    try {
      const entries = await storage.getDrawEntries(req.params.id);
      const count = await storage.getEntryCount(req.params.id);
      res.json({ entries, count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/:id/winners", async (req, res) => {
    try {
      const winners = await storage.getDrawWinners(req.params.id);
      res.json(winners);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/:id/status", async (req, res) => {
    try {
      const draw = await storage.getDraw(req.params.id);
      if (!draw) {
        return res.status(404).json({ error: "Draw not found" });
      }

      const userId = req.session?.userId || null;
      let userEntry = null;
      let user = null;
      let eligibility = { eligible: false, reason: "Login required" };

      if (userId) {
        user = await storage.getUser(userId);
        userEntry = await storage.getUserEntryForDraw(userId, req.params.id);
        
        if (user) {
          const entryRules = draw.entryRules as any || {};
          const now = new Date();
          const lockTime = getDrawLockTime(new Date(draw.drawAt));
          
          if (draw.status === 'executed' || draw.status === 'completed') {
            eligibility = { eligible: false, reason: "Draw has ended" };
          } else if (now >= lockTime) {
            eligibility = { eligible: false, reason: "Entries locked" };
          } else if (userEntry) {
            const maxEntries = user.isPremium 
              ? (draw.premiumEntriesPerUser || 3) 
              : (draw.maxEntriesPerUser || 1);
            if (userEntry.tickets >= maxEntries) {
              eligibility = { eligible: false, reason: "Maximum entries reached" };
            } else {
              eligibility = { eligible: true, reason: "Can add more entries" };
            }
          } else if (entryRules.premiumOnly && !user.isPremium) {
            eligibility = { eligible: false, reason: "S-Class members only" };
          } else if (entryRules.minLevel && user.level < entryRules.minLevel) {
            eligibility = { eligible: false, reason: `Level ${entryRules.minLevel} required` };
          } else {
            eligibility = { eligible: true, reason: "Ready to enter" };
          }
        }
      }

      const entryCount = await storage.getEntryCount(req.params.id);
      
      res.json({
        draw,
        userEntry,
        entryCount,
        eligibility,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/:id/recap", async (req, res) => {
    try {
      const draw = await storage.getDraw(req.params.id);
      if (!draw) {
        return res.status(404).json({ error: "Draw not found" });
      }

      const winners = await storage.getDrawWinners(req.params.id);
      const entryCount = await storage.getEntryCount(req.params.id);
      
      const userId = req.session?.userId || null;
      let userEntry = null;
      let userWon = null;

      if (userId) {
        userEntry = await storage.getUserEntryForDraw(userId, req.params.id);
        userWon = winners.find(w => w.userId === userId) || null;
      }

      res.json({
        draw,
        winners: winners.map(w => ({
          id: w.id,
          username: w.user.username,
          avatarUrl: w.user.avatar,
          prizeName: w.prize.name,
          prizeRarity: w.prize.rarity,
          winnerTier: w.winnerTier,
        })),
        entryCount,
        userEntry,
        userWon: userWon ? {
          prizeName: userWon.prize.name,
          prizeRarity: userWon.prize.rarity,
          winnerTier: userWon.winnerTier,
          claimStatus: userWon.claimStatus,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/draws/winners/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const winners = await storage.getRecentWinners(limit);
      res.json(winners);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Draw entry - user action
  app.post("/api/draws/:id/enter", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const draw = await storage.getDraw(req.params.id);
      if (!draw) {
        return res.status(404).json({ error: "Draw not found" });
      }
      
      // Check if draw is executed
      if (draw.status === 'executed' || draw.status === 'completed') {
        return res.status(400).json({ error: "Draw has already been executed" });
      }
      
      // Check if entries are locked (1 minute before draw time)
      const now = new Date();
      const lockTime = getDrawLockTime(new Date(draw.drawAt));
      if (now >= lockTime) {
        return res.status(400).json({ error: "Entries are locked. Results in minutes." });
      }
      
      // Check 24h cooldown from previous draw execution
      if (draw.drawAt) {
        const previousDraw = await storage.getPreviousExecutedDraw(draw.cadence, new Date(draw.drawAt));
        if (previousDraw) {
          // Fall back to drawAt if executedAt is null (draw was marked executed without timestamp)
          const executionTime = previousDraw.executedAt 
            ? new Date(previousDraw.executedAt) 
            : new Date(previousDraw.drawAt);
          const cooldownEnd = getCooldownEndTime(executionTime);
          if (now < cooldownEnd) {
            const remainingMs = cooldownEnd.getTime() - now.getTime();
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            return res.status(400).json({ 
              error: `Re-entry opens in ${hours}h ${minutes}m. Cooldown active after last draw.`,
              cooldownEndTime: cooldownEnd.toISOString()
            });
          }
        }
      }
      
      if (draw.status !== 'open' && draw.status !== 'scheduled') {
        return res.status(400).json({ error: "Draw is not open for entries" });
      }
      
      const user = req.dbUser;
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check entry rules
      const entryRules = draw.entryRules as any || {};
      const MONTHLY_TOKEN_COST = 100; // Default cost for monthly draw entry
      
      // Level requirement
      if (entryRules.minLevel && user.level < entryRules.minLevel) {
        return res.status(400).json({ error: `Minimum level ${entryRules.minLevel} required` });
      }
      
      // Premium-only check (for other premium-only draws, NOT monthly)
      if (entryRules.premiumOnly && !user.isPremium && draw.cadence !== 'monthly') {
        return res.status(400).json({ error: "S-Class members only for free entry" });
      }
      
      // Account age check (≥24 hours)
      if (entryRules.minAccountAgeDays) {
        const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
        const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
        if (accountAgeDays < entryRules.minAccountAgeDays) {
          return res.status(400).json({ 
            error: `Account must be at least ${entryRules.minAccountAgeDays} day(s) old to enter` 
          });
        }
      }
      
      // Email verification check (ready for when email verification is implemented)
      // Currently no isEmailVerified field on users - add check here when implemented
      if (entryRules.requireEmailVerified) {
        const userWithEmail = user as any;
        if (userWithEmail.isEmailVerified === false) {
          return res.status(400).json({ 
            error: "Email verification required to enter this draw" 
          });
        }
      }
      
      // One win per period check
      const winsInPeriod = await storage.getUserWinsInPeriod(user.id, draw.cadence);
      if (winsInPeriod > 0) {
        return res.status(400).json({ 
          error: `You already won a ${draw.cadence} draw this period. Try again next ${draw.cadence === 'weekly' ? 'week' : 'month'}!` 
        });
      }
      
      // Determine max entries per user based on draw settings and user type
      const maxEntriesAllowed = user.isPremium 
        ? (draw.premiumEntriesPerUser || 3) 
        : (draw.maxEntriesPerUser || 1);
      
      // Check existing entries for this user in this draw
      const existingEntry = await storage.getUserEntryForDraw(user.id, req.params.id);
      const currentTickets = existingEntry?.tickets || 0;
      
      if (currentTickets >= maxEntriesAllowed) {
        return res.status(400).json({ 
          error: `You've reached your maximum of ${maxEntriesAllowed} entries for this draw` 
        });
      }
      
      // Calculate tickets to add (1 per manual entry, up to max)
      const ticketsToAdd = 1;
      const newTotalTickets = currentTickets + ticketsToAdd;
      
      // Monthly draw token payment logic
      let entrySource = 'manual';
      let tokensCost = 0;
      
      if (draw.cadence === 'monthly') {
        // Check if user has S-Class access (isPremium OR valid admin-granted access)
        const hasAdminGrant = user.accessSource === 'admin_grant' && 
          user.accessExpiresAt && new Date(user.accessExpiresAt) > new Date();
        const isSClass = user.isPremium || hasAdminGrant;
        
        if (isSClass && !existingEntry) {
          // S-Class user's first entry is free
          entrySource = 'premium_free';
          tokensCost = 0;
        } else {
          // Free users always pay, S-Class pays for additional entries
          tokensCost = MONTHLY_TOKEN_COST;
          entrySource = 'token_purchase';
          
          // Check if user has enough tokens
          if (user.tokens < tokensCost) {
            return res.status(400).json({ 
              error: `Not enough tokens. You need ${tokensCost} tokens to enter. You have ${user.tokens}.`,
              tokensNeeded: tokensCost,
              tokensHave: user.tokens
            });
          }
          
          // Deduct tokens from user
          await storage.updateUser(user.id, { tokens: user.tokens - tokensCost });
        }
      }
      
      let entry;
      if (existingEntry) {
        // Update existing entry with more tickets
        // If adding a paid entry to an existing entry, update entrySource to reflect it's now a paid entry
        const updateData: { tickets: number; entrySource?: string } = { tickets: newTotalTickets };
        if (tokensCost > 0) {
          updateData.entrySource = 'token_purchase';
        }
        entry = await storage.updateDrawEntry(existingEntry.id, updateData);
      } else {
        // Create new entry
        entry = await storage.createDrawEntry({
          drawId: req.params.id,
          userId: user.id,
          tickets: ticketsToAdd,
          entrySource,
        });
      }
      
      const responseMessage = tokensCost > 0 
        ? `Entry added! ${tokensCost} tokens spent. You now have ${newTotalTickets} of ${maxEntriesAllowed} entries.`
        : `Entry added! You now have ${newTotalTickets} of ${maxEntriesAllowed} entries.`;
      
      res.json({ 
        ...entry, 
        message: responseMessage,
        currentEntries: newTotalTickets,
        maxEntries: maxEntriesAllowed,
        tokensCost
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User's draw entries
  app.get("/api/users/me/draw-entries", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const entries = await storage.getUserDrawEntries(req.dbUser.id);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim prize
  app.post("/api/draws/winners/:winnerId/claim", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const claimed = await storage.claimPrize(req.params.winnerId, req.session.userId);
      if (!claimed) {
        return res.status(400).json({ error: "Unable to claim prize" });
      }
      
      res.json(claimed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin draw management
  app.post("/api/admin/draws", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const validatedData = insertDrawSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });
      
      const draw = await storage.createDraw(validatedData);
      res.json(draw);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/admin/draws/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const draw = await storage.updateDraw(req.params.id, req.body);
      res.json(draw);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/draws/:id/override", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { reason, ...updates } = req.body;
      const draw = await storage.overrideDraw(req.params.id, req.session.userId, reason, updates);
      res.json(draw);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/draws/:id/select-winner", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { prizeId } = req.body;
      const winner = await storage.selectRandomWinner(req.params.id, prizeId);
      
      if (!winner) {
        return res.status(400).json({ error: "No entries to select from" });
      }
      
      // Update draw status to completed
      await storage.updateDraw(req.params.id, { status: 'completed' });
      
      res.json(winner);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/draws/:id/open", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const draw = await storage.updateDraw(req.params.id, { status: 'open' });
      res.json(draw);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/draws/:id/cancel", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { reason } = req.body;
      const draw = await storage.overrideDraw(req.params.id, req.session.userId, reason || 'Cancelled by admin', { status: 'cancelled' });
      res.json(draw);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Parent-Child Link Routes
  
  // Create a parent-child link (called when minor registers with parent email)
  app.post("/api/parent/link", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { childId, parentEmail } = req.body;
      
      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const link = await storage.createParentChildLink({
        parentId: req.session.userId, // Will be updated when parent verifies
        childId,
        verificationCode,
      });
      
      // In production, send email to parent with verification code/link
      // For now, just return the code
      res.json({ 
        linkId: link.id, 
        verificationCode,
        message: "Verification code generated. Parent should use this to verify." 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Verify parent-child link (parent clicks verification link or enters code)
  app.post("/api/parent/verify", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { verificationCode } = req.body;
      
      const link = await storage.getLinkByVerificationCode(verificationCode);
      if (!link) {
        return res.status(404).json({ error: "Invalid verification code" });
      }
      
      if (link.status !== 'pending') {
        return res.status(400).json({ error: "Link already verified or revoked" });
      }
      
      // Update the link with actual parent ID and verify
      const updatedLink = await storage.verifyParentChildLink(link.id);
      
      // Create default parental controls
      await storage.createParentalControls({
        parentId: req.session.userId,
        childId: link.childId,
      });
      
      // Update child's parentalConsentGiven flag
      await storage.updateUser(link.childId, { parentalConsentGiven: true });
      
      res.json({ 
        success: true, 
        link: updatedLink,
        message: "Parent-child link verified successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get linked children for current parent
  app.get("/api/parent/children", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const parentId = req.session.userId;
      
      // Cleanup expired purchase requests in the background
      storage.expireOldPurchaseRequests().catch(err => 
        console.error('[Cleanup] Failed to expire old requests:', err)
      );
      
      const children = await storage.getLinkedChildren(parentId);
      
      // Get parental controls for each child
      const childrenWithControls = await Promise.all(
        children.map(async (link) => {
          const controls = await storage.getParentalControls(parentId, link.childId);
          return {
            ...link,
            controls,
          };
        })
      );
      
      res.json(childrenWithControls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get parental controls for a specific child
  app.get("/api/parent/controls/:childId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const controls = await storage.getParentalControls(req.session.userId, req.params.childId);
      if (!controls) {
        return res.status(404).json({ error: "Controls not found" });
      }
      
      res.json(controls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update parental controls for a child
  app.put("/api/parent/controls/:childId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Verify parent has link to this child
      const link = await storage.getParentChildLink(req.session.userId, req.params.childId);
      if (!link || link.status !== 'active') {
        return res.status(403).json({ error: "Not authorized to manage this child's controls" });
      }
      
      const {
        purchasesEnabled,
        dailySpendLimit,
        monthlySpendLimit,
        drawsEnabled,
        paidDrawsEnabled,
        gachaEnabled,
        marketplaceEnabled,
        chatEnabled,
        friendRequestsEnabled,
        notifyOnPurchase,
        notifyOnDraw,
      } = req.body;
      
      const controls = await storage.updateParentalControls(req.session.userId, req.params.childId, {
        purchasesEnabled,
        dailySpendLimit,
        monthlySpendLimit,
        drawsEnabled,
        paidDrawsEnabled,
        gachaEnabled,
        marketplaceEnabled,
        chatEnabled,
        friendRequestsEnabled,
        notifyOnPurchase,
        notifyOnDraw,
      });
      
      res.json(controls);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Revoke parent-child link
  app.delete("/api/parent/link/:linkId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.revokeParentChildLink(req.params.linkId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get parent info for a child (for minor's account view)
  app.get("/api/parent/my-parent", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const link = await storage.getParentLink(req.session.userId);
      if (!link) {
        return res.json({ hasParent: false });
      }
      
      const parent = await storage.getUser(link.parentId);
      const controls = await storage.getControlsForChild(req.session.userId);
      
      res.json({
        hasParent: true,
        parentName: parent?.name || 'Parent',
        controls,
        linkStatus: link.status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase Request Routes
  
  // Create purchase request (minor requests parent approval for token purchase)
  app.post("/api/parent/purchase-request", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { packId, baseTokens, bonusTokens, totalTokens, unitAmountCents, currency, childMessage } = req.body;
      
      // Get parent link for this child
      const parentLink = await storage.getParentLink(req.session.userId);
      if (!parentLink || parentLink.status !== 'active') {
        return res.status(400).json({ code: "NO_PARENT_LINK", error: "No active parent link found" });
      }
      
      // Get child and parent info for notifications
      const child = await storage.getUser(req.session.userId);
      const parent = await storage.getUser(parentLink.parentId);
      
      if (!child || !parent) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // CRITICAL #3: Enforce parental controls and spend limits
      const controls = await storage.getControlsForChild(req.session.userId);
      
      if (controls) {
        // Check if purchases are enabled
        if (!controls.purchasesEnabled) {
          await storage.logSecurityEvent({
            eventType: 'REQUEST_BLOCKED',
            reason: 'PURCHASES_DISABLED',
            parentId: parentLink.parentId,
            childId: req.session.userId,
            priceCents: unitAmountCents,
            tokenAmount: totalTokens,
            metadata: { route: '/api/parent/purchase-request' },
          });
          return res.status(403).json({ 
            code: "PURCHASES_DISABLED", 
            error: "Purchases are disabled by your parent. Ask your parent to enable purchases." 
          });
        }
        
        // Check daily spend limit
        const dailySpent = await storage.getChildDailySpend(req.session.userId);
        if (controls.dailySpendLimit && (dailySpent + unitAmountCents) > controls.dailySpendLimit) {
          const remainingCents = Math.max(0, controls.dailySpendLimit - dailySpent);
          await storage.logSecurityEvent({
            eventType: 'REQUEST_BLOCKED',
            reason: 'DAILY_LIMIT',
            parentId: parentLink.parentId,
            childId: req.session.userId,
            priceCents: unitAmountCents,
            tokenAmount: totalTokens,
            metadata: { route: '/api/parent/purchase-request', dailySpent, limit: controls.dailySpendLimit },
          });
          return res.status(403).json({ 
            code: "DAILY_LIMIT", 
            error: `Daily spending limit would be exceeded. You have $${(remainingCents / 100).toFixed(2)} remaining today.` 
          });
        }
        
        // Check monthly spend limit
        const monthlySpent = await storage.getChildMonthlySpend(req.session.userId);
        if (controls.monthlySpendLimit && (monthlySpent + unitAmountCents) > controls.monthlySpendLimit) {
          const remainingCents = Math.max(0, controls.monthlySpendLimit - monthlySpent);
          await storage.logSecurityEvent({
            eventType: 'REQUEST_BLOCKED',
            reason: 'MONTHLY_LIMIT',
            parentId: parentLink.parentId,
            childId: req.session.userId,
            priceCents: unitAmountCents,
            tokenAmount: totalTokens,
            metadata: { route: '/api/parent/purchase-request', monthlySpent, limit: controls.monthlySpendLimit },
          });
          return res.status(403).json({ 
            code: "MONTHLY_LIMIT", 
            error: `Monthly spending limit would be exceeded. You have $${(remainingCents / 100).toFixed(2)} remaining this month.` 
          });
        }
      }
      
      const request = await storage.createPurchaseRequest({
        childUserId: req.session.userId,
        parentUserId: parentLink.parentId,
        packId,
        baseTokens,
        bonusTokens: bonusTokens || 0,
        totalTokens,
        unitAmountCents,
        currency: currency || 'USD',
        childMessage: childMessage || null,
      });
      
      // Log successful request creation for metrics
      await storage.logSecurityEvent({
        eventType: 'REQUEST_CREATED',
        reason: 'SUCCESS',
        parentId: parentLink.parentId,
        childId: req.session.userId,
        purchaseRequestId: request.id,
        priceCents: unitAmountCents,
        tokenAmount: totalTokens,
        metadata: { route: '/api/parent/purchase-request' },
      });
      
      // Create in-app notification for parent
      const { formatPrice, getEmailTemplate, sendEmail } = await import('./lib/emailService');
      const priceFormatted = formatPrice(unitAmountCents, currency || 'USD');
      
      await storage.createParentNotification({
        userId: parentLink.parentId,
        type: 'PURCHASE_REQUEST',
        title: 'Purchase request pending',
        body: `${child.name || child.handle} requested ${totalTokens.toLocaleString()} tokens for ${priceFormatted}. Review in Parent Dashboard.`,
        metadata: {
          purchaseRequestId: request.id,
          childId: child.id,
          childName: child.name || child.handle,
          tokenAmount: totalTokens,
          priceCents: unitAmountCents,
          currency: currency || 'USD',
          childMessage: childMessage || null,
        },
      });
      
      // Send email to parent (don't block on failure)
      const emailTemplate = getEmailTemplate('purchase_request', {
        parentName: parent.name || 'Parent',
        childName: child.name || child.handle || 'Your child',
        tokenAmount: totalTokens,
        price: priceFormatted,
        expiresAt: request.expiresAt,
      });
      
      sendEmail({
        to: parent.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      }).catch(err => console.error('[Email] Failed to send purchase request email:', err));
      
      res.json({
        success: true,
        request,
        message: "Purchase request sent to parent"
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get pending purchase requests for parent
  app.get("/api/parent/purchase-requests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const requests = await storage.getPendingPurchaseRequests(req.session.userId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get child's pending requests
  app.get("/api/parent/my-pending-requests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const requests = await storage.getChildPendingPurchaseRequests(req.session.userId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Respond to purchase request (parent approves or denies)
  app.post("/api/parent/purchase-request/:requestId/respond", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status } = req.body;
      
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'denied'" });
      }
      
      // Get the request and verify parent owns it
      const purchaseRequest = await storage.getPurchaseRequestById(req.params.requestId);
      if (!purchaseRequest) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      if (purchaseRequest.parentUserId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to respond to this request" });
      }
      
      // CRITICAL #2: Check if request is already processed or inactive
      const inactiveStatuses = ['EXPIRED', 'FULFILLED', 'REJECTED', 'PAID', 'EXPIRED_AFTER_PAYMENT'];
      if (inactiveStatuses.includes(purchaseRequest.status)) {
        return res.status(400).json({ 
          code: "REQUEST_INACTIVE", 
          error: "This request is no longer active." 
        });
      }
      
      // Only allow response if pending_parent
      if (purchaseRequest.status !== 'PENDING_PARENT') {
        return res.status(400).json({ error: "Request is not awaiting parent response" });
      }
      
      // CRITICAL #2: Check expiry and mark as expired if past due
      if (purchaseRequest.expiresAt && new Date() > new Date(purchaseRequest.expiresAt)) {
        await storage.expirePurchaseRequest(req.params.requestId);
        await storage.logSecurityEvent({
          eventType: 'APPROVAL_BLOCKED',
          reason: 'REQUEST_EXPIRED',
          parentId: req.session.userId,
          childId: purchaseRequest.childUserId,
          purchaseRequestId: purchaseRequest.id,
          priceCents: purchaseRequest.unitAmountCents,
          tokenAmount: purchaseRequest.totalTokens,
          metadata: { route: '/api/parent/purchase-request/:requestId/respond' },
        });
        return res.status(400).json({ 
          code: "REQUEST_EXPIRED", 
          error: "This request has expired. Ask your child to request again." 
        });
      }
      
      // Get user info for notifications
      const parent = await storage.getUser(req.session.userId);
      const child = await storage.getUser(purchaseRequest.childUserId);
      
      if (!parent || !child) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { formatPrice, getEmailTemplate, sendEmail } = await import('./lib/emailService');
      const priceFormatted = formatPrice(purchaseRequest.unitAmountCents, purchaseRequest.currency);
      
      // If denied, set status to rejected
      if (status === 'denied') {
        const updatedRequest = await storage.rejectPurchaseRequest(req.params.requestId);
        
        // Create notification for parent (confirmation)
        await storage.createParentNotification({
          userId: parent.id,
          type: 'PURCHASE_DECLINED',
          title: 'Purchase request declined',
          body: `You declined ${child.name || child.handle}'s request for ${purchaseRequest.totalTokens.toLocaleString()} tokens.`,
          metadata: {
            purchaseRequestId: purchaseRequest.id,
            childId: child.id,
            childName: child.name || child.handle,
            tokenAmount: purchaseRequest.totalTokens,
            priceCents: purchaseRequest.unitAmountCents,
            currency: purchaseRequest.currency,
          },
        });
        
        // Send email confirmation
        const emailTemplate = getEmailTemplate('purchase_declined', {
          parentName: parent.name || 'Parent',
          childName: child.name || child.handle || 'Your child',
          tokenAmount: purchaseRequest.totalTokens,
          price: priceFormatted,
        });
        
        sendEmail({
          to: parent.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        }).catch(err => console.error('[Email] Failed to send decline email:', err));
        
        return res.json({
          success: true,
          request: updatedRequest,
          message: "Purchase request denied"
        });
      }
      
      // CRITICAL #3: Belt-and-suspenders - Re-check spend limits at approval time
      const controls = await storage.getControlsForChild(purchaseRequest.childUserId);
      if (controls) {
        const dailySpent = await storage.getChildDailySpend(purchaseRequest.childUserId);
        if (controls.dailySpendLimit && (dailySpent + purchaseRequest.unitAmountCents) > controls.dailySpendLimit) {
          await storage.logSecurityEvent({
            eventType: 'APPROVAL_BLOCKED',
            reason: 'DAILY_LIMIT',
            parentId: req.session.userId,
            childId: purchaseRequest.childUserId,
            purchaseRequestId: purchaseRequest.id,
            priceCents: purchaseRequest.unitAmountCents,
            tokenAmount: purchaseRequest.totalTokens,
            metadata: { route: '/api/parent/purchase-request/:requestId/respond', dailySpent, limit: controls.dailySpendLimit },
          });
          return res.status(403).json({ 
            code: "DAILY_LIMIT", 
            error: "Approval blocked: Daily spending limit would be exceeded." 
          });
        }
        
        const monthlySpent = await storage.getChildMonthlySpend(purchaseRequest.childUserId);
        if (controls.monthlySpendLimit && (monthlySpent + purchaseRequest.unitAmountCents) > controls.monthlySpendLimit) {
          await storage.logSecurityEvent({
            eventType: 'APPROVAL_BLOCKED',
            reason: 'MONTHLY_LIMIT',
            parentId: req.session.userId,
            childId: purchaseRequest.childUserId,
            purchaseRequestId: purchaseRequest.id,
            priceCents: purchaseRequest.unitAmountCents,
            tokenAmount: purchaseRequest.totalTokens,
            metadata: { route: '/api/parent/purchase-request/:requestId/respond', monthlySpent, limit: controls.monthlySpendLimit },
          });
          return res.status(403).json({ 
            code: "MONTHLY_LIMIT", 
            error: "Approval blocked: Monthly spending limit would be exceeded." 
          });
        }
      }
      
      // If approved, create a Stripe checkout session for the parent to pay
      const { stripe } = await import("./stripeClient");
      
      // Ensure parent has a Stripe customer ID
      let customerId = parent.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: parent.email,
          metadata: { 
            userId: parent.id,
            username: parent.username || '',
          },
        });
        customerId = customer.id;
        await storage.updateUser(parent.id, { stripeCustomerId: customerId });
      }
      
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      // Create one-time payment checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: purchaseRequest.currency.toLowerCase(),
            product_data: {
              name: `${purchaseRequest.totalTokens.toLocaleString()} Tokens for ${child.name || child.handle}`,
              description: `Token purchase for ${child.handle}'s account`,
            },
            unit_amount: purchaseRequest.unitAmountCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url: `${baseUrl}/account?checkout=cancel`,

        metadata: {
          purchaseRequestId: purchaseRequest.id,
          parentId: parent.id,
          childId: child.id,
          totalTokens: purchaseRequest.totalTokens.toString(),
          type: 'minor_token_purchase',
        },
      });
      
      // Update the purchase request with stripe session info (status becomes CHECKOUT_CREATED)
      await storage.approvePurchaseRequest(purchaseRequest.id, session.id);
      
      // Log successful approval start for metrics
      await storage.logSecurityEvent({
        eventType: 'APPROVAL_STARTED',
        reason: 'SUCCESS',
        parentId: parent.id,
        childId: child.id,
        purchaseRequestId: purchaseRequest.id,
        priceCents: purchaseRequest.unitAmountCents,
        tokenAmount: purchaseRequest.totalTokens,
        metadata: { route: '/api/parent/purchase-request/:requestId/respond' },
      });
      
      res.json({
        success: true,
        checkoutUrl: session.url,
        message: "Redirecting to payment"
      });
    } catch (error: any) {
      console.error("Parent approval error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // Cancel checkout and return to PENDING_PARENT state
  app.post("/api/parent/purchase-request/:requestId/cancel-checkout", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const purchaseRequest = await storage.getPurchaseRequestById(req.params.requestId);
      if (!purchaseRequest) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      if (purchaseRequest.parentUserId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (purchaseRequest.status !== 'CHECKOUT_CREATED') {
        return res.status(400).json({ error: "Cannot cancel: checkout not in progress" });
      }
      
      // Reset to PENDING_PARENT so parent can approve again
      const updatedRequest = await storage.cancelPurchaseCheckout(purchaseRequest.id);
      
      res.json({
        success: true,
        request: updatedRequest,
        message: "Checkout canceled. You can approve this request again when ready."
      });
    } catch (error: any) {
      console.error("Cancel checkout error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============== PARENT NOTIFICATION ENDPOINTS ==============
  
  // Get parent notifications
  app.get("/api/parent/notifications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await storage.getParentNotifications(req.session.userId, {
        unreadOnly,
        limit
      });
      
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Mark notifications as read
  app.post("/api/parent/notifications/mark-read", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { notificationIds, markAll } = req.body;
      
      if (markAll) {
        await storage.markAllNotificationsRead(req.session.userId);
      } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        await storage.markNotificationsRead(notificationIds);
      } else {
        return res.status(400).json({ error: "Provide notificationIds array or markAll: true" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get unread notification count and pending purchase requests
  app.get("/api/parent/notifications/unread-count", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const unreadCount = await storage.getUnreadNotificationCount(req.session.userId);
      const pendingPurchaseRequests = await storage.getPendingPurchaseRequestCount(req.session.userId);
      
      res.json({ unreadCount, pendingPurchaseRequests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AniList proxy endpoints
  const ANILIST_API = 'https://graphql.anilist.co';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  app.get("/api/anime/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }

      const graphqlQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 20) {
            media(search: $search, type: ANIME) {
              id
              title { romaji english }
              coverImage { large }
              episodes
              format
              seasonYear
              genres
              status
            }
          }
        }
      `;

      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery, variables: { search: query } }),
      });

      if (!response.ok) {
        throw new Error(`AniList API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.data?.Page?.media || [];
      
      // Cache the results
      for (const anime of results) {
        await storage.setCachedAnime(anime.id, anime);
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to search anime" });
    }
  });

  app.get("/api/anime/:id", async (req, res) => {
    try {
      const anilistId = parseInt(req.params.id);
      if (isNaN(anilistId)) {
        return res.status(400).json({ error: "Invalid anime ID" });
      }

      // Check cache first
      const cached = await storage.getCachedAnime(anilistId);
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        if (cacheAge < CACHE_TTL_MS) {
          return res.json(cached.payload);
        }
      }

      const graphqlQuery = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            coverImage { large extraLarge }
            bannerImage
            description
            episodes
            format
            status
            seasonYear
            season
            genres
            averageScore
            studios { nodes { name } }
          }
        }
      `;

      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery, variables: { id: anilistId } }),
      });

      if (!response.ok) {
        throw new Error(`AniList API error: ${response.status}`);
      }

      const data = await response.json();
      const anime = data.data?.Media;
      
      if (!anime) {
        return res.status(404).json({ error: "Anime not found" });
      }

      // Cache the result
      await storage.setCachedAnime(anilistId, anime);
      res.json(anime);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch anime" });
    }
  });

  // Watchlist CRUD endpoints
  app.get("/api/watchlist", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const items = await storage.getUserWatchlist(req.dbUser.id);
      
      // Get cached anime data for all items
      const anilistIds = items.map(i => i.anilistId);
      const cachedAnime = await storage.getCachedAnimeMultiple(anilistIds);
      const animeMap = new Map(cachedAnime.map(a => [a.anilistId, a.payload]));

      // Combine watchlist items with anime data
      const result = items.map(item => ({
        ...item,
        anime: animeMap.get(item.anilistId) || null,
      }));

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/watchlist", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { anilistId, status = 'PLANNING' } = req.body;
      if (!anilistId || typeof anilistId !== 'number') {
        return res.status(400).json({ error: "anilistId is required and must be a number" });
      }

      // Check if already in watchlist
      const existing = await storage.getWatchlistItemByAnime(req.dbUser.id, anilistId);
      if (existing) {
        return res.status(400).json({ error: "Anime already in watchlist" });
      }

      const validStatuses = ['WATCHING', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const item = await storage.createWatchlistItem({
        userId: req.dbUser.id,
        anilistId,
        status,
      });

      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/watchlist/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const item = await storage.getWatchlistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Watchlist item not found" });
      }

      if (item.userId !== req.dbUser.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { status, progress, score, notes } = req.body;
      const updates: any = {};

      if (status !== undefined) {
        const validStatuses = ['WATCHING', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }
        updates.status = status;
      }

      if (progress !== undefined) {
        if (typeof progress !== 'number' || progress < 0) {
          return res.status(400).json({ error: "Progress must be a non-negative number" });
        }
        updates.progress = progress;
      }

      if (score !== undefined) {
        if (score !== null && (typeof score !== 'number' || score < 0 || score > 10)) {
          return res.status(400).json({ error: "Score must be between 0 and 10" });
        }
        updates.score = score;
      }

      if (notes !== undefined) {
        updates.notes = notes;
      }

      const updated = await storage.updateWatchlistItem(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/watchlist/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const item = await storage.getWatchlistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Watchlist item not found" });
      }

      if (item.userId !== req.dbUser.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteWatchlistItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Site settings endpoints
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => { settingsMap[s.key] = s.value; });
      res.json(settingsMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const value = await storage.getSiteSetting(req.params.key);
      res.json({ key: req.params.key, value: value || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Verify admin status
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      
      await storage.setSiteSetting(key, String(value), req.session.userId);
      res.json({ success: true, key, value });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Story routes
  app.get("/api/stories", async (req, res) => {
    try {
      const stories = await storage.getActiveStories();
      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stories/user/:userId", async (req, res) => {
    try {
      const stories = await storage.getUserStories(req.params.userId);
      res.json(stories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stories", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.dbUser;
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { mediaUrl, mediaType, caption, fileSize, videoDuration } = req.body;

      // Validate media type
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm'];
      
      if (mediaType === 'image') {
        if (!allowedImageTypes.includes(req.body.mimeType)) {
          return res.status(400).json({ error: "Invalid image format. Allowed: JPG, PNG, WebP" });
        }
        // Max 10 MB for images
        if (fileSize > 10 * 1024 * 1024) {
          return res.status(400).json({ error: "Image too large. Maximum 10 MB" });
        }
      } else if (mediaType === 'video') {
        if (!allowedVideoTypes.includes(req.body.mimeType)) {
          return res.status(400).json({ error: "Invalid video format. Allowed: MP4, WebM" });
        }
        
        // Validate duration and size based on premium status
        if (user.isPremium) {
          // Premium: 30s max, 50MB max
          if (videoDuration > 30) {
            return res.status(400).json({ error: "Video too long. Maximum 30 seconds for Premium" });
          }
          if (fileSize > 50 * 1024 * 1024) {
            return res.status(400).json({ error: "Video too large. Maximum 50 MB for Premium" });
          }
        } else {
          // Free: 15s max, 25MB max
          if (videoDuration > 15) {
            return res.status(400).json({ error: "Video too long. Maximum 15 seconds for Free users" });
          }
          if (fileSize > 25 * 1024 * 1024) {
            return res.status(400).json({ error: "Video too large. Maximum 25 MB for Free users" });
          }
        }
      } else {
        return res.status(400).json({ error: "Invalid media type" });
      }

      // Check daily story limit
      const storyCount = await storage.getUserStoryCountIn24h(req.dbUser.id);
      const maxStories = user.isPremium ? 10 : 3;
      
      if (storyCount >= maxStories) {
        return res.status(400).json({ 
          error: `Daily story limit reached. ${user.isPremium ? 'Premium' : 'Free'} users can post ${maxStories} stories per 24 hours.` 
        });
      }

      // Create story with 24h expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const story = await storage.createStory({
        userId: req.dbUser.id,
        mediaUrl,
        mediaType,
        caption: caption || null,
        expiresAt,
      });

      res.json(story);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stories/:id", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Note: Add ownership check in production
      await storage.deleteStory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stories/limits", verifySupabaseToken, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.dbUser;

      const storyCount = await storage.getUserStoryCountIn24h(req.dbUser.id);
      const maxStories = user.isPremium ? 10 : 3;

      res.json({
        isPremium: user.isPremium,
        storiesPosted: storyCount,
        maxStories,
        remaining: Math.max(0, maxStories - storyCount),
        limits: {
          image: { maxSizeMB: 10, formats: ['JPG', 'PNG', 'WebP'] },
          video: {
            maxDurationSeconds: user.isPremium ? 30 : 15,
            maxSizeMB: user.isPremium ? 50 : 25,
            formats: ['MP4', 'WebM']
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Launch reset - wipe content but keep user accounts
  app.post("/api/admin/launch-reset", async (req, res) => {
    try {
      const { secret } = req.body;
      const ADMIN_RESET_SECRET = process.env.ADMIN_RESET_SECRET;
      
      if (!ADMIN_RESET_SECRET) {
        return res.status(500).json({ error: "ADMIN_RESET_SECRET not configured" });
      }
      
      if (secret !== ADMIN_RESET_SECRET) {
        return res.status(403).json({ error: "Invalid reset secret" });
      }

      const { getMediaAdapter } = await import('./media/adapter');
      const adapter = getMediaAdapter();

      // Get all media to delete from storage
      const allMedia = await storage.getExpiredMedia(); // We'll use a broader query
      for (const m of allMedia) {
        try {
          await adapter.deleteObject(m.objectKey);
        } catch (e) {
          console.error("Failed to delete media from storage:", e);
        }
      }

      // Wipe tables in correct order (respecting foreign keys)
      const { db } = await import('./db');
      
      await db.execute(sql`TRUNCATE TABLE 
        media, stories, post_likes, posts, community_messages, 
        swipe_actions, draw_winners, draw_entries, market_listings, user_cards
        CASCADE`);

      console.log("Launch reset completed - content wiped, accounts preserved");

      res.json({
        success: true,
        message: "Content wiped. User accounts preserved.",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Launch reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Cleanup expired stories and media
  app.post("/api/admin/cleanup-expired-stories", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { getMediaAdapter } = await import('./media/adapter');
      const adapter = getMediaAdapter();

      const expiredMedia = await storage.getExpiredMedia();
      let deletedCount = 0;
      let failedCount = 0;

      for (const mediaRecord of expiredMedia) {
        try {
          await adapter.deleteObject(mediaRecord.objectKey);
          await storage.deleteMedia(mediaRecord.id);
          deletedCount++;
        } catch (error: any) {
          console.error(`Failed to delete expired media ${mediaRecord.id}:`, error);
          failedCount++;
        }
      }

      res.json({
        success: true,
        deleted: deletedCount,
        failed: failedCount,
        total: expiredMedia.length,
      });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Media upload routes
  app.post("/api/media/upload-url", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { contentType, sizeBytes, kind } = req.body;

      if (!contentType || !sizeBytes || !kind) {
        return res.status(400).json({ error: "Missing required fields: contentType, sizeBytes, kind" });
      }

      const validKinds = ['post', 'story', 'avatar', 'card'];
      if (!validKinds.includes(kind)) {
        return res.status(400).json({ error: "Invalid kind. Must be: post, story, avatar, or card" });
      }

      const { getMediaAdapter } = await import('./media/adapter');
      const adapter = getMediaAdapter();

      const result = await adapter.getSignedUploadUrl({
        userId: req.session.userId,
        contentType,
        sizeBytes,
        kind,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Upload URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/media/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { objectKey, kind, mimeType, sizeBytes, metadata } = req.body;

      if (!objectKey || !kind || !mimeType || !sizeBytes) {
        return res.status(400).json({ error: "Missing required fields: objectKey, kind, mimeType, sizeBytes" });
      }

      const { getMediaAdapter } = await import('./media/adapter');
      const adapter = getMediaAdapter();

      const finalizeResult = await adapter.finalizeUpload({
        userId: req.session.userId,
        objectKey,
        kind,
        metadata,
      });

      const expiresAt = kind === 'story' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

      const mediaRecord = await storage.createMedia({
        userId: req.session.userId,
        storageProvider: process.env.MEDIA_PROVIDER || 'supabase',
        bucket: 'media',
        objectKey,
        mimeType,
        sizeBytes,
        kind,
        publicUrl: finalizeResult.publicUrl,
        metadata: metadata || null,
        expiresAt,
      });

      res.json({
        id: mediaRecord.id,
        publicUrl: mediaRecord.publicUrl,
        objectKey: mediaRecord.objectKey,
      });
    } catch (error: any) {
      console.error("Media complete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/media/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const mediaRecord = await storage.getMedia(req.params.id);
      if (!mediaRecord) {
        return res.status(404).json({ error: "Media not found" });
      }

      if (mediaRecord.userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Not authorized to delete this media" });
        }
      }

      const { getMediaAdapter } = await import('./media/adapter');
      const adapter = getMediaAdapter();

      try {
        await adapter.deleteObject(mediaRecord.objectKey);
      } catch (storageError: any) {
        console.error("Storage delete error (continuing with DB delete):", storageError);
      }

      await storage.deleteMedia(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Media delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================
  // FRACTURE TRIAL GAME API
  // ========================
  
  const { DEFAULT_GAME_CONFIG, getGameConfig } = await import('./config/gameConfig');
  
  // Helper to get current date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  // Get game config with site settings overrides
  app.get("/api/game/config", async (req, res) => {
    try {
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      const config = getGameConfig(settingsMap);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================
  // A/B TESTING SYSTEM (Spec-Compliant)
  // ========================
  
  // Standard CTA copy variants (A/B testing - 3 specific tests per spec)
  // Test 1: Headline Framing - "reached limit" vs "completed free runs"
  // Test 2: Benefit Framing - "Upgrade to continue" vs "Unlock extended play"  
  // Test 3: Tone - "Upgrade required" vs "S-Class members can continue"
  const CTA_VARIANTS = ['A', 'B', 'C'] as const;
  const CTA_COPY = {
    A: { 
      headline: "You've reached today's limit", 
      subtext: "Upgrade to continue",
      buttonLabel: "See Benefits",
      style: 'neutral'
    },
    B: { 
      headline: "You've completed today's free runs", 
      subtext: "Unlock extended play",
      buttonLabel: "See Benefits",
      style: 'positive'
    },
    C: { 
      headline: "S-Class members can continue playing", 
      subtext: "Get more rewarded games per day",
      buttonLabel: "See Benefits",
      style: 'supportive'
    },
  };
  
  // Event CTA variants (presentation-only, no economy changes)
  // Variant A: Soft Event Reminder (non-urgent, calm)
  // Variant B: Progress-Oriented (informative)
  // Variant C: Event Flavor (curiosity-driven)
  const EVENT_CTA_COPY = {
    A: { 
      headline: "Fracture Surge Active — Continue Your Momentum", 
      subtext: "Practice freely or unlock full runs",
      buttonLabel: "Continue",
      style: 'soft_reminder'
    },
    B: { 
      headline: "You've reached today's limit — S-Class unlocks deeper runs", 
      subtext: "Get more rewarded games and higher token limits",
      buttonLabel: "See Benefits",
      style: 'progress_oriented'
    },
    C: { 
      headline: "Realm Alignment Event Live — Practice freely or unlock full runs", 
      subtext: "S-Class members get extended access",
      buttonLabel: "Explore Options",
      style: 'event_flavor'
    },
  };
  
  // First-Purchase Discount Copy (trust-preserving, subtle)
  const FIRST_PURCHASE_COPY = {
    headline: "First time here?",
    subtext: "As a thank-you for trying AniRealm, you can unlock extended play at a reduced price.",
    buttonLabel: "Unlock once",
    footnote: "One-time offer · No recurring discount",
  };
  
  // Discount parameters (per spec: 20%, specific products only)
  const FIRST_PURCHASE_DISCOUNT_PERCENT = 20;
  const FIRST_PURCHASE_ELIGIBLE_PRODUCTS = ['sclass_subscription', 'small_token_pack'];
  
  // Feature flags (can be overridden via site settings)
  const getMonetizationFlags = (settingsMap: Record<string, any>) => ({
    abTestsEnabled: settingsMap['monetization_ab_tests_enabled'] !== 'false',
    discountsEnabled: settingsMap['monetization_discounts_enabled'] !== 'false',
    eventCtasEnabled: settingsMap['monetization_event_ctas_enabled'] !== 'false',
  });
  
  // Check if there's an active event (can be controlled via site settings)
  const isEventActive = (settingsMap: Record<string, any>) => {
    return settingsMap['game_event_active'] === 'true' || settingsMap['game_event_active'] === true;
  };
  
  // Check if CTA variant lock has expired (7 days per spec)
  const isVariantLockExpired = (assignedAt: Date | null): boolean => {
    if (!assignedAt) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return assignedAt < sevenDaysAgo;
  };
  
  // Check if first-purchase discount cooldown has expired (30 days per spec)
  const isDiscountCooldownExpired = (declinedAt: Date | null): boolean => {
    if (!declinedAt) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return declinedAt < thirtyDaysAgo;
  };

  // Get user's daily game status
  app.get("/api/game/status", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const today = getTodayDate();
      const stats = await storage.getUserDailyGameStats(user.id, today);
      const activeSession = await storage.getActiveSessionForUser(user.id);
      
      // Get config with site settings
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      const config = getGameConfig(settingsMap);
      const monetizationFlags = getMonetizationFlags(settingsMap);
      
      const maxRewardedRuns = user.isPremium 
        ? config.premiumUserMaxRuns 
        : config.freeUserMaxRuns;
      const baseRewardedRuns = user.isPremium 
        ? config.premiumUserRewardedRuns 
        : config.freeUserRewardedRuns;

      const rewardedRunsUsed = stats?.rewardedRunsUsed || 0;
      const tokensEarnedToday = stats?.tokensEarnedToday || 0;
      const dailyTokenCap = user.isPremium ? config.premiumUserDailyTokenCap : config.freeUserDailyTokenCap;
      const totalRewardedRuns = (stats?.socialBonusClaimed ? baseRewardedRuns + 1 : baseRewardedRuns);
      const rewardedRunsRemaining = Math.max(0, totalRewardedRuns - rewardedRunsUsed);
      
      // Calculate isPracticeOnly - true if runs exhausted OR token cap reached
      const isPracticeOnly = rewardedRunsRemaining <= 0 || tokensEarnedToday >= dailyTokenCap;
      
      // Calculate next reset time (00:00 UTC tomorrow)
      const now = new Date();
      const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      
      // ========================
      // ACTIVE DAYS TRACKING
      // ========================
      const lastActiveDate = (user as any).lastActiveDate;
      let activeDays = (user as any).activeDays || 0;
      const todayStart = new Date(today);
      
      // Count unique active days
      if (!lastActiveDate || new Date(lastActiveDate).toISOString().split('T')[0] !== today) {
        activeDays += 1;
        await storage.updateUser(user.id, { 
          activeDays,
          lastActiveDate: todayStart
        });
      }
      
      // ========================
      // A/B TESTING (Spec-Compliant)
      // ========================
      let ctaVariantId = (user as any).ctaVariantId;
      const ctaVariantAssignedAt = (user as any).ctaVariantAssignedAt;
      
      // Assign variant if: not assigned, or lock expired (7 days), or A/B tests disabled
      if (monetizationFlags.abTestsEnabled) {
        if (!ctaVariantId || isVariantLockExpired(ctaVariantAssignedAt)) {
          // Randomly assign a variant (33/33/33 split)
          ctaVariantId = CTA_VARIANTS[Math.floor(Math.random() * CTA_VARIANTS.length)];
          await storage.updateUser(user.id, { 
            ctaVariantId,
            ctaVariantAssignedAt: new Date()
          });
        }
      } else {
        // A/B tests disabled - use default variant A
        ctaVariantId = 'A';
      }
      
      // ========================
      // CTA SEEN COUNT (for first-purchase eligibility)
      // ========================
      let ctaSeenCount = (user as any).ctaSeenCount || 0;
      // Increment when user reaches practice-only mode (cap reached)
      if (isPracticeOnly) {
        ctaSeenCount += 1;
        await storage.updateUser(user.id, { ctaSeenCount });
      }
      
      // ========================
      // EVENT STATUS
      // ========================
      const eventActive = monetizationFlags.eventCtasEnabled && isEventActive(settingsMap);
      const eventName = settingsMap['game_event_name'] || null;
      
      // Get CTA copy based on variant and event status
      const ctaCopy = eventActive 
        ? EVENT_CTA_COPY[ctaVariantId as keyof typeof EVENT_CTA_COPY] || EVENT_CTA_COPY.A
        : CTA_COPY[ctaVariantId as keyof typeof CTA_COPY] || CTA_COPY.A;
      
      // ========================
      // FIRST-PURCHASE DISCOUNT (Spec-Compliant)
      // ========================
      const hasPurchased = (user as any).hasPurchased || false;
      const firstPurchaseDiscountUsed = (user as any).firstPurchaseDiscountUsed || false;
      const firstPurchaseDiscountDeclinedAt = (user as any).firstPurchaseDiscountDeclinedAt;
      
      // Per spec: Only show discount if:
      // - activeDays >= 2 (not on day 1)
      // - ctaSeenCount >= 1 (seen at least 1 standard CTA)
      // - !hasPurchased (never purchased)
      // - !firstPurchaseDiscountUsed (not already used)
      // - isPracticeOnly (cap reached)
      // - !isPremium (not already S-Class)
      // - cooldown expired (30 days since decline)
      // - discounts enabled (feature flag)
      const firstPurchaseDiscountEligible = monetizationFlags.discountsEnabled &&
        activeDays >= 2 &&
        ctaSeenCount >= 1 &&
        !hasPurchased &&
        !firstPurchaseDiscountUsed &&
        isPracticeOnly &&
        !user.isPremium &&
        isDiscountCooldownExpired(firstPurchaseDiscountDeclinedAt);

      res.json({
        userId: user.id,
        isPremium: user.isPremium,
        isSClass: user.isPremium, // Alias for frontend
        tokens: user.tokens,
        date: today,
        rewardedRunsUsed,
        rewardedRunsRemaining,
        rewardedRunsTotal: totalRewardedRuns,
        maxRewardedRuns,
        baseRewardedRuns,
        practiceRunsUsed: stats?.practiceRunsUsed || 0,
        tokensEarnedToday,
        dailyTokenCap,
        isPracticeOnly,
        nextResetUtc: nextReset.toISOString(),
        socialBonusClaimed: stats?.socialBonusClaimed || false,
        eventEntriesUsed: stats?.eventEntriesUsed || 0,
        activeSession: activeSession || null,
        features: config.features,
        tutorial: {
          buttonsDone: user.tutorialButtonsDone || false,
          rewardedDone: user.tutorialRewardedDone || false,
          firstEarnDone: user.tutorialFirstEarnDone || false,
          practiceOnlyDone: user.tutorialPracticeOnlyDone || false,
        },
        // A/B Testing and Monetization
        ctaVariantId,
        ctaCopy,
        eventActive,
        eventName,
        hasPurchased,
        activeDays,
        ctaSeenCount,
        // First-purchase discount
        firstPurchaseDiscountEligible,
        firstPurchaseDiscountPercent: FIRST_PURCHASE_DISCOUNT_PERCENT,
        firstPurchaseCopy: firstPurchaseDiscountEligible ? FIRST_PURCHASE_COPY : null,
        firstPurchaseEligibleProducts: FIRST_PURCHASE_ELIGIBLE_PRODUCTS,
        // Feature flags for admin/debugging
        monetizationFlags,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Decline first-purchase discount (30-day cooldown)
  app.post("/api/game/decline-discount", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      await storage.updateUser(user.id, {
        firstPurchaseDiscountDeclinedAt: new Date()
      });
      
      console.log(`[Analytics] first_purchase_discount_declined`, {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ S-CLASS TRIAL & WELCOME ROUTES ============
  
  // Start S-Class trial (3 days, one per lifetime)
  app.post("/api/sclass/start-trial", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check eligibility
      if (user.trialUsed) {
        return res.status(400).json({ error: "Trial already used. One trial per account lifetime." });
      }
      if (user.isPremium) {
        return res.status(400).json({ error: "Already an S-Class member." });
      }
      if (user.isOnTrial) {
        return res.status(400).json({ error: "Already on trial." });
      }

      // Start 3-day trial
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 3);

      await storage.updateUser(user.id, {
        isOnTrial: true,
        trialStartDate: now,
        trialEndDate: trialEnd,
        trialUsed: true,
        isPremium: true, // Grant S-Class access during trial
      });

      console.log(`[Analytics] sclass_trial_started`, {
        userId: user.id,
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString()
      });

      res.json({ 
        success: true, 
        trialStartDate: now.toISOString(),
        trialEndDate: trialEnd.toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel S-Class trial
  app.post("/api/sclass/cancel-trial", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.isOnTrial) {
        return res.status(400).json({ error: "Not on trial." });
      }

      // Downgrade silently
      await storage.updateUser(user.id, {
        isOnTrial: false,
        isPremium: false,
      });

      console.log(`[Analytics] sclass_trial_cancelled`, {
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Convert trial to full S-Class subscription
  app.post("/api/sclass/convert-trial", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const now = new Date();
      const premiumEnd = new Date(now);
      premiumEnd.setMonth(premiumEnd.getMonth() + 1);

      // Mark as full S-Class (first time joining triggers welcome reward eligibility)
      const updates: Record<string, any> = {
        isOnTrial: false,
        isPremium: true,
        premiumStartDate: now,
        premiumEndDate: premiumEnd,
        hasPurchased: true,
        firstPurchaseAt: user.firstPurchaseAt || now,
      };

      // Only set sclassJoinedAt if this is first time becoming full S-Class
      if (!user.sclassJoinedAt) {
        updates.sclassJoinedAt = now;
      }

      await storage.updateUser(user.id, updates);

      console.log(`[Analytics] sclass_trial_converted`, {
        userId: user.id,
        timestamp: now.toISOString()
      });

      res.json({ 
        success: true,
        showWelcomeReward: !user.sclassWelcomeRewardClaimed
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim S-Class welcome reward (+300 tokens, one-time)
  app.post("/api/sclass/claim-welcome-reward", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check eligibility
      if (user.sclassWelcomeRewardClaimed) {
        return res.status(400).json({ error: "Welcome reward already claimed." });
      }
      if (!user.isPremium || user.isOnTrial) {
        return res.status(400).json({ error: "Must be a full S-Class member to claim." });
      }

      // Grant +300 tokens and mark as claimed
      const WELCOME_BONUS_TOKENS = 300;
      await storage.updateUser(user.id, {
        tokens: (user.tokens || 0) + WELCOME_BONUS_TOKENS,
        sclassWelcomeRewardClaimed: true,
      });

      console.log(`[Analytics] sclass_welcome_reward_claimed`, {
        userId: user.id,
        tokensGranted: WELCOME_BONUS_TOKENS,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        success: true,
        tokensGranted: WELCOME_BONUS_TOKENS,
        newBalance: (user.tokens || 0) + WELCOME_BONUS_TOKENS
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get S-Class status (trial status, days remaining, etc.)
  app.get("/api/sclass/status", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if trial expired
      if (user.isOnTrial && user.trialEndDate) {
        const now = new Date();
        if (now > new Date(user.trialEndDate)) {
          // Trial expired, downgrade
          await storage.updateUser(user.id, {
            isOnTrial: false,
            isPremium: false,
            subscriptionStatus: 'expired',
          });
          return res.json({
            status: 'free',
            trialExpired: true,
            trialUsed: true,
            canStartTrial: false
          });
        }
      }

      // Check if admin-granted access expired
      if (user.accessSource === 'admin_grant' && user.accessExpiresAt) {
        const now = new Date();
        if (now > new Date(user.accessExpiresAt)) {
          // Admin grant expired, check if user has paid subscription to fall back to
          // subscriptionStatus 'active' means ongoing subscription (premiumEndDate may be null for auto-renewing)
          // 'canceled_pending_expiry' means they canceled but still have access until premiumEndDate
          const hasPaidSubscription = user.subscriptionStatus === 'active' || 
            (user.subscriptionStatus === 'canceled_pending_expiry' && user.premiumEndDate && new Date(user.premiumEndDate) > now);
          
          const updatedUser = await storage.updateUser(user.id, {
            accessSource: null,
            accessExpiresAt: null,
            isPremium: hasPaidSubscription ? true : false,
          });

          console.log(`[Analytics] admin_grant_expired`, {
            userId: user.id,
            fallbackToSubscription: hasPaidSubscription,
          });

          if (!hasPaidSubscription) {
            return res.json({
              status: 'free',
              adminGrantExpired: true,
              canStartTrial: !user.trialUsed,
            });
          }
          
          // Use updated user data for the rest of the response
          Object.assign(user, updatedUser);
        }
      }

      // Check if premium subscription expired (for canceled_pending_expiry state)
      if (user.isPremium && user.premiumEndDate && user.subscriptionStatus === 'canceled_pending_expiry') {
        const now = new Date();
        if (now > new Date(user.premiumEndDate)) {
          // Subscription period ended, downgrade to free
          await storage.updateUser(user.id, {
            isPremium: false,
            subscriptionStatus: 'expired',
          });

          console.log(`[Analytics] sclass_subscription_expired`, {
            userId: user.id,
            subscriptionType: user.subscriptionType,
            endedAt: user.premiumEndDate,
          });

          return res.json({
            status: 'free',
            subscriptionExpired: true,
            subscriptionStatus: 'expired',
            canStartTrial: !user.trialUsed,
          });
        }
      }

      // Calculate trial days remaining
      let trialDaysRemaining = 0;
      if (user.isOnTrial && user.trialEndDate) {
        const now = new Date();
        const end = new Date(user.trialEndDate);
        trialDaysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      res.json({
        status: user.isOnTrial ? 'trial' : user.isPremium ? 'sclass' : 'free',
        isOnTrial: user.isOnTrial || false,
        trialDaysRemaining,
        trialEndDate: user.trialEndDate,
        trialUsed: user.trialUsed || false,
        canStartTrial: !user.trialUsed && !user.isPremium && !user.isOnTrial,
        sclassJoinedAt: user.sclassJoinedAt,
        welcomeRewardPending: user.isPremium && !user.isOnTrial && !user.sclassWelcomeRewardClaimed,
        subscriptionType: user.subscriptionType || 'monthly',
        subscriptionStatus: user.subscriptionStatus || (user.isPremium ? 'active' : 'none'),
        subscriptionCanceledAt: user.subscriptionCanceledAt,
        premiumEndDate: user.premiumEndDate,
        retentionSaveBonusAvailable: user.isPremium && !user.retentionSaveBonusUsed,
        accessSource: user.accessSource,
        accessExpiresAt: user.accessExpiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim retention save bonus (one-time, +200 tokens)
  app.post("/api/sclass/retention-save", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.isPremium) {
        return res.status(400).json({ error: "Only S-Class members can claim this bonus" });
      }

      if (user.retentionSaveBonusUsed) {
        return res.status(400).json({ error: "Retention bonus already claimed (one-time only)" });
      }

      // Grant bonus and mark as used
      await storage.updateUser(user.id, {
        tokens: (user.tokens || 0) + 200,
        retentionSaveBonusUsed: true,
      });

      res.json({ 
        success: true, 
        message: "Thank you for staying! +200 tokens added.",
        tokensAdded: 200
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Switch to yearly subscription
  app.post("/api/sclass/switch-yearly", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.isPremium) {
        return res.status(400).json({ error: "Only S-Class members can switch plans" });
      }

      if (user.subscriptionType === 'yearly') {
        return res.status(400).json({ error: "Already on yearly plan" });
      }

      // Calculate new end date (1 year from now)
      const newEndDate = new Date();
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      await storage.updateUser(user.id, {
        subscriptionType: 'yearly',
        premiumEndDate: newEndDate,
        subscriptionStatus: 'active',
        subscriptionCanceledAt: null,
      });

      res.json({ 
        success: true, 
        message: "Switched to yearly billing! You're saving 33%.",
        newEndDate
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription (access continues until billing period ends)
  app.post("/api/sclass/cancel-subscription", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.isPremium) {
        return res.status(400).json({ error: "No active subscription to cancel" });
      }

      if (user.subscriptionStatus === 'canceled_pending_expiry') {
        return res.status(400).json({ error: "Subscription already canceled" });
      }

      // Calculate end date if not set (default: end of current billing period)
      let endDate = user.premiumEndDate;
      if (!endDate) {
        // Default to 30 days for monthly, 365 for yearly
        endDate = new Date();
        if (user.subscriptionType === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setDate(endDate.getDate() + 30);
        }
      }

      await storage.updateUser(user.id, {
        subscriptionStatus: 'canceled_pending_expiry',
        subscriptionCanceledAt: new Date(),
        premiumEndDate: endDate,
      });

      res.json({ 
        success: true, 
        message: "Subscription canceled. Access continues until billing period ends.",
        activeUntil: endDate
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reactivate subscription (for users who canceled but still in paid period)
  app.post("/api/sclass/reactivate", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Must be in canceled_pending_expiry state
      if (user.subscriptionStatus !== 'canceled_pending_expiry') {
        return res.status(400).json({ error: "No pending cancellation to reactivate" });
      }

      // Must still have time left on subscription
      if (!user.premiumEndDate || user.premiumEndDate < new Date()) {
        return res.status(400).json({ error: "Subscription period has expired" });
      }

      // Reactivate: clear cancellation state, keep same end date
      await storage.updateUser(user.id, {
        subscriptionStatus: 'active',
        subscriptionCanceledAt: null,
        lastReactivateDate: new Date(),
      });

      console.log(`[Analytics] sclass_reactivated`, {
        userId: user.id,
        subscriptionType: user.subscriptionType,
        remainingDays: Math.ceil((user.premiumEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });

      res.json({ 
        success: true, 
        message: "Welcome back! Your S-Class membership is active again.",
        activeUntil: user.premiumEndDate
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Subscribe to S-Class (new subscription or renewal)
  app.post("/api/sclass/subscribe", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { planType } = req.body; // 'monthly' or 'yearly'
      const isYearly = planType === 'yearly';

      // Calculate end date
      const endDate = new Date();
      if (isYearly) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setDate(endDate.getDate() + 30);
      }

      const isFirstTimeSubscriber = !user.sclassJoinedAt && !user.isOnTrial;

      await storage.updateUser(user.id, {
        isPremium: true,
        isOnTrial: false,
        subscriptionType: isYearly ? 'yearly' : 'monthly',
        subscriptionStatus: 'active',
        premiumStartDate: new Date(),
        premiumEndDate: endDate,
        subscriptionCanceledAt: null,
        sclassJoinedAt: user.sclassJoinedAt || new Date(),
        hasPurchased: true,
        firstPurchaseAt: user.firstPurchaseAt || new Date(),
      });

      res.json({ 
        success: true, 
        planType: isYearly ? 'yearly' : 'monthly',
        endDate,
        welcomeRewardPending: isFirstTimeSubscriber && !user.sclassWelcomeRewardClaimed,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update tutorial flags
  app.post("/api/game/tutorial", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { step } = req.body;
      const validSteps = ['buttons', 'rewarded', 'firstEarn', 'practiceOnly'];
      if (!validSteps.includes(step)) {
        return res.status(400).json({ error: "Invalid tutorial step" });
      }

      const updates: Record<string, boolean> = {};
      if (step === 'buttons') updates.tutorialButtonsDone = true;
      if (step === 'rewarded') updates.tutorialRewardedDone = true;
      if (step === 'firstEarn') updates.tutorialFirstEarnDone = true;
      if (step === 'practiceOnly') updates.tutorialPracticeOnlyDone = true;

      await storage.updateUser(user.id, updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start a new game session
  app.post("/api/game/start", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { trialType, isPractice } = req.body;
      if (!['safe', 'unstable', 'overcharged'].includes(trialType)) {
        return res.status(400).json({ error: "Invalid trial type" });
      }

      // Check for existing active session
      const activeSession = await storage.getActiveSessionForUser(user.id);
      if (activeSession) {
        return res.status(400).json({ error: "You already have an active session", session: activeSession });
      }

      // Get config
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      const config = getGameConfig(settingsMap);

      // Check feature flag
      if (!config.features.fracture_trial_enabled) {
        return res.status(403).json({ error: "Fracture Trial is currently disabled" });
      }

      const trialConfig = config.trials[trialType as keyof typeof config.trials];
      const today = getTodayDate();
      const stats = await storage.getUserDailyGameStats(user.id, today);

      // Determine if this is a rewarded run
      let isRewarded = !isPractice;
      if (isRewarded) {
        const baseRuns = user.isPremium ? config.premiumUserRewardedRuns : config.freeUserRewardedRuns;
        const bonusRuns = stats?.socialBonusClaimed ? 1 : 0;
        const maxRuns = baseRuns + bonusRuns;
        if ((stats?.rewardedRunsUsed || 0) >= maxRuns) {
          isRewarded = false; // Force practice mode if out of rewarded runs
        }
      }

      // Check token cost for overcharged
      let tokensSpent = 0;
      if (trialType === 'overcharged' && isRewarded) {
        if (user.tokens < trialConfig.tokenCost) {
          return res.status(400).json({ error: "Not enough tokens for Overcharged trial", required: trialConfig.tokenCost });
        }
        tokensSpent = trialConfig.tokenCost;
        await storage.updateUser(user.id, { tokens: user.tokens - tokensSpent });
      }

      // Create session
      const session = await storage.createGameSession({
        userId: user.id,
        trialType,
        gameMode: 'instant',
        isRewarded,
        status: 'active',
        tokensSpent,
        fracturesTotal: trialConfig.fractureCount,
        expiresAt: new Date(Date.now() + (trialConfig.duration + 10) * 1000), // Extra 10s buffer
      });

      // Update daily stats
      if (isRewarded) {
        await storage.createOrUpdateUserDailyGameStats(user.id, today, {
          rewardedRunsUsed: (stats?.rewardedRunsUsed || 0) + 1,
        });
      } else {
        await storage.createOrUpdateUserDailyGameStats(user.id, today, {
          practiceRunsUsed: (stats?.practiceRunsUsed || 0) + 1,
        });
      }

      // Log activity
      await storage.logGameActivity({
        userId: user.id,
        sessionId: session.id,
        action: 'run_started',
        details: { trialType, isRewarded, tokensSpent },
      });

      res.json({
        session,
        trialConfig: {
          name: trialConfig.name,
          duration: trialConfig.duration,
          fractureCount: trialConfig.fractureCount,
          riskLevel: trialConfig.riskLevel,
          // Gameplay mechanics for distinct trial feels
          spawnDelay: trialConfig.spawnDelay,
          windowMin: trialConfig.windowMin,
          windowMax: trialConfig.windowMax,
          maxConcurrent: trialConfig.maxConcurrent,
          spawnAcceleration: trialConfig.spawnAcceleration,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete a game session (server-authoritative outcome)
  // Security: Outcomes incorporate player clicks but are validated server-side
  // Click count is capped to prevent manipulation
  app.post("/api/game/complete", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { sessionId, clickCount = 0, forceEnd = false } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.userId !== user.id) return res.status(403).json({ error: "Not your session" });
      if (session.status !== 'active') return res.status(400).json({ error: "Session already completed" });

      // Server-authoritative: validate session timing
      const sessionStartTime = new Date(session.startedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - sessionStartTime) / 1000;
      
      // Get config
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      const config = getGameConfig(settingsMap);
      const trialConfig = config.trials[session.trialType as keyof typeof config.trials];

      // Session must be at least 3 seconds (anti-cheat minimum)
      // UNLESS forceEnd is true (user clicked "End Game Early" button)
      const MIN_SESSION_TIME = 3;
      const MAX_SESSION_TIME = trialConfig.duration + 15;
      
      if (elapsedSeconds < MIN_SESSION_TIME && !forceEnd) {
        return res.status(400).json({ error: "Session completed too quickly", code: "TOO_FAST" });
      }
      
      if (elapsedSeconds > MAX_SESSION_TIME) {
        // Session expired - mark as failure, no reward
        await storage.updateGameSession(sessionId, {
          status: 'completed',
          outcome: 'failure',
          score: 0,
          fracturesStabilized: 0,
          tokensRewarded: 0,
          completedAt: new Date(),
        });
        return res.status(400).json({ error: "Session expired", code: "EXPIRED" });
      }

      // Server-authoritative performance calculation
      // We DO NOT trust client-reported click counts for outcome determination
      // Instead, use seeded randomness + time engagement for security
      const seedHash = session.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const performanceRoll = ((seedHash * 9301 + 49297) % 233280) / 233280; // Seeded random
      
      // Time engagement rewards playing the full duration
      const timeEngagement = Math.min(1, elapsedSeconds / trialConfig.duration);
      
      // Combined performance: seeded random (40%) + time engagement (40%) + fresh random (20%)
      // This ensures outcomes are unpredictable but reward engagement
      const combinedPerformance = (performanceRoll * 0.4) + (timeEngagement * 0.4) + (Math.random() * 0.2);
      
      // Client-reported clicks are used ONLY for display, not for outcome calculation
      // This maintains server authority while giving visual feedback
      const displayClicks = Math.min(Math.max(0, Math.floor(clickCount || 0)), session.fracturesTotal);
      
      // Outcome determination based on combined performance
      let outcome: 'success' | 'critical_success' | 'failure';
      const outcomeRoll = Math.random();
      
      if (combinedPerformance >= 0.5) {
        // Good performance - use full success rates
        if (outcomeRoll < trialConfig.criticalRate) {
          outcome = 'critical_success';
        } else if (outcomeRoll < trialConfig.successRate) {
          outcome = 'success';
        } else {
          outcome = 'failure';
        }
      } else if (combinedPerformance >= 0.3) {
        // Moderate performance - reduced success rate
        if (outcomeRoll < trialConfig.successRate * 0.6) {
          outcome = 'success';
        } else {
          outcome = 'failure';
        }
      } else {
        // Poor performance - mostly failure
        if (outcomeRoll < trialConfig.successRate * 0.2) {
          outcome = 'success';
        } else {
          outcome = 'failure';
        }
      }

      // Server calculates fractures based on performance (maintains authority)
      // Display clicks are used for visual feedback only
      const fracturesStabilized = Math.floor(combinedPerformance * session.fracturesTotal);

      // Calculate rewards - only if session is rewarded and BEFORE daily cap check
      let tokensRewarded = 0;
      if (session.isRewarded && config.features.rewards_enabled) {
        // Re-check daily cap atomically before calculating reward
        const today = getTodayDate();
        const stats = await storage.getUserDailyGameStats(user.id, today);
        const tokensEarnedSoFar = stats?.tokensEarnedToday || 0;
        const userDailyTokenCap = user.isPremium ? config.premiumUserDailyTokenCap : config.freeUserDailyTokenCap;
        const tokensLeftToday = Math.max(0, userDailyTokenCap - tokensEarnedSoFar);

        if (tokensLeftToday > 0) {
          if (outcome === 'critical_success') {
            tokensRewarded = Math.floor(trialConfig.rewardRange.max * trialConfig.criticalMultiplier);
          } else if (outcome === 'success') {
            tokensRewarded = trialConfig.rewardRange.min + Math.floor(Math.random() * (trialConfig.rewardRange.max - trialConfig.rewardRange.min));
          } else {
            // Consolation reward on failure
            tokensRewarded = config.consolationRewardMin + Math.floor(Math.random() * (config.consolationRewardMax - config.consolationRewardMin));
          }
          // Strictly cap to remaining daily allowance
          tokensRewarded = Math.min(tokensRewarded, tokensLeftToday);
        }
      }

      // Update session atomically
      const updatedSession = await storage.updateGameSession(sessionId, {
        status: 'completed',
        outcome,
        score: Math.floor(combinedPerformance * 1000),
        fracturesStabilized,
        tokensRewarded,
        completedAt: new Date(),
      });

      // Log activity
      await storage.logGameActivity({
        userId: user.id,
        sessionId: session.id,
        action: 'run_completed',
        details: { outcome, tokensRewarded, fracturesStabilized, isRewarded: session.isRewarded, elapsed: elapsedSeconds },
      });

      res.json({
        session: updatedSession,
        outcome,
        tokensRewarded,
        fracturesStabilized,
        canClaimReward: tokensRewarded > 0 && !updatedSession?.rewardClaimed,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim rewards (idempotent with optimistic locking)
  // Security: Uses claim lock to prevent race conditions
  app.post("/api/game/claim", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { sessionId } = req.body;
      
      // First read to check if already claimed (idempotent check)
      const session = await storage.getGameSession(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.userId !== user.id) return res.status(403).json({ error: "Not your session" });
      if (session.status !== 'completed') return res.status(400).json({ error: "Session not completed" });
      
      // Idempotent: if already claimed, return success with current balance
      if (session.rewardClaimed) {
        const currentUser = await storage.getUser(user.id);
        return res.json({ 
          success: true, 
          alreadyClaimed: true, 
          tokensRewarded: session.tokensRewarded,
          newBalance: currentUser?.tokens || user.tokens,
        });
      }

      if (session.tokensRewarded <= 0) {
        // Mark as claimed even with 0 tokens to prevent future attempts
        await storage.updateGameSession(sessionId, {
          rewardClaimed: true,
          rewardClaimedAt: new Date(),
        });
        return res.json({ success: true, tokensRewarded: 0, newBalance: user.tokens });
      }

      // Atomic claim: Mark session as claimed FIRST, then grant tokens
      // If this fails due to concurrent request, the second request will see rewardClaimed=true
      const claimResult = await storage.claimGameReward(sessionId, user.id, session.tokensRewarded);
      
      if (!claimResult.success) {
        // Concurrent claim - return idempotent success
        const currentUser = await storage.getUser(user.id);
        return res.json({ 
          success: true, 
          alreadyClaimed: true, 
          tokensRewarded: session.tokensRewarded,
          newBalance: currentUser?.tokens || user.tokens,
        });
      }

      // Update daily stats
      const today = getTodayDate();
      const stats = await storage.getUserDailyGameStats(user.id, today);
      await storage.createOrUpdateUserDailyGameStats(user.id, today, {
        tokensEarnedToday: (stats?.tokensEarnedToday || 0) + session.tokensRewarded,
      });

      // Log activity
      await storage.logGameActivity({
        userId: user.id,
        sessionId: session.id,
        action: 'reward_claimed',
        details: { tokensGranted: session.tokensRewarded, newBalance: claimResult.newBalance },
      });

      res.json({ 
        success: true, 
        tokensRewarded: session.tokensRewarded, 
        newBalance: claimResult.newBalance,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim social bonus (+1 rewarded run)
  app.post("/api/game/social-bonus", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const today = getTodayDate();
      const stats = await storage.getUserDailyGameStats(user.id, today);

      if (stats?.socialBonusClaimed) {
        return res.json({ success: true, alreadyClaimed: true });
      }

      await storage.createOrUpdateUserDailyGameStats(user.id, today, {
        socialBonusClaimed: true,
      });

      res.json({ success: true, bonusRunsGranted: 1 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Chronicle Post from game session
  app.post("/api/game/chronicle-post", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { sessionId } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.userId !== user.id) return res.status(403).json({ error: "Not your session" });
      if (session.chroniclePostId) {
        return res.json({ success: true, alreadyPosted: true, postId: session.chroniclePostId });
      }

      // Get config for templates
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      const config = getGameConfig(settingsMap);

      if (!config.features.chronicle_posts_enabled) {
        return res.status(403).json({ error: "Chronicle posts are disabled" });
      }

      // Generate post content
      const templates = config.chronicleTemplates[session.outcome as keyof typeof config.chronicleTemplates] || config.chronicleTemplates.success;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const content = `⚡ ${user.name} ${template}`;

      // Create post
      const post = await storage.createPost({
        userId: user.id,
        content,
      });

      // Link post to session
      await storage.updateGameSession(sessionId, { chroniclePostId: post.id });

      res.json({ success: true, post });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's game history
  app.get("/api/game/history", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const sessions = await storage.getUserGameSessions(user.id, limit);

      res.json({ sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming events (scaffold)
  app.get("/api/game/events", async (req, res) => {
    try {
      const upcoming = await storage.getUpcomingGameEvents(10);
      const live = await storage.getLiveGameEvents();
      res.json({ upcoming, live });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update game settings
  app.post("/api/admin/game/settings", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid settings object" });
      }

      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        await storage.setSiteSetting(key, String(value), user.id);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Create scheduled event
  app.post("/api/admin/game/events", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, eventType, scheduledAt, durationMinutes, freeEntriesAllowed, maxEntriesPerUser, extraEntryCost, rewardPool } = req.body;

      if (!name || !description || !scheduledAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const event = await storage.createGameEvent({
        name,
        description,
        eventType: eventType || 'fracture_storm',
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 15,
        freeEntriesAllowed: freeEntriesAllowed || 1,
        maxEntriesPerUser: maxEntriesPerUser || 3,
        extraEntryCost: extraEntryCost || 50,
        rewardPool: rewardPool || null,
      });

      res.json({ success: true, event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get game activity logs
  app.get("/api/admin/game/logs", verifySupabaseToken, async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const userId = req.query.userId as string;
      const date = req.query.date as string;

      if (userId && date) {
        const logs = await storage.getGameActivityLogsForDate(userId, date);
        res.json({ logs });
      } else if (userId) {
        const logs = await storage.getUserGameActivityLogs(userId, 100);
        res.json({ logs });
      } else {
        res.status(400).json({ error: "userId is required" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =====================
  // STRIPE PAYMENT ROUTES
  // =====================

  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  // Get S-Class subscription products and prices
  
    // Get S-Class subscription products and prices
app.get("/api/stripe/products", async (_req, res) => {
  return res.json({
    product: {
      name: "S-Class Membership",
      description:
        "Premium Access to AniRealm - Unlock additional daily game entries, higher token caps, extra draw entries, and exclusive perks.",
    },
    prices: [
      {
        id: "price_1SkuHDRdxAAD3924utTKVVEA", // $9.99 monthly
        unitAmount: 999,
        currency: "usd",
        interval: "month",
        recurring: { interval: "month" },
      },
      {
        id: "price_1SlFUbRdxAAD392445O8ScqK", // $79.99 yearly
        unitAmount: 7999,
        currency: "usd",
        interval: "year",
        recurring: { interval: "year" },
      },
    ],
  });
});


// Create checkout session for S-Class subscription
app.post("/api/stripe/checkout", verifySupabaseToken, async (req, res) => {
  try {
    const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Block checkout for users with active admin-granted access
    if (user.accessSource === "admin_grant" && user.accessExpiresAt) {
      const expiresAt = new Date(user.accessExpiresAt);
      if (expiresAt > new Date()) {
        return res.status(403).json({
          error:
            "You have complimentary S-Class access until " +
            expiresAt.toLocaleDateString() +
            ". You can subscribe after this access ends.",
        });
      }
    }

    const { priceId, plan } = req.body;

    // Map plan names to Stripe price IDs
    const PRICE_IDS: Record<string, string> = {
      monthly: "price_1SkuHDRdxAAD3924utTKVVEA",
      yearly: "price_1SlFUbRdxAAD392445O8ScqK",
    };

    const selectedPriceId = priceId || (plan ? PRICE_IDS[plan] : null);
    if (!selectedPriceId) {
      return res.status(400).json({ error: "Plan or price ID required" });
    }

    const { stripe } = await import("./stripeClient");

    let customerId = user.stripeCustomerId;

    // Verify customer exists in Stripe, create new one if not
    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if ((existingCustomer as any).deleted) {
          customerId = null;
        }
      } catch (e: any) {
        if (e.code === "resource_missing" || e.statusCode === 404) {
          customerId = null;
        } else {
          return res
            .status(500)
            .json({ error: "Unable to verify billing account." });
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          username: user.username || "",
        },
      });
      customerId = customer.id;

      await storage.updateUser(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
      });
    }

    // 🚫 DUPLICATE SUBSCRIPTION GUARD (CRITICAL)
    const activeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (activeSubs.data.length > 0) {
      return res.status(409).json({
        error: "You already have an active subscription. Use Manage Billing.",
      });
    }

    // Build base URL safely (Replit + local dev)
    const baseUrl =
      process.env.APP_BASE_URL ||
      (process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : `${req.protocol}://${req.get("host")}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account?checkout=cancel`,
      metadata: {
        userId: user.id,
        plan: plan || "",
      },
      customer_update: {
        address: "auto",
      },
      billing_address_collection: "required",
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session",
    });
  }
});

// ✅ NEW: Create billing portal session (Manage Billing)
app.post("/api/stripe/portal", verifySupabaseToken, async (req, res) => {
  try {
    const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const { stripe } = await import("./stripeClient");

    let customerId = user.stripeCustomerId as string | null;

    // If customer missing or invalid, create one so portal can open
    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if ((existingCustomer as any).deleted) customerId = null;
      } catch (e: any) {
        if (e.code === "resource_missing" || e.statusCode === 404) customerId = null;
        else throw e;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          username: user.username || "",
        },
      });
      customerId = customer.id;

      await storage.updateUser(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
      });
    }

    const baseUrl =
      process.env.APP_BASE_URL ||
      (process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : `${req.protocol}://${req.get("host")}`);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Portal error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create billing portal session",
    });
  }
});

// Subscription sync handler (supports BOTH GET and POST)
const stripeSubscriptionSyncHandler = async (req: any, res: any) => {
  try {
    const user = await storage.getUserBySupabaseId(req.supabaseUser!.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const { stripe } = await import("./stripeClient");

    // If we don't even have a Stripe customer yet, user is not premium
    if (!user.stripeCustomerId) {
      await storage.updateUser(user.id, {
        isPremium: false,
        subscriptionStatus: "free",
        stripeSubscriptionId: null,
        premiumEndDate: null,
        subscriptionType: null,
      });
      return res.json({ isPremium: false, subscriptionStatus: "free" });
    }

    // Pull active subscriptions for this customer (most recent first)
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    const activeSub = subs.data[0] || null;

    const isPremium = !!activeSub;
    const subscriptionStatus = activeSub ? activeSub.status : "free";

    // detect monthly vs yearly from price interval
    let subscriptionType: string | null = null;
    let premiumEndDate: string | null = null;

    if (activeSub) {
      const item = activeSub.items.data[0];
      const interval = item?.price?.recurring?.interval; // "month" | "year"
      subscriptionType =
        interval === "year" ? "yearly" : interval === "month" ? "monthly" : null;

      premiumEndDate = activeSub.current_period_end
        ? new Date(activeSub.current_period_end * 1000).toISOString()
        : null;
    }

    await storage.updateUser(user.id, {
      isPremium,
      subscriptionStatus,
      stripeSubscriptionId: activeSub?.id || null,
      premiumEndDate,
      subscriptionType,
    });

    return res.json({
      isPremium,
      subscriptionStatus,
      stripeSubscriptionId: activeSub?.id || null,
      premiumEndDate,
      subscriptionType,
    });
  } catch (error: any) {
    console.error("Subscription sync error:", error);
    return res.status(500).json({ error: "Failed to sync subscription" });
  }
};

  app.get("/api/stripe/subscription", verifySupabaseToken, stripeSubscriptionSyncHandler);
  app.post("/api/stripe/subscription", verifySupabaseToken, stripeSubscriptionSyncHandler);

  return httpServer;
}

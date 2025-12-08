import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertSwipeActionSchema, insertCommunityMessageSchema, insertDrawSchema, insertPrizeSchema, insertDrawEntrySchema } from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or handle already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const existingHandle = await storage.getUserByHandle(validatedData.handle);
      if (existingHandle) {
        return res.status(400).json({ error: "Handle already taken" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
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
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ error: "Account banned" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
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
  
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
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
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
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
  
  // Post routes
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.likePost(req.params.id);
      res.json({ success: true });
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
  
  app.get("/api/users/:userId/cards", async (req, res) => {
    try {
      const userCards = await storage.getUserCards(req.params.userId);
      res.json(userCards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/cards/summon", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || user.tokens < 100) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }
      
      // Get all cards and pick random ones
      const allCards = await storage.getAllCards();
      const numPulls = user.isPremium ? 5 : 1;
      const pulledCards = [];
      
      for (let i = 0; i < numPulls; i++) {
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        pulledCards.push(randomCard);
        await storage.addCardToUser({
          userId: req.session.userId,
          cardId: randomCard.id,
        });
      }
      
      // Deduct tokens
      await storage.updateUser(req.session.userId, {
        tokens: user.tokens - 100,
      });
      
      res.json({ cards: pulledCards });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Create new card
  app.post("/api/cards", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const card = await storage.createCard(req.body);
      res.json(card);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Admin: Delete card
  app.delete("/api/cards/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.deleteCard(req.params.id);
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
  app.post("/api/admin/users/:id/ban", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { isBanned: true });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/users/:id/unban", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { isBanned: false });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/admin/users/:id/premium", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const admin = await storage.getUser(req.session.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const user = await storage.updateUser(req.params.id, { isPremium: true });
      res.json(user);
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
  app.post("/api/draws/:id/enter", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const draw = await storage.getDraw(req.params.id);
      if (!draw) {
        return res.status(404).json({ error: "Draw not found" });
      }
      
      if (draw.status !== 'open') {
        return res.status(400).json({ error: "Draw is not open for entries" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check entry rules
      const entryRules = draw.entryRules as any || {};
      if (entryRules.minLevel && user.level < entryRules.minLevel) {
        return res.status(400).json({ error: `Minimum level ${entryRules.minLevel} required` });
      }
      if (entryRules.premiumOnly && !user.isPremium) {
        return res.status(400).json({ error: "Premium members only" });
      }

      // Calculate tickets (premium gets bonus)
      const tickets = user.isPremium ? 3 : 1;
      
      const entry = await storage.createDrawEntry({
        drawId: req.params.id,
        userId: req.session.userId,
        tickets,
        entrySource: 'manual',
      });
      
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User's draw entries
  app.get("/api/users/me/draw-entries", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const entries = await storage.getUserDrawEntries(req.session.userId);
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

  return httpServer;
}

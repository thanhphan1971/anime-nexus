import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertSwipeActionSchema, insertCommunityMessageSchema } from "@shared/schema";
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

  return httpServer;
}

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
      // If user is authenticated, return posts with like status
      if (req.session.userId) {
        const posts = await storage.getPostsWithLikeStatus(req.session.userId);
        res.json(posts);
      } else {
        const posts = await storage.getPosts();
        res.json(posts);
      }
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
      
      const result = await storage.toggleLikePost(req.params.id, req.session.userId);
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
  
  app.post("/api/cards/summon", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || user.tokens < 100) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }
      
      // Get only active (non-archived) cards and pick random ones
      const allCards = await storage.getActiveCards();
      if (allCards.length === 0) {
        return res.status(400).json({ error: "No cards available in the gacha pool" });
      }
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
  
  // Admin: Delete card (only if no owners)
  app.delete("/api/cards/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
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
  app.post("/api/cards/:id/archive", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.archiveCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Unarchive card
  app.post("/api/cards/:id/unarchive", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.unarchiveCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get cards with owner counts
  app.get("/api/cards/admin", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const cardsWithCounts = await storage.getCardsWithOwnerCounts();
      res.json(cardsWithCounts);
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
      
      // Level requirement
      if (entryRules.minLevel && user.level < entryRules.minLevel) {
        return res.status(400).json({ error: `Minimum level ${entryRules.minLevel} required` });
      }
      
      // Premium-only check (for free entry on monthly draws)
      if (entryRules.premiumOnly && !user.isPremium) {
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
      
      let entry;
      if (existingEntry) {
        // Update existing entry with more tickets
        entry = await storage.updateDrawEntry(existingEntry.id, { tickets: newTotalTickets });
      } else {
        // Create new entry
        entry = await storage.createDrawEntry({
          drawId: req.params.id,
          userId: req.session.userId,
          tickets: ticketsToAdd,
          entrySource: 'manual',
        });
      }
      
      res.json({ 
        ...entry, 
        message: `Entry added! You now have ${newTotalTickets} of ${maxEntriesAllowed} entries.`,
        currentEntries: newTotalTickets,
        maxEntries: maxEntriesAllowed
      });
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

  // Purchase Authorization Request Routes
  
  // Create authorization request (minor requests parent approval for over-limit purchase)
  app.post("/api/parent/auth-request", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { packageId, tokenAmount, amountInCents, reason } = req.body;
      
      // Get parent link for this child
      const parentLink = await storage.getParentLink(req.session.userId);
      if (!parentLink || parentLink.status !== 'active') {
        return res.status(400).json({ error: "No active parent link found" });
      }
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const request = await storage.createPurchaseAuthRequest({
        childId: req.session.userId,
        parentId: parentLink.parentId,
        packageId,
        tokenAmount,
        amountInCents,
        reason,
        expiresAt,
      });
      
      res.json({
        success: true,
        request,
        message: "Authorization request sent to parent"
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get pending authorization requests for parent
  app.get("/api/parent/auth-requests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const requests = await storage.getPendingAuthRequests(req.session.userId);
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
      
      const requests = await storage.getChildPendingRequests(req.session.userId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Respond to authorization request (parent approves or denies)
  app.post("/api/parent/auth-request/:requestId/respond", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status, parentNote } = req.body;
      
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'denied'" });
      }
      
      // Get the request and verify parent owns it
      const authRequest = await storage.getAuthRequestById(req.params.requestId);
      if (!authRequest) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      if (authRequest.parentId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to respond to this request" });
      }
      
      if (authRequest.status !== 'pending') {
        return res.status(400).json({ error: "Request has already been processed" });
      }
      
      // Check if expired
      if (new Date() > authRequest.expiresAt) {
        await storage.respondToAuthRequest(req.params.requestId, 'denied', 'Request expired');
        return res.status(400).json({ error: "Request has expired" });
      }
      
      const updatedRequest = await storage.respondToAuthRequest(
        req.params.requestId,
        status,
        parentNote
      );
      
      // If approved, process the purchase
      if (status === 'approved' && updatedRequest) {
        const child = await storage.getUser(authRequest.childId);
        if (child) {
          // Add tokens to child's account (this is a parent-authorized purchase)
          await storage.updateUser(authRequest.childId, {
            tokens: child.tokens + authRequest.tokenAmount
          });
        }
      }
      
      res.json({
        success: true,
        request: updatedRequest,
        message: status === 'approved' 
          ? "Purchase approved and tokens added to child's account"
          : "Purchase request denied"
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
  app.get("/api/watchlist", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const items = await storage.getUserWatchlist(req.session.userId);
      
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

  app.post("/api/watchlist", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { anilistId, status = 'PLANNING' } = req.body;
      if (!anilistId || typeof anilistId !== 'number') {
        return res.status(400).json({ error: "anilistId is required and must be a number" });
      }

      // Check if already in watchlist
      const existing = await storage.getWatchlistItemByAnime(req.session.userId, anilistId);
      if (existing) {
        return res.status(400).json({ error: "Anime already in watchlist" });
      }

      const validStatuses = ['WATCHING', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const item = await storage.createWatchlistItem({
        userId: req.session.userId,
        anilistId,
        status,
      });

      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/watchlist/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const item = await storage.getWatchlistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Watchlist item not found" });
      }

      if (item.userId !== req.session.userId) {
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

  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const item = await storage.getWatchlistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Watchlist item not found" });
      }

      if (item.userId !== req.session.userId) {
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

  return httpServer;
}

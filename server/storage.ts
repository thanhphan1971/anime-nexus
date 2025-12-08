import { 
  type User, 
  type InsertUser,
  type Post,
  type InsertPost,
  type Card,
  type InsertCard,
  type UserCard,
  type InsertUserCard,
  type MarketListing,
  type InsertMarketListing,
  type Community,
  type InsertCommunity,
  type CommunityMessage,
  type InsertCommunityMessage,
  type SwipeAction,
  type InsertSwipeAction,
  type Prize,
  type InsertPrize,
  type Draw,
  type InsertDraw,
  type DrawEntry,
  type InsertDrawEntry,
  type DrawWinner,
  type InsertDrawWinner,
  users,
  posts,
  cards,
  userCards,
  marketListings,
  communities,
  communityMessages,
  swipeActions,
  prizes,
  draws,
  drawEntries,
  drawWinners,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number): Promise<Array<Post & { user: User }>>;
  getUserPosts(userId: string): Promise<Post[]>;
  likePost(postId: string): Promise<void>;
  
  // Card operations
  getAllCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  getUserCards(userId: string): Promise<Array<UserCard & { card: Card }>>;
  addCardToUser(userCard: InsertUserCard): Promise<UserCard>;
  
  // Marketplace operations
  getActiveListings(): Promise<Array<MarketListing & { seller: User; card: Card }>>;
  createListing(listing: InsertMarketListing): Promise<MarketListing>;
  purchaseListing(listingId: string, buyerId: string): Promise<void>;
  
  // Community operations
  getAllCommunities(): Promise<Community[]>;
  getCommunity(id: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunityMessages(communityId: string, limit?: number): Promise<Array<CommunityMessage & { user: User }>>;
  sendMessage(message: InsertCommunityMessage): Promise<CommunityMessage>;
  
  // Swipe operations
  recordSwipe(swipe: InsertSwipeAction): Promise<SwipeAction>;
  getSwipeCandidates(userId: string): Promise<User[]>;
  getMatches(userId: string): Promise<User[]>;
  
  // Prize operations
  getAllPrizes(): Promise<Prize[]>;
  createPrize(prize: InsertPrize): Promise<Prize>;
  updatePrize(id: string, updates: Partial<Prize>): Promise<Prize | undefined>;
  
  // Draw operations
  getAllDraws(): Promise<Draw[]>;
  getDraw(id: string): Promise<Draw | undefined>;
  getActiveDraws(): Promise<Draw[]>;
  getFeaturedDraw(): Promise<Draw | undefined>;
  createDraw(draw: InsertDraw): Promise<Draw>;
  updateDraw(id: string, updates: Partial<Draw>): Promise<Draw | undefined>;
  overrideDraw(id: string, adminId: string, reason: string, updates: Partial<Draw>): Promise<Draw | undefined>;
  
  // Draw entry operations
  getDrawEntries(drawId: string): Promise<Array<DrawEntry & { user: User }>>;
  getUserDrawEntries(userId: string): Promise<Array<DrawEntry & { draw: Draw }>>;
  createDrawEntry(entry: InsertDrawEntry): Promise<DrawEntry>;
  getEntryCount(drawId: string): Promise<number>;
  
  // Draw winner operations
  getDrawWinners(drawId: string): Promise<Array<DrawWinner & { user: User; prize: Prize }>>;
  getRecentWinners(limit?: number): Promise<Array<DrawWinner & { user: User; prize: Prize; draw: Draw }>>;
  createDrawWinner(winner: InsertDrawWinner): Promise<DrawWinner>;
  claimPrize(winnerId: string, userId: string): Promise<DrawWinner | undefined>;
  selectRandomWinner(drawId: string, prizeId: string): Promise<DrawWinner | undefined>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isBanned, false));
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const result = await db.insert(posts).values(insertPost).returning();
    return result[0];
  }

  async getPosts(limit: number = 50): Promise<Array<Post & { user: User }>> {
    const result = await db
      .select()
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    
    return result.map((r: any) => ({
      ...r.posts,
      user: r.users,
    }));
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async likePost(postId: string): Promise<void> {
    await db.update(posts).set({ likes: sql`${posts.likes} + 1` }).where(eq(posts.id, postId));
  }

  // Card operations
  async getAllCards(): Promise<Card[]> {
    return await db.select().from(cards);
  }

  async getCard(id: string): Promise<Card | undefined> {
    const result = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    return result[0];
  }

  async createCard(insertCard: InsertCard): Promise<Card> {
    const result = await db.insert(cards).values(insertCard).returning();
    return result[0];
  }

  async deleteCard(id: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.delete(userCards).where(eq(userCards.cardId, id));
      await tx.delete(marketListings).where(eq(marketListings.cardId, id));
      await tx.delete(cards).where(eq(cards.id, id));
    });
  }

  async getUserCards(userId: string): Promise<Array<UserCard & { card: Card }>> {
    const result = await db
      .select()
      .from(userCards)
      .innerJoin(cards, eq(userCards.cardId, cards.id))
      .where(eq(userCards.userId, userId))
      .orderBy(desc(userCards.acquiredAt));
    
    return result.map((r: any) => ({
      ...r.user_cards,
      card: r.cards,
    }));
  }

  async addCardToUser(insertUserCard: InsertUserCard): Promise<UserCard> {
    const result = await db.insert(userCards).values(insertUserCard).returning();
    return result[0];
  }

  // Marketplace operations
  async getActiveListings(): Promise<Array<MarketListing & { seller: User; card: Card }>> {
    const result = await db
      .select()
      .from(marketListings)
      .innerJoin(users, eq(marketListings.sellerId, users.id))
      .innerJoin(cards, eq(marketListings.cardId, cards.id))
      .where(eq(marketListings.isActive, true))
      .orderBy(desc(marketListings.createdAt));
    
    return result.map((r: any) => ({
      ...r.market_listings,
      seller: r.users,
      card: r.cards,
    }));
  }

  async createListing(insertListing: InsertMarketListing): Promise<MarketListing> {
    const result = await db.insert(marketListings).values(insertListing).returning();
    return result[0];
  }

  async purchaseListing(listingId: string, buyerId: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      // Get listing
      const listing = await tx.select().from(marketListings).where(eq(marketListings.id, listingId)).limit(1);
      if (!listing[0] || !listing[0].isActive) {
        throw new Error("Listing not found or inactive");
      }

      const { sellerId, cardId, price } = listing[0];

      // Get buyer
      const buyer = await tx.select().from(users).where(eq(users.id, buyerId)).limit(1);
      if (!buyer[0] || buyer[0].tokens < price) {
        throw new Error("Insufficient tokens");
      }

      // Transfer tokens
      await tx.update(users).set({ tokens: sql`${users.tokens} - ${price}` }).where(eq(users.id, buyerId));
      await tx.update(users).set({ tokens: sql`${users.tokens} + ${price}` }).where(eq(users.id, sellerId));

      // Transfer card ownership
      await tx.delete(userCards).where(
        and(eq(userCards.userId, sellerId), eq(userCards.cardId, cardId))
      );
      await tx.insert(userCards).values({ userId: buyerId, cardId });

      // Mark listing as sold
      await tx.update(marketListings).set({ isActive: false }).where(eq(marketListings.id, listingId));
    });
  }

  // Community operations
  async getAllCommunities(): Promise<Community[]> {
    return await db.select().from(communities).orderBy(desc(communities.memberCount));
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const result = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
    return result[0];
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const result = await db.insert(communities).values(insertCommunity).returning();
    return result[0];
  }

  async getCommunityMessages(communityId: string, limit: number = 100): Promise<Array<CommunityMessage & { user: User }>> {
    const result = await db
      .select()
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.userId, users.id))
      .where(eq(communityMessages.communityId, communityId))
      .orderBy(desc(communityMessages.createdAt))
      .limit(limit);
    
    return result.map((r: any) => ({
      ...r.community_messages,
      user: r.users,
    })).reverse(); // Show oldest first
  }

  async sendMessage(insertMessage: InsertCommunityMessage): Promise<CommunityMessage> {
    const result = await db.insert(communityMessages).values(insertMessage).returning();
    
    // Increment message count
    await db.update(communities)
      .set({ memberCount: sql`${communities.memberCount} + 1` })
      .where(eq(communities.id, insertMessage.communityId));
    
    return result[0];
  }

  // Swipe operations
  async recordSwipe(insertSwipe: InsertSwipeAction): Promise<SwipeAction> {
    const result = await db.insert(swipeActions).values(insertSwipe).returning();
    return result[0];
  }

  async getSwipeCandidates(userId: string): Promise<User[]> {
    // Get users that haven't been swiped yet by this user
    const swipedUserIds = await db
      .select({ id: swipeActions.toUserId })
      .from(swipeActions)
      .where(eq(swipeActions.fromUserId, userId));
    
    const swipedIds = swipedUserIds.map((s: any) => s.id);
    
    const candidates = await db
      .select()
      .from(users)
      .where(
        and(
          ne(users.id, userId),
          eq(users.isBanned, false)
        )
      )
      .limit(50);
    
    return candidates.filter((u: any) => !swipedIds.includes(u.id));
  }

  async getMatches(userId: string): Promise<User[]> {
    // Find mutual likes
    const myLikes = await db
      .select({ id: swipeActions.toUserId })
      .from(swipeActions)
      .where(
        and(
          eq(swipeActions.fromUserId, userId),
          eq(swipeActions.action, 'like')
        )
      );
    
    const myLikeIds = myLikes.map((l: any) => l.id);
    
    const theirLikes = await db
      .select()
      .from(swipeActions)
      .innerJoin(users, eq(swipeActions.fromUserId, users.id))
      .where(
        and(
          eq(swipeActions.toUserId, userId),
          eq(swipeActions.action, 'like')
        )
      );
    
    return theirLikes
      .filter((l: any) => myLikeIds.includes(l.swipe_actions.fromUserId))
      .map((l: any) => l.users);
  }

  // Prize operations
  async getAllPrizes(): Promise<Prize[]> {
    return await db.select().from(prizes).where(eq(prizes.isActive, true));
  }

  async createPrize(insertPrize: InsertPrize): Promise<Prize> {
    const result = await db.insert(prizes).values(insertPrize).returning();
    return result[0];
  }

  async updatePrize(id: string, updates: Partial<Prize>): Promise<Prize | undefined> {
    const result = await db.update(prizes).set(updates).where(eq(prizes.id, id)).returning();
    return result[0];
  }

  // Draw operations
  async getAllDraws(): Promise<Draw[]> {
    return await db.select().from(draws).orderBy(desc(draws.drawAt));
  }

  async getDraw(id: string): Promise<Draw | undefined> {
    const result = await db.select().from(draws).where(eq(draws.id, id)).limit(1);
    return result[0];
  }

  async getActiveDraws(): Promise<Draw[]> {
    return await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.isVisible, true),
          sql`${draws.status} IN ('scheduled', 'open')`
        )
      )
      .orderBy(draws.drawAt);
  }

  async getFeaturedDraw(): Promise<Draw | undefined> {
    const result = await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.isVisible, true),
          eq(draws.isFeatured, true),
          sql`${draws.status} IN ('scheduled', 'open')`
        )
      )
      .orderBy(draws.drawAt)
      .limit(1);
    return result[0];
  }

  async createDraw(insertDraw: InsertDraw): Promise<Draw> {
    const result = await db.insert(draws).values(insertDraw).returning();
    return result[0];
  }

  async updateDraw(id: string, updates: Partial<Draw>): Promise<Draw | undefined> {
    const result = await db.update(draws).set(updates).where(eq(draws.id, id)).returning();
    return result[0];
  }

  async overrideDraw(id: string, adminId: string, reason: string, updates: Partial<Draw>): Promise<Draw | undefined> {
    const result = await db
      .update(draws)
      .set({
        ...updates,
        overrideBy: adminId,
        overrideReason: reason,
        overrideAt: new Date(),
      })
      .where(eq(draws.id, id))
      .returning();
    return result[0];
  }

  // Draw entry operations
  async getDrawEntries(drawId: string): Promise<Array<DrawEntry & { user: User }>> {
    const result = await db
      .select()
      .from(drawEntries)
      .innerJoin(users, eq(drawEntries.userId, users.id))
      .where(eq(drawEntries.drawId, drawId))
      .orderBy(desc(drawEntries.createdAt));
    
    return result.map((r: any) => ({
      ...r.draw_entries,
      user: r.users,
    }));
  }

  async getUserDrawEntries(userId: string): Promise<Array<DrawEntry & { draw: Draw }>> {
    const result = await db
      .select()
      .from(drawEntries)
      .innerJoin(draws, eq(drawEntries.drawId, draws.id))
      .where(eq(drawEntries.userId, userId))
      .orderBy(desc(drawEntries.createdAt));
    
    return result.map((r: any) => ({
      ...r.draw_entries,
      draw: r.draws,
    }));
  }

  async createDrawEntry(insertEntry: InsertDrawEntry): Promise<DrawEntry> {
    const result = await db.insert(drawEntries).values(insertEntry).returning();
    return result[0];
  }

  async getEntryCount(drawId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(drawEntries)
      .where(eq(drawEntries.drawId, drawId));
    return Number(result[0]?.count || 0);
  }

  // Draw winner operations
  async getDrawWinners(drawId: string): Promise<Array<DrawWinner & { user: User; prize: Prize }>> {
    const result = await db
      .select()
      .from(drawWinners)
      .innerJoin(users, eq(drawWinners.userId, users.id))
      .innerJoin(prizes, eq(drawWinners.prizeId, prizes.id))
      .where(eq(drawWinners.drawId, drawId))
      .orderBy(desc(drawWinners.awardedAt));
    
    return result.map((r: any) => ({
      ...r.draw_winners,
      user: r.users,
      prize: r.prizes,
    }));
  }

  async getRecentWinners(limit: number = 20): Promise<Array<DrawWinner & { user: User; prize: Prize; draw: Draw }>> {
    const result = await db
      .select()
      .from(drawWinners)
      .innerJoin(users, eq(drawWinners.userId, users.id))
      .innerJoin(prizes, eq(drawWinners.prizeId, prizes.id))
      .innerJoin(draws, eq(drawWinners.drawId, draws.id))
      .orderBy(desc(drawWinners.awardedAt))
      .limit(limit);
    
    return result.map((r: any) => ({
      ...r.draw_winners,
      user: r.users,
      prize: r.prizes,
      draw: r.draws,
    }));
  }

  async createDrawWinner(insertWinner: InsertDrawWinner): Promise<DrawWinner> {
    const result = await db.insert(drawWinners).values(insertWinner).returning();
    return result[0];
  }

  async claimPrize(winnerId: string, userId: string): Promise<DrawWinner | undefined> {
    const result = await db
      .update(drawWinners)
      .set({
        claimStatus: 'claimed',
        claimedAt: new Date(),
      })
      .where(
        and(
          eq(drawWinners.id, winnerId),
          eq(drawWinners.userId, userId),
          eq(drawWinners.claimStatus, 'pending')
        )
      )
      .returning();
    return result[0];
  }

  async selectRandomWinner(drawId: string, prizeId: string): Promise<DrawWinner | undefined> {
    // Get all entries for this draw with ticket weights
    const entries = await db
      .select()
      .from(drawEntries)
      .where(eq(drawEntries.drawId, drawId));
    
    if (entries.length === 0) return undefined;

    // Calculate total tickets
    const totalTickets = entries.reduce((sum: number, e: any) => sum + (e.tickets || 1), 0);
    
    // Random weighted selection
    let random = Math.random() * totalTickets;
    let selectedEntry: any = null;
    
    for (const entry of entries) {
      random -= entry.tickets || 1;
      if (random <= 0) {
        selectedEntry = entry;
        break;
      }
    }
    
    if (!selectedEntry) selectedEntry = entries[0];

    // Create winner record
    const prize = await db.select().from(prizes).where(eq(prizes.id, prizeId)).limit(1);
    
    const winner = await db.insert(drawWinners).values({
      drawId,
      userId: selectedEntry.userId,
      entryId: selectedEntry.id,
      prizeId,
      prizeDetails: prize[0] || {},
      claimExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to claim
    }).returning();

    return winner[0];
  }
}

export const storage = new DbStorage();

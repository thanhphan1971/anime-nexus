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
  type ParentChildLink,
  type InsertParentChildLink,
  type ParentalControls,
  type InsertParentalControls,
  type PurchaseAuthRequest,
  type InsertPurchaseAuthRequest,
  type SiteSetting,
  users,
  posts,
  postLikes,
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
  parentChildLinks,
  parentalControls,
  purchaseAuthRequests,
  siteSettings,
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
  getPostsWithLikeStatus(userId: string, limit?: number): Promise<Array<Post & { user: User; likedByCurrentUser: boolean }>>;
  getUserPosts(userId: string): Promise<Post[]>;
  toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;
  
  // Card operations
  getAllCards(): Promise<Card[]>;
  getActiveCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  archiveCard(id: string): Promise<void>;
  unarchiveCard(id: string): Promise<void>;
  getCardOwnerCount(id: string): Promise<number>;
  getCardsWithOwnerCounts(): Promise<Array<Card & { ownerCount: number }>>;
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
  
  // Parent-child link operations
  createParentChildLink(link: InsertParentChildLink): Promise<ParentChildLink>;
  getParentChildLink(parentId: string, childId: string): Promise<ParentChildLink | undefined>;
  getLinkByVerificationCode(code: string): Promise<ParentChildLink | undefined>;
  getLinkedChildren(parentId: string): Promise<Array<ParentChildLink & { child: User }>>;
  getParentLink(childId: string): Promise<ParentChildLink | undefined>;
  verifyParentChildLink(linkId: string): Promise<ParentChildLink | undefined>;
  revokeParentChildLink(linkId: string): Promise<void>;
  
  // Parental controls operations
  getParentalControls(parentId: string, childId: string): Promise<ParentalControls | undefined>;
  createParentalControls(controls: InsertParentalControls): Promise<ParentalControls>;
  updateParentalControls(parentId: string, childId: string, updates: Partial<ParentalControls>): Promise<ParentalControls | undefined>;
  getControlsForChild(childId: string): Promise<ParentalControls | undefined>;
  
  // Purchase authorization request operations
  createPurchaseAuthRequest(request: InsertPurchaseAuthRequest): Promise<PurchaseAuthRequest>;
  getPendingAuthRequests(parentId: string): Promise<Array<PurchaseAuthRequest & { child: User }>>;
  getAuthRequestById(id: string): Promise<PurchaseAuthRequest | undefined>;
  respondToAuthRequest(id: string, status: 'approved' | 'denied', parentNote?: string): Promise<PurchaseAuthRequest | undefined>;
  getChildPendingRequests(childId: string): Promise<PurchaseAuthRequest[]>;
  
  // Site settings operations
  getSiteSetting(key: string): Promise<string | undefined>;
  setSiteSetting(key: string, value: string, adminId?: string): Promise<void>;
  getAllSiteSettings(): Promise<Array<{ key: string; value: string }>>;
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

  async getPostsWithLikeStatus(userId: string, limit: number = 50): Promise<Array<Post & { user: User; likedByCurrentUser: boolean }>> {
    const allPosts = await db.select().from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    
    // If no posts, return empty array
    if (allPosts.length === 0) {
      return [];
    }
    
    // Get all likes by this user for these posts
    const postIds = allPosts.map(p => p.posts.id);
    
    // Query user likes for these specific posts
    const userLikes = await db.select().from(postLikes)
      .where(and(
        eq(postLikes.userId, userId),
        sql`${postLikes.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`
      ));
    
    const likedPostIds = new Set(userLikes.map(l => l.postId));
    
    return allPosts.map(({ posts: post, users: user }) => ({
      ...post,
      user,
      likedByCurrentUser: likedPostIds.has(post.id)
    }));
  }

  async toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    // Check if user already liked this post
    const existingLike = await db.select().from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    
    if (existingLike.length > 0) {
      // Unlike: remove the like and decrement counter
      await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
      await db.update(posts).set({ likes: sql`GREATEST(${posts.likes} - 1, 0)` }).where(eq(posts.id, postId));
      const updatedPost = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      return { liked: false, likeCount: updatedPost[0]?.likes || 0 };
    } else {
      // Like: add the like and increment counter
      await db.insert(postLikes).values({ postId, userId });
      await db.update(posts).set({ likes: sql`${posts.likes} + 1` }).where(eq(posts.id, postId));
      const updatedPost = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      return { liked: true, likeCount: updatedPost[0]?.likes || 0 };
    }
  }

  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const like = await db.select().from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return like.length > 0;
  }

  // Card operations
  async getAllCards(): Promise<Card[]> {
    return await db.select().from(cards);
  }

  async getActiveCards(): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.isArchived, false));
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

  async archiveCard(id: string): Promise<void> {
    await db.update(cards).set({ isArchived: true }).where(eq(cards.id, id));
  }

  async unarchiveCard(id: string): Promise<void> {
    await db.update(cards).set({ isArchived: false }).where(eq(cards.id, id));
  }

  async getCardOwnerCount(id: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(distinct ${userCards.userId})` })
      .from(userCards)
      .where(eq(userCards.cardId, id));
    return Number(result[0]?.count) || 0;
  }

  async getCardsWithOwnerCounts(): Promise<Array<Card & { ownerCount: number }>> {
    const allCards = await db.select().from(cards);
    const ownerCounts = await db
      .select({
        cardId: userCards.cardId,
        count: sql<number>`count(distinct ${userCards.userId})`,
      })
      .from(userCards)
      .groupBy(userCards.cardId);
    
    const countMap = new Map(ownerCounts.map((oc: any) => [oc.cardId, Number(oc.count)]));
    
    return allCards.map((card: Card) => ({
      ...card,
      ownerCount: countMap.get(card.id) || 0,
    }));
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

  // Parent-child link operations
  async createParentChildLink(link: InsertParentChildLink): Promise<ParentChildLink> {
    const result = await db.insert(parentChildLinks).values(link).returning();
    return result[0];
  }

  async getParentChildLink(parentId: string, childId: string): Promise<ParentChildLink | undefined> {
    const result = await db
      .select()
      .from(parentChildLinks)
      .where(and(
        eq(parentChildLinks.parentId, parentId),
        eq(parentChildLinks.childId, childId)
      ))
      .limit(1);
    return result[0];
  }

  async getLinkByVerificationCode(code: string): Promise<ParentChildLink | undefined> {
    const result = await db
      .select()
      .from(parentChildLinks)
      .where(eq(parentChildLinks.verificationCode, code))
      .limit(1);
    return result[0];
  }

  async getLinkedChildren(parentId: string): Promise<Array<ParentChildLink & { child: User }>> {
    const result = await db
      .select()
      .from(parentChildLinks)
      .innerJoin(users, eq(parentChildLinks.childId, users.id))
      .where(and(
        eq(parentChildLinks.parentId, parentId),
        eq(parentChildLinks.status, 'active')
      ));
    
    return result.map((r: any) => ({
      ...r.parent_child_links,
      child: r.users,
    }));
  }

  async getParentLink(childId: string): Promise<ParentChildLink | undefined> {
    const result = await db
      .select()
      .from(parentChildLinks)
      .where(and(
        eq(parentChildLinks.childId, childId),
        eq(parentChildLinks.status, 'active')
      ))
      .limit(1);
    return result[0];
  }

  async verifyParentChildLink(linkId: string): Promise<ParentChildLink | undefined> {
    const result = await db
      .update(parentChildLinks)
      .set({
        status: 'active',
        verifiedAt: new Date(),
      })
      .where(eq(parentChildLinks.id, linkId))
      .returning();
    return result[0];
  }

  async revokeParentChildLink(linkId: string): Promise<void> {
    await db
      .update(parentChildLinks)
      .set({ status: 'revoked' })
      .where(eq(parentChildLinks.id, linkId));
  }

  // Parental controls operations
  async getParentalControls(parentId: string, childId: string): Promise<ParentalControls | undefined> {
    const result = await db
      .select()
      .from(parentalControls)
      .where(and(
        eq(parentalControls.parentId, parentId),
        eq(parentalControls.childId, childId)
      ))
      .limit(1);
    return result[0];
  }

  async createParentalControls(controls: InsertParentalControls): Promise<ParentalControls> {
    const result = await db.insert(parentalControls).values(controls).returning();
    return result[0];
  }

  async updateParentalControls(parentId: string, childId: string, updates: Partial<ParentalControls>): Promise<ParentalControls | undefined> {
    const result = await db
      .update(parentalControls)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(parentalControls.parentId, parentId),
        eq(parentalControls.childId, childId)
      ))
      .returning();
    return result[0];
  }

  async getControlsForChild(childId: string): Promise<ParentalControls | undefined> {
    const result = await db
      .select()
      .from(parentalControls)
      .where(eq(parentalControls.childId, childId))
      .limit(1);
    return result[0];
  }

  // Purchase authorization request operations
  async createPurchaseAuthRequest(request: InsertPurchaseAuthRequest): Promise<PurchaseAuthRequest> {
    const result = await db.insert(purchaseAuthRequests).values(request).returning();
    return result[0];
  }

  async getPendingAuthRequests(parentId: string): Promise<Array<PurchaseAuthRequest & { child: User }>> {
    const result = await db
      .select()
      .from(purchaseAuthRequests)
      .innerJoin(users, eq(purchaseAuthRequests.childId, users.id))
      .where(and(
        eq(purchaseAuthRequests.parentId, parentId),
        eq(purchaseAuthRequests.status, 'pending')
      ))
      .orderBy(desc(purchaseAuthRequests.createdAt));
    
    return result.map((r: any) => ({
      ...r.purchase_auth_requests,
      child: r.users,
    }));
  }

  async getAuthRequestById(id: string): Promise<PurchaseAuthRequest | undefined> {
    const result = await db
      .select()
      .from(purchaseAuthRequests)
      .where(eq(purchaseAuthRequests.id, id))
      .limit(1);
    return result[0];
  }

  async respondToAuthRequest(id: string, status: 'approved' | 'denied', parentNote?: string): Promise<PurchaseAuthRequest | undefined> {
    const result = await db
      .update(purchaseAuthRequests)
      .set({ 
        status, 
        parentNote: parentNote || null,
        respondedAt: new Date() 
      })
      .where(eq(purchaseAuthRequests.id, id))
      .returning();
    return result[0];
  }

  async getChildPendingRequests(childId: string): Promise<PurchaseAuthRequest[]> {
    return await db
      .select()
      .from(purchaseAuthRequests)
      .where(and(
        eq(purchaseAuthRequests.childId, childId),
        eq(purchaseAuthRequests.status, 'pending')
      ))
      .orderBy(desc(purchaseAuthRequests.createdAt));
  }

  // Site settings operations
  async getSiteSetting(key: string): Promise<string | undefined> {
    const result = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    return result[0]?.value;
  }

  async setSiteSetting(key: string, value: string, adminId?: string): Promise<void> {
    await db
      .insert(siteSettings)
      .values({ key, value, updatedBy: adminId || null })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedBy: adminId || null, updatedAt: new Date() }
      });
  }

  async getAllSiteSettings(): Promise<Array<{ key: string; value: string }>> {
    const result = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings);
    return result;
  }
}

export const storage = new DbStorage();

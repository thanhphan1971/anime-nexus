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
  users,
  posts,
  cards,
  userCards,
  marketListings,
  communities,
  communityMessages,
  swipeActions,
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
}

export const storage = new DbStorage();

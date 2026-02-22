import { 
  type User, 
  type InsertUser,
  type Post,
  type InsertPost,
  type Card,
  type InsertCard,
  type CardCategory,
  type InsertCardCategory,
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
  type PurchaseRequest,
  type InsertPurchaseRequest,
  type TokenPurchase,          // ✅ ADD
  type InsertTokenPurchase,    // ✅ ADD
  type TokenLedger,
  type InsertTokenLedger,
  type ParentNotification,
  type InsertParentNotification,
  type SiteSetting,
  type WatchlistItem,
  type InsertWatchlistItem,
  type AnimeCache,
  type InsertAnimeCache,
  type Story,
  type InsertStory,
  type Media,
  type InsertMedia,
  type GameSession,
  type InsertGameSession,
  type UserDailyGameStats,
  type InsertUserDailyGameStats,
  type GameEvent,
  type InsertGameEvent,
  type GameActivityLog,
  type InsertGameActivityLog,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type InsertUserBadge,
  type AdminAuditLog,
  type InsertAdminAuditLog,
  type SecurityMetricsEvent,
  type InsertSecurityMetricsEvent,
  users,
  posts,
  postLikes,
  cards,
  cardCategories,
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
  purchaseRequests,
  tokenPurchases,   // ✅ ADD THIS
  tokenLedger,
  parentNotifications,
  siteSettings,
  watchlistItems,
  animeCache,
  stories,
  media,
  gameSessions,
  userDailyGameStats,
  gameEvents,
  gameActivityLog,
  badges,
  userBadges,
  adminAuditLog,
  securityMetricsEvents,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, ne, inArray, lte, lt, asc, gt, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseUserId: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithId(id: string, user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserSupabaseId(id: string, supabaseUserId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number): Promise<Array<Post & { user: User }>>;
  getPostsWithLikeStatus(userId: string, limit?: number): Promise<Array<Post & { user: User; likedByCurrentUser: boolean }>>;
  getUserPosts(userId: string): Promise<Post[]>;
  toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;
  countSummonSharesToday(userId: string, today: Date): Promise<number>;
  
  // Card operations
  getAllCards(): Promise<Card[]>;
  getActiveCards(): Promise<Card[]>;
  getStandardBannerCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, updates: Partial<Card>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<void>;
  archiveCard(id: string): Promise<void>;
  unarchiveCard(id: string): Promise<void>;
  getCardOwnerCount(id: string): Promise<number>;
  getCardsWithOwnerCounts(): Promise<Array<Card & { ownerCount: number }>>;
  getUserCards(userId: string): Promise<Array<UserCard & { card: Card }>>;
  addCardToUser(userCard: InsertUserCard): Promise<UserCard>;
  getCatalogCards(options: { page?: number; limit?: number; rarities?: string[]; sortOrder?: 'newest' | 'oldest' }): Promise<{ cards: Card[]; total: number; page: number; totalPages: number }>;
  
  // Card scheduling operations
  getScheduledCards(): Promise<Card[]>;
  getCardsForPool(pool: string): Promise<Card[]>;
  activateScheduledCards(): Promise<number>;
  getCardsByStatus(status: string): Promise<Card[]>;
  updateCardStatus(id: string, status: string, scheduledReleaseDate?: Date | null): Promise<Card | undefined>;
  
  // Card category operations
  getAllCardCategories(): Promise<CardCategory[]>;
  getCardCategory(id: string): Promise<CardCategory | undefined>;
  createCardCategory(category: InsertCardCategory): Promise<CardCategory>;
  updateCardCategory(id: string, updates: Partial<CardCategory>): Promise<CardCategory | undefined>;
  deleteCardCategory(id: string): Promise<void>;
  
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
  getNextDrawByCadence(cadence: string): Promise<Draw | undefined>;
  getLastExecutedDrawByCadence(cadence: string): Promise<Draw | undefined>;
  getDrawByCycleId(cycleId: string): Promise<Draw | undefined>;
  createDraw(draw: InsertDraw): Promise<Draw>;
  updateDraw(id: string, updates: Partial<Draw>): Promise<Draw | undefined>;
  overrideDraw(id: string, adminId: string, reason: string, updates: Partial<Draw>): Promise<Draw | undefined>;
  getPreviousExecutedDraw(cadence: string, currentDrawAt: Date): Promise<Draw | undefined>;
  
  // Draw entry operations
  getDrawEntries(drawId: string): Promise<Array<DrawEntry & { user: User }>>;
  getUserDrawEntries(userId: string): Promise<Array<DrawEntry & { draw: Draw }>>;
  getUserEntryForDraw(userId: string, drawId: string): Promise<DrawEntry | undefined>;
  createDrawEntry(entry: InsertDrawEntry): Promise<DrawEntry>;
  updateDrawEntry(entryId: string, updates: Partial<DrawEntry>): Promise<DrawEntry | undefined>;
  getEntryCount(drawId: string): Promise<number>;
  getUserWinsInPeriod(userId: string, cadence: string): Promise<number>;
  
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
  
  // Purchase request operations
  createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest>;
  getPendingPurchaseRequests(parentId: string): Promise<Array<PurchaseRequest & { child: User }>>;
  getPurchaseRequestById(id: string): Promise<PurchaseRequest | undefined>;
  getPurchaseRequestByStripeSessionId(sessionId: string): Promise<PurchaseRequest | undefined>;
  rejectPurchaseRequest(id: string): Promise<PurchaseRequest | undefined>;
  approvePurchaseRequest(id: string, stripeSessionId: string): Promise<PurchaseRequest | undefined>;
  cancelPurchaseCheckout(id: string): Promise<PurchaseRequest | undefined>;
  markPurchasePaid(id: string, stripePaymentIntentId: string): Promise<PurchaseRequest | undefined>;
  fulfillPurchaseRequest(id: string): Promise<PurchaseRequest | undefined>;
  getChildPendingPurchaseRequests(childId: string): Promise<PurchaseRequest[]>;
  expirePurchaseRequest(id: string): Promise<PurchaseRequest | undefined>;
  markPurchaseExpiredAfterPayment(id: string, stripePaymentIntentId: string): Promise<PurchaseRequest | undefined>;
  expireOldPurchaseRequests(): Promise<number>;
  getChildDailySpend(childId: string): Promise<number>;
  getChildMonthlySpend(childId: string): Promise<number>;
  
  // Token ledger operations
  createTokenLedgerEntry(entry: InsertTokenLedger): Promise<TokenLedger>;
  getTokenLedgerByPurchaseRequest(purchaseRequestId: string): Promise<TokenLedger | undefined>;
  
  // Admin audit log operations
  createAdminAuditLog(entry: InsertAdminAuditLog): Promise<AdminAuditLog>;
  
  // Security metrics operations
  logSecurityEvent(event: InsertSecurityMetricsEvent): Promise<void>;
  getSecurityMetricsBlocked(days: number): Promise<{ series: Array<{ day: string; eventType: string; reason: string; count: number }>; totalsByReason: Array<{ eventType: string; reason: string; count: number }> }>;
  getSecurityMetricsOverview(days: number): Promise<{ totalRequestCreated: number; totalApprovalStarted: number; totalWebhookCredited: number; totalBlockedByType: Record<string, number>; topReasons: Array<{ eventType: string; reason: string; count: number }> }>;
  
  // Admin purchase request operations
  getPurchaseRequestsWithExceptions(status: string, limit: number): Promise<Array<PurchaseRequest & { child: User; parent: User; hasLedgerEntry: boolean }>>;
  grantTokensForExpiredPayment(id: string, adminId: string): Promise<PurchaseRequest | undefined>;
  markPurchaseResolved(id: string, adminId: string): Promise<PurchaseRequest | undefined>;
  
  // Parent notification operations
  createParentNotification(notification: InsertParentNotification): Promise<ParentNotification>;
  getParentNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<ParentNotification[]>;
  markNotificationsRead(notificationIds: string[]): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  getPendingPurchaseRequestCount(parentId: string): Promise<number>;
  
  // Site settings operations
  getSiteSetting(key: string): Promise<string | undefined>;
  setSiteSetting(key: string, value: string, adminId?: string): Promise<void>;
  getAllSiteSettings(): Promise<Array<{ key: string; value: string }>>;
  
  // Watchlist operations
  getUserWatchlist(userId: string): Promise<WatchlistItem[]>;
  getWatchlistItem(id: string): Promise<WatchlistItem | undefined>;
  getWatchlistItemByAnime(userId: string, anilistId: number): Promise<WatchlistItem | undefined>;
  createWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Promise<WatchlistItem | undefined>;
  deleteWatchlistItem(id: string): Promise<void>;
  
  // Anime cache operations
  getCachedAnime(anilistId: number): Promise<AnimeCache | undefined>;
  setCachedAnime(anilistId: number, payload: any): Promise<void>;
  getCachedAnimeMultiple(anilistIds: number[]): Promise<AnimeCache[]>;
  
  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getActiveStories(): Promise<Array<Story & { user: User }>>;
  getUserStories(userId: string): Promise<Story[]>;
  getUserStoryCountIn24h(userId: string): Promise<number>;
  deleteStory(id: string): Promise<void>;
  
  // Media operations
  createMedia(mediaData: InsertMedia): Promise<Media>;
  getMedia(id: string): Promise<Media | undefined>;
  getMediaByObjectKey(objectKey: string): Promise<Media | undefined>;
  deleteMedia(id: string): Promise<void>;
  getExpiredMedia(): Promise<Media[]>;
  
  // Game Session operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  getActiveSessionForUser(userId: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  getUserGameSessions(userId: string, limit?: number): Promise<GameSession[]>;
  claimGameReward(sessionId: string, userId: string, tokensToGrant: number): Promise<{ success: boolean; newBalance: number }>;
  
  // User Daily Game Stats operations
  getUserDailyGameStats(userId: string, date: string): Promise<UserDailyGameStats | undefined>;
  createOrUpdateUserDailyGameStats(userId: string, date: string, updates: Partial<UserDailyGameStats>): Promise<UserDailyGameStats>;
  
  // Game Event operations (scaffold)
  getUpcomingGameEvents(limit?: number): Promise<GameEvent[]>;
  getLiveGameEvents(): Promise<GameEvent[]>;
  getGameEvent(id: string): Promise<GameEvent | undefined>;
  createGameEvent(event: InsertGameEvent): Promise<GameEvent>;
  updateGameEvent(id: string, updates: Partial<GameEvent>): Promise<GameEvent | undefined>;
  
  // Game Activity Log operations
  logGameActivity(log: InsertGameActivityLog): Promise<GameActivityLog>;
  getUserGameActivityLogs(userId: string, limit?: number): Promise<GameActivityLog[]>;
  getGameActivityLogsForDate(userId: string, date: string): Promise<GameActivityLog[]>;
  
  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getBadgeByCode(code: string): Promise<Badge | undefined>;
  getUserBadges(userId: string): Promise<Array<UserBadge & { badge: Badge }>>;
  hasUserBadge(userId: string, badgeCode: string): Promise<boolean>;
  grantBadge(userId: string, badgeCode: string, grantedBy: string, reason?: string): Promise<UserBadge | undefined>;
  revokeBadge(userId: string, badgeCode: string): Promise<void>;
  getUserUniqueCardCount(userId: string): Promise<number>;
  checkAndGrantCollectionMilestones(userId: string): Promise<string[]>;
  
  // Social proof
  getTrendingCards(limit?: number): Promise<any[]>;
  getTopCollectors(limit?: number): Promise<any[]>;
  
  // Onboarding operations
  getOnboardingStatus(userId: string): Promise<{ completed: boolean; firstSummonAt: Date | null; firstShareAt: Date | null }>;
  markFirstSummon(userId: string): Promise<void>;
  markFirstShare(userId: string): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
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
    // Case-insensitive lookup - normalize to lowercase
    const normalizedHandle = handle.toLowerCase();
    const result = await db.select().from(users).where(sql`LOWER(${users.handle}) = ${normalizedHandle}`).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserBySupabaseId(supabaseUserId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId)).limit(1);
    return result[0];
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createUserWithId(id: string, insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({ ...insertUser, id }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUserSupabaseId(id: string, supabaseUserId: string): Promise<User | undefined> {
    const result = await db.update(users).set({ supabaseUserId }).where(eq(users.id, id)).returning();
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

  async countSummonSharesToday(userId: string, today: Date): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(
        eq(posts.userId, userId),
        eq(posts.postType, 'summon'),
        sql`${posts.createdAt} >= ${today}`
      ));
    return result[0]?.count || 0;
  }

  // Card operations
  async getAllCards(): Promise<Card[]> {
    return await db.select().from(cards);
  }

  async getActiveCards(): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.isArchived, false));
  }

  async getStandardBannerCards(): Promise<Card[]> {
    return await db.select().from(cards).where(
      and(
        eq(cards.isArchived, false),
        eq(cards.isStandard, true),
        eq(cards.isEventLimited, false),
        eq(cards.isPremiumOnly, false),
        eq(cards.status, 'active')
      )
    );
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

  async getCatalogCards(options: { page?: number; limit?: number; rarities?: string[]; sortOrder?: 'newest' | 'oldest' }): Promise<{ cards: Card[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortOrder = options.sortOrder || 'newest';
    
    // Build conditions: only released, non-archived cards
    let conditions = and(eq(cards.isReleased, true), eq(cards.isArchived, false));
    
    // Filter by rarities if provided - using parameterized inArray for safety
    if (options.rarities && options.rarities.length > 0) {
      conditions = and(conditions, inArray(cards.rarity, options.rarities));
    }
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(conditions);
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated cards
    const orderBy = sortOrder === 'newest' ? desc(cards.createdAt) : cards.createdAt;
    const result = await db
      .select()
      .from(cards)
      .where(conditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    return {
      cards: result,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card | undefined> {
    const result = await db.update(cards).set(updates).where(eq(cards.id, id)).returning();
    return result[0];
  }

  // Card scheduling operations
  async getScheduledCards(): Promise<Card[]> {
    return await db.select().from(cards)
      .where(eq(cards.status, 'scheduled'))
      .orderBy(asc(cards.scheduledReleaseDate));
  }

  async getCardsForPool(pool: string): Promise<Card[]> {
    return await db.select().from(cards)
      .where(and(
        eq(cards.status, 'active'),
        eq(cards.isArchived, false),
        sql`${pool} = ANY(${cards.obtainableFrom})`
      ));
  }

  async activateScheduledCards(): Promise<number> {
    const now = new Date();
    const result = await db.update(cards)
      .set({ status: 'active', isReleased: true })
      .where(and(
        eq(cards.status, 'scheduled'),
        lte(cards.scheduledReleaseDate, now)
      ))
      .returning();
    return result.length;
  }

  async getCardsByStatus(status: string): Promise<Card[]> {
    return await db.select().from(cards)
      .where(eq(cards.status, status))
      .orderBy(desc(cards.createdAt));
  }

  async updateCardStatus(id: string, status: string, scheduledReleaseDate?: Date | null): Promise<Card | undefined> {
    const updates: Partial<Card> = { status };
    if (scheduledReleaseDate !== undefined) {
      updates.scheduledReleaseDate = scheduledReleaseDate;
    }
    if (status === 'active') {
      updates.isReleased = true;
    } else if (status === 'draft' || status === 'scheduled') {
      updates.isReleased = false;
    }
    const result = await db.update(cards).set(updates).where(eq(cards.id, id)).returning();
    return result[0];
  }

  // Card category operations
  async getAllCardCategories(): Promise<CardCategory[]> {
    return await db.select().from(cardCategories).orderBy(cardCategories.sortOrder);
  }

  async getCardCategory(id: string): Promise<CardCategory | undefined> {
    const result = await db.select().from(cardCategories).where(eq(cardCategories.id, id)).limit(1);
    return result[0];
  }

  async createCardCategory(category: InsertCardCategory): Promise<CardCategory> {
    const result = await db.insert(cardCategories).values(category).returning();
    return result[0];
  }

  async updateCardCategory(id: string, updates: Partial<CardCategory>): Promise<CardCategory | undefined> {
    const result = await db.update(cardCategories).set(updates).where(eq(cardCategories.id, id)).returning();
    return result[0];
  }

  async deleteCardCategory(id: string): Promise<void> {
    await db.delete(cardCategories).where(eq(cardCategories.id, id));
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

  async getNextDrawByCadence(cadence: string): Promise<Draw | undefined> {
    const result = await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.cadence, cadence),
          eq(draws.isVisible, true),
          sql`${draws.status} IN ('scheduled', 'open')`,
          sql`${draws.drawAt} > NOW()`
        )
      )
      .orderBy(draws.drawAt)
      .limit(1);
    return result[0];
  }

  async getLastExecutedDrawByCadence(cadence: string): Promise<Draw | undefined> {
    const result = await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.cadence, cadence),
          sql`${draws.status} IN ('executed', 'completed')`
        )
      )
      .orderBy(desc(draws.drawAt))
      .limit(1);
    return result[0];
  }

  async getDrawByCycleId(cycleId: string): Promise<Draw | undefined> {
    const result = await db
      .select()
      .from(draws)
      .where(eq(draws.cycleId, cycleId))
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

  async getPreviousExecutedDraw(cadence: string, currentDrawAt: Date): Promise<Draw | undefined> {
    const result = await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.cadence, cadence),
          sql`${draws.status} IN ('executed', 'completed')`,
          lt(draws.drawAt, currentDrawAt)
        )
      )
      .orderBy(desc(draws.drawAt))
      .limit(1);
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

  async updateDrawEntry(entryId: string, updates: Partial<DrawEntry>): Promise<DrawEntry | undefined> {
    const result = await db.update(drawEntries).set(updates).where(eq(drawEntries.id, entryId)).returning();
    return result[0];
  }

  async getEntryCount(drawId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(drawEntries)
      .where(eq(drawEntries.drawId, drawId));
    return Number(result[0]?.count || 0);
  }

  async getUserEntryForDraw(userId: string, drawId: string): Promise<DrawEntry | undefined> {
    const result = await db
      .select()
      .from(drawEntries)
      .where(and(eq(drawEntries.userId, userId), eq(drawEntries.drawId, drawId)))
      .limit(1);
    return result[0];
  }

  async getUserWinsInPeriod(userId: string, cadence: string): Promise<number> {
    let startDate: Date;
    const now = new Date();
    
    if (cadence === 'weekly') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (cadence === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      return 0;
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(drawWinners)
      .innerJoin(draws, eq(drawWinners.drawId, draws.id))
      .where(
        and(
          eq(drawWinners.userId, userId),
          eq(draws.cadence, cadence),
          sql`${drawWinners.awardedAt} >= ${startDate}`
        )
      );
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

  // Purchase request operations
  async createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest> {
    const result = await db.insert(purchaseRequests).values(request).returning();
    return result[0];
  }

  async getPendingPurchaseRequests(parentId: string): Promise<Array<PurchaseRequest & { child: User }>> {
    const result = await db
      .select()
      .from(purchaseRequests)
      .innerJoin(users, eq(purchaseRequests.childUserId, users.id))
      .where(and(
        eq(purchaseRequests.parentUserId, parentId),
        inArray(purchaseRequests.status, ['PENDING_PARENT', 'CHECKOUT_CREATED'])
      ))
      .orderBy(desc(purchaseRequests.requestedAt));
    
    return result.map((r: any) => ({
      ...r.purchase_requests,
      child: r.users,
    }));
  }

  async getPurchaseRequestById(id: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);
    return result[0];
  }

  async rejectPurchaseRequest(id: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'REJECTED', 
        deniedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }

  async getChildPendingPurchaseRequests(childId: string): Promise<PurchaseRequest[]> {
    return await db
      .select()
      .from(purchaseRequests)
      .where(and(
        eq(purchaseRequests.childUserId, childId),
        inArray(purchaseRequests.status, ['PENDING_PARENT', 'CHECKOUT_CREATED', 'PAID'])
      ))
      .orderBy(desc(purchaseRequests.requestedAt));
  }

  async getPurchaseRequestByStripeSessionId(sessionId: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.stripeCheckoutSessionId, sessionId))
      .limit(1);
    return result[0];
  }

  async approvePurchaseRequest(id: string, stripeSessionId: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        stripeCheckoutSessionId: stripeSessionId,
        status: 'CHECKOUT_CREATED',
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }

  async cancelPurchaseCheckout(id: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'PENDING_PARENT',
        stripeCheckoutSessionId: null,
        approvedAt: null,
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }

  async markPurchasePaid(id: string, stripePaymentIntentId: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        stripePaymentIntentId,
        status: 'PAID',
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }

  async fulfillPurchaseRequest(id: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'FULFILLED',
        fulfilledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }
  
  async expirePurchaseRequest(id: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'EXPIRED',
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }
  
  async markPurchaseExpiredAfterPayment(id: string, stripePaymentIntentId: string): Promise<PurchaseRequest | undefined> {
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'EXPIRED_AFTER_PAYMENT',
        stripePaymentIntentId,
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    return result[0];
  }
  
  async expireOldPurchaseRequests(): Promise<number> {
    // Expire requests still pending parent approval
    const pendingResult = await db
      .update(purchaseRequests)
      .set({ 
        status: 'EXPIRED',
        updatedAt: new Date()
      })
      .where(and(
        eq(purchaseRequests.status, 'PENDING_PARENT'),
        sql`${purchaseRequests.expiresAt} < NOW()`
      ))
      .returning();
    
    // Also expire checkout sessions that were never completed
    const checkoutResult = await db
      .update(purchaseRequests)
      .set({ 
        status: 'EXPIRED',
        updatedAt: new Date()
      })
      .where(and(
        eq(purchaseRequests.status, 'CHECKOUT_CREATED'),
        sql`${purchaseRequests.expiresAt} < NOW()`
      ))
      .returning();
    
    return pendingResult.length + checkoutResult.length;
  }
  
  async getChildDailySpend(childId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseRequests.unitAmountCents}), 0)` })
      .from(purchaseRequests)
      .where(and(
        eq(purchaseRequests.childUserId, childId),
        eq(purchaseRequests.status, 'FULFILLED'),
        sql`${purchaseRequests.fulfilledAt} >= ${today}`
      ));
    
    return Number(result[0]?.total || 0);
  }
  
  async getChildMonthlySpend(childId: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseRequests.unitAmountCents}), 0)` })
      .from(purchaseRequests)
      .where(and(
        eq(purchaseRequests.childUserId, childId),
        eq(purchaseRequests.status, 'FULFILLED'),
        sql`${purchaseRequests.fulfilledAt} >= ${firstDayOfMonth}`
      ));
    
    return Number(result[0]?.total || 0);
  }

  // Token ledger operations
  async createTokenLedgerEntry(entry: InsertTokenLedger): Promise<TokenLedger> {
    const result = await db.insert(tokenLedger).values(entry).returning();
    return result[0];
  }

  async getTokenLedgerByPurchaseRequest(purchaseRequestId: string): Promise<TokenLedger | undefined> {
    const result = await db
      .select()
      .from(tokenLedger)
      .where(eq(tokenLedger.purchaseRequestId, purchaseRequestId))
      .limit(1);
    return result[0];
  }
  
  // Admin audit log operations
  async createAdminAuditLog(entry: InsertAdminAuditLog): Promise<AdminAuditLog> {
    const result = await db.insert(adminAuditLog).values(entry).returning();
    return result[0];
  }
  
  // Security metrics operations - non-throwing for safety
  async logSecurityEvent(event: InsertSecurityMetricsEvent): Promise<void> {
    try {
      await db.insert(securityMetricsEvents).values(event);
    } catch (error) {
      console.error('[SecurityMetrics] Failed to log event:', event.eventType, event.reason, error);
    }
  }
  
  async getSecurityMetricsBlocked(days: number): Promise<{ series: Array<{ day: string; eventType: string; reason: string; count: number }>; totalsByReason: Array<{ eventType: string; reason: string; count: number }> }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const blockedTypes = ['REQUEST_BLOCKED', 'APPROVAL_BLOCKED', 'WEBHOOK_BLOCKED'];
    
    const series = await db
      .select({
        day: sql<string>`DATE(${securityMetricsEvents.createdAt})::text`,
        eventType: securityMetricsEvents.eventType,
        reason: securityMetricsEvents.reason,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(securityMetricsEvents)
      .where(and(
        inArray(securityMetricsEvents.eventType, blockedTypes),
        sql`${securityMetricsEvents.createdAt} >= ${startDate}`
      ))
      .groupBy(sql`DATE(${securityMetricsEvents.createdAt})`, securityMetricsEvents.eventType, securityMetricsEvents.reason)
      .orderBy(sql`DATE(${securityMetricsEvents.createdAt})` as any);
    
    const totalsByReason = await db
      .select({
        eventType: securityMetricsEvents.eventType,
        reason: securityMetricsEvents.reason,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(securityMetricsEvents)
      .where(and(
        inArray(securityMetricsEvents.eventType, blockedTypes),
        sql`${securityMetricsEvents.createdAt} >= ${startDate}`
      ))
      .groupBy(securityMetricsEvents.eventType, securityMetricsEvents.reason)
      .orderBy(desc(sql`COUNT(*)`));
    
    return { series, totalsByReason };
  }
  
  async getSecurityMetricsOverview(days: number): Promise<{ totalRequestCreated: number; totalApprovalStarted: number; totalWebhookCredited: number; totalBlockedByType: Record<string, number>; topReasons: Array<{ eventType: string; reason: string; count: number }> }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const counts = await db
      .select({
        eventType: securityMetricsEvents.eventType,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(securityMetricsEvents)
      .where(sql`${securityMetricsEvents.createdAt} >= ${startDate}`)
      .groupBy(securityMetricsEvents.eventType);
    
    const countMap: Record<string, number> = {};
    for (const row of counts) {
      countMap[row.eventType] = row.count;
    }
    
    const blockedTypes = ['REQUEST_BLOCKED', 'APPROVAL_BLOCKED', 'WEBHOOK_BLOCKED'];
    const totalBlockedByType: Record<string, number> = {};
    for (const t of blockedTypes) {
      totalBlockedByType[t] = countMap[t] || 0;
    }
    
    const topReasons = await db
      .select({
        eventType: securityMetricsEvents.eventType,
        reason: securityMetricsEvents.reason,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(securityMetricsEvents)
      .where(and(
        inArray(securityMetricsEvents.eventType, blockedTypes),
        sql`${securityMetricsEvents.createdAt} >= ${startDate}`
      ))
      .groupBy(securityMetricsEvents.eventType, securityMetricsEvents.reason)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);
    
    return {
      totalRequestCreated: countMap['REQUEST_CREATED'] || 0,
      totalApprovalStarted: countMap['APPROVAL_STARTED'] || 0,
      totalWebhookCredited: countMap['WEBHOOK_CREDITED'] || 0,
      totalBlockedByType,
      topReasons,
    };
  }
  
  // Admin purchase request operations
  async getPurchaseRequestsWithExceptions(status: string, limit: number): Promise<Array<PurchaseRequest & { child: User; parent: User; hasLedgerEntry: boolean }>> {
    const requests = await db
      .select()
      .from(purchaseRequests)
      .leftJoin(users, eq(purchaseRequests.childUserId, users.id))
      .where(eq(purchaseRequests.status, status))
      .orderBy(desc(purchaseRequests.createdAt))
      .limit(limit);
    
    const results: Array<PurchaseRequest & { child: User; parent: User; hasLedgerEntry: boolean }> = [];
    
    for (const row of requests) {
      if (!row.purchase_requests || !row.users) continue;
      
      const parent = await this.getUser(row.purchase_requests.parentUserId);
      if (!parent) continue;
      
      const ledgerEntry = await this.getTokenLedgerByPurchaseRequest(row.purchase_requests.id);
      
      results.push({
        ...row.purchase_requests,
        child: row.users,
        parent,
        hasLedgerEntry: !!ledgerEntry,
      });
    }
    
    return results;
  }
  
  async grantTokensForExpiredPayment(id: string, adminId: string): Promise<PurchaseRequest | undefined> {
  const request = await this.getPurchaseRequestById(id);
  if (!request || request.status !== "EXPIRED_AFTER_PAYMENT") {
    return undefined;
  }

  // Idempotent: if already granted via ledger, do nothing
  const existingLedger = await this.getTokenLedgerByPurchaseRequest(id);
  if (existingLedger) {
    return request;
  }

  const child = await this.getUser(request.childUserId);
  if (!child) return undefined;

  const tokensToGrant = request.totalTokens;

  // Stripe / payment info (may be null for admin/manual cases)
  const stripeSessionId = request.stripeCheckoutSessionId ?? null;
  const stripePaymentId = request.stripePaymentIntentId ?? null;
  const currency = request.currency ?? "usd";
  const amountPaid = request.unitAmountCents ?? 0;

  // 1) Insert into token_purchases (for revenue + attribution)
  if (stripeSessionId) {
    await db
      .insert(tokenPurchases)
      .values({
        userId: request.childUserId,
        packageId: null,
        tokenAmount: tokensToGrant,
        amountPaid,
        currency,
        stripePaymentId,
        stripeSessionId,
        status: "succeeded",
        isMinorPurchase: !!child.isMinor,
        parentNotified: false,
        createdAt: new Date(),
        completedAt: new Date(),
      })
      .onConflictDoNothing({ target: tokenPurchases.stripeSessionId });
  } else {
    // No Stripe session — still create a synthetic purchase row
    await db.insert(tokenPurchases).values({
      userId: request.childUserId,
      packageId: null,
      tokenAmount: tokensToGrant,
      amountPaid: 0,
      currency,
      stripePaymentId: null,
      stripeSessionId: null,
      status: "succeeded",
      isMinorPurchase: !!child.isMinor,
      parentNotified: false,
      createdAt: new Date(),
      completedAt: new Date(),
    });
  }

  // 2) Credit tokens
  await this.updateUser(request.childUserId, {
    tokens: child.tokens + tokensToGrant,
  });

  // 3) Token ledger (your existing audit trail)
  await this.createTokenLedgerEntry({
    userId: request.childUserId,
    source: "ADMIN_GRANT_EXPIRED_AFTER_PAYMENT",
    purchaseRequestId: id,
    deltaTokens: tokensToGrant,
  });

  // 4) Update purchase request status
  const result = await db
    .update(purchaseRequests)
    .set({
      status: "PAID_ADMIN_GRANTED",
      fulfilledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(purchaseRequests.id, id))
    .returning();

  // 5) Admin audit log
  await this.createAdminAuditLog({
    adminId,
    action: "GRANT_TOKENS",
    targetType: "purchase_request",
    targetId: id,
    details: {
      previousStatus: request.status,
      newStatus: "PAID_ADMIN_GRANTED",
      tokensGranted: tokensToGrant,
      childId: request.childUserId,
      parentId: request.parentUserId,
      stripeSessionId,
      stripePaymentId,
    },
  });

  return result[0];
}
  
  async markPurchaseResolved(id: string, adminId: string): Promise<PurchaseRequest | undefined> {
    const request = await this.getPurchaseRequestById(id);
    if (!request || request.status !== 'EXPIRED_AFTER_PAYMENT') {
      return undefined;
    }
    
    const result = await db
      .update(purchaseRequests)
      .set({ 
        status: 'RESOLVED_NO_GRANT',
        updatedAt: new Date()
      })
      .where(eq(purchaseRequests.id, id))
      .returning();
    
    // Audit log
    await this.createAdminAuditLog({
      adminId,
      action: 'MARK_RESOLVED',
      targetType: 'purchase_request',
      targetId: id,
      details: {
        previousStatus: request.status,
        newStatus: 'RESOLVED_NO_GRANT',
        childId: request.childUserId,
        parentId: request.parentUserId,
      },
    });
    
    return result[0];
  }

  // Parent notification operations
  async createParentNotification(notification: InsertParentNotification): Promise<ParentNotification> {
    const result = await db.insert(parentNotifications).values(notification).returning();
    return result[0];
  }

  async getParentNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<ParentNotification[]> {
    const limit = options?.limit || 50;
    
    if (options?.unreadOnly) {
      return await db
        .select()
        .from(parentNotifications)
        .where(and(
          eq(parentNotifications.userId, userId),
          isNull(parentNotifications.readAt)
        ))
        .orderBy(desc(parentNotifications.createdAt))
        .limit(limit);
    }
    
    return await db
      .select()
      .from(parentNotifications)
      .where(eq(parentNotifications.userId, userId))
      .orderBy(desc(parentNotifications.createdAt))
      .limit(limit);
  }

  async markNotificationsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    await db
      .update(parentNotifications)
      .set({ readAt: new Date() })
      .where(inArray(parentNotifications.id, notificationIds));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(parentNotifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(parentNotifications.userId, userId),
        isNull(parentNotifications.readAt)
      ));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(parentNotifications)
      .where(and(
        eq(parentNotifications.userId, userId),
        isNull(parentNotifications.readAt)
      ));
    return Number(result[0]?.count || 0);
  }

  async getPendingPurchaseRequestCount(parentId: string): Promise<number> {
    const now = new Date();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseRequests)
      .where(and(
        eq(purchaseRequests.parentUserId, parentId),
        eq(purchaseRequests.status, 'PENDING_PARENT'),
        gt(purchaseRequests.expiresAt, now)
      ));
    return Number(result[0]?.count || 0);
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

  // Watchlist operations
  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    return await db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, userId))
      .orderBy(desc(watchlistItems.updatedAt));
  }

  async getWatchlistItem(id: string): Promise<WatchlistItem | undefined> {
    const result = await db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.id, id))
      .limit(1);
    return result[0];
  }

  async getWatchlistItemByAnime(userId: string, anilistId: number): Promise<WatchlistItem | undefined> {
    const result = await db
      .select()
      .from(watchlistItems)
      .where(and(
        eq(watchlistItems.userId, userId),
        eq(watchlistItems.anilistId, anilistId)
      ))
      .limit(1);
    return result[0];
  }

  async createWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const result = await db.insert(watchlistItems).values(item).returning();
    return result[0];
  }

  async updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Promise<WatchlistItem | undefined> {
    const result = await db
      .update(watchlistItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(watchlistItems.id, id))
      .returning();
    return result[0];
  }

  async deleteWatchlistItem(id: string): Promise<void> {
    await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
  }

  // Anime cache operations
  async getCachedAnime(anilistId: number): Promise<AnimeCache | undefined> {
    const result = await db
      .select()
      .from(animeCache)
      .where(eq(animeCache.anilistId, anilistId))
      .limit(1);
    return result[0];
  }

  async setCachedAnime(anilistId: number, payload: any): Promise<void> {
    await db
      .insert(animeCache)
      .values({ anilistId, payload })
      .onConflictDoUpdate({
        target: animeCache.anilistId,
        set: { payload, cachedAt: new Date() }
      });
  }

  async getCachedAnimeMultiple(anilistIds: number[]): Promise<AnimeCache[]> {
    if (anilistIds.length === 0) return [];
    return await db
      .select()
      .from(animeCache)
      .where(inArray(animeCache.anilistId, anilistIds));
  }

  // Story operations
  async createStory(story: InsertStory): Promise<Story> {
    const result = await db.insert(stories).values(story).returning();
    return result[0];
  }

  async getActiveStories(): Promise<Array<Story & { user: User }>> {
    const now = new Date();
    const result = await db
      .select()
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(sql`${stories.expiresAt} > ${now}`)
      .orderBy(desc(stories.createdAt));
    
    return result.map((r: any) => ({
      ...r.stories,
      user: r.users,
    }));
  }

  async getUserStories(userId: string): Promise<Story[]> {
    const now = new Date();
    return await db
      .select()
      .from(stories)
      .where(and(
        eq(stories.userId, userId),
        sql`${stories.expiresAt} > ${now}`
      ))
      .orderBy(desc(stories.createdAt));
  }

  async getUserStoryCountIn24h(userId: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(stories)
      .where(and(
        eq(stories.userId, userId),
        sql`${stories.createdAt} > ${twentyFourHoursAgo}`
      ));
    return Number(result[0]?.count) || 0;
  }

  async deleteStory(id: string): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  // Media operations
  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const result = await db.insert(media).values(mediaData).returning();
    return result[0];
  }

  async getMedia(id: string): Promise<Media | undefined> {
    const result = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return result[0];
  }

  async getMediaByObjectKey(objectKey: string): Promise<Media | undefined> {
    const result = await db.select().from(media).where(eq(media.objectKey, objectKey)).limit(1);
    return result[0];
  }

  async deleteMedia(id: string): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }

  async getExpiredMedia(): Promise<Media[]> {
    const now = new Date();
    return await db
      .select()
      .from(media)
      .where(sql`${media.expiresAt} IS NOT NULL AND ${media.expiresAt} < ${now}`);
  }

  // Game Session operations
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const result = await db.insert(gameSessions).values(session).returning();
    return result[0];
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const result = await db.select().from(gameSessions).where(eq(gameSessions.id, id)).limit(1);
    return result[0];
  }

  async getActiveSessionForUser(userId: string): Promise<GameSession | undefined> {
    // First, auto-expire any sessions that have passed their expiration time
    await db
      .update(gameSessions)
      .set({ status: 'expired', outcome: 'failure', completedAt: new Date() })
      .where(and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.status, 'active'),
        lt(gameSessions.expiresAt, new Date())
      ));
    
    // Now get the truly active session
    const result = await db
      .select()
      .from(gameSessions)
      .where(and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.status, 'active')
      ))
      .orderBy(desc(gameSessions.startedAt))
      .limit(1);
    return result[0];
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const result = await db.update(gameSessions).set(updates).where(eq(gameSessions.id, id)).returning();
    return result[0];
  }

  async getUserGameSessions(userId: string, limit: number = 20): Promise<GameSession[]> {
    return await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.startedAt))
      .limit(limit);
  }

  // Atomic claim with optimistic locking to prevent race conditions
  async claimGameReward(sessionId: string, userId: string, tokensToGrant: number): Promise<{ success: boolean; newBalance: number }> {
    // Use a conditional update to atomically mark as claimed
    // Only succeeds if rewardClaimed is still false
    const updateResult = await db
      .update(gameSessions)
      .set({ 
        rewardClaimed: true, 
        rewardClaimedAt: new Date() 
      })
      .where(and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.rewardClaimed, false)
      ))
      .returning();
    
    // If no rows updated, claim was already made (race condition handled)
    if (updateResult.length === 0) {
      const user = await this.getUser(userId);
      return { success: false, newBalance: user?.tokens || 0 };
    }
    
    // Grant tokens atomically using SQL increment
    const userResult = await db
      .update(users)
      .set({ 
        tokens: sql`${users.tokens} + ${tokensToGrant}` 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { 
      success: true, 
      newBalance: userResult[0]?.tokens || 0 
    };
  }

  // User Daily Game Stats operations
  async getUserDailyGameStats(userId: string, date: string): Promise<UserDailyGameStats | undefined> {
    const result = await db
      .select()
      .from(userDailyGameStats)
      .where(and(
        eq(userDailyGameStats.userId, userId),
        eq(userDailyGameStats.date, date)
      ))
      .limit(1);
    return result[0];
  }

  async createOrUpdateUserDailyGameStats(userId: string, date: string, updates: Partial<UserDailyGameStats>): Promise<UserDailyGameStats> {
    const existing = await this.getUserDailyGameStats(userId, date);
    if (existing) {
      const result = await db
        .update(userDailyGameStats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userDailyGameStats.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(userDailyGameStats)
        .values({ userId, date, ...updates })
        .returning();
      return result[0];
    }
  }

  // Game Event operations (scaffold)
  async getUpcomingGameEvents(limit: number = 10): Promise<GameEvent[]> {
    const now = new Date();
    return await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.status, 'scheduled'),
        sql`${gameEvents.scheduledAt} > ${now}`
      ))
      .orderBy(asc(gameEvents.scheduledAt))
      .limit(limit);
  }

  async getLiveGameEvents(): Promise<GameEvent[]> {
    return await db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.status, 'live'));
  }

  async getGameEvent(id: string): Promise<GameEvent | undefined> {
    const result = await db.select().from(gameEvents).where(eq(gameEvents.id, id)).limit(1);
    return result[0];
  }

  async createGameEvent(event: InsertGameEvent): Promise<GameEvent> {
    const result = await db.insert(gameEvents).values(event).returning();
    return result[0];
  }

  async updateGameEvent(id: string, updates: Partial<GameEvent>): Promise<GameEvent | undefined> {
    const result = await db.update(gameEvents).set(updates).where(eq(gameEvents.id, id)).returning();
    return result[0];
  }

  // Game Activity Log operations
  async logGameActivity(log: InsertGameActivityLog): Promise<GameActivityLog> {
    const result = await db.insert(gameActivityLog).values(log).returning();
    return result[0];
  }

  async getUserGameActivityLogs(userId: string, limit: number = 50): Promise<GameActivityLog[]> {
    return await db
      .select()
      .from(gameActivityLog)
      .where(eq(gameActivityLog.userId, userId))
      .orderBy(desc(gameActivityLog.createdAt))
      .limit(limit);
  }

  async getGameActivityLogsForDate(userId: string, date: string): Promise<GameActivityLog[]> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    return await db
      .select()
      .from(gameActivityLog)
      .where(and(
        eq(gameActivityLog.userId, userId),
        sql`${gameActivityLog.createdAt} >= ${startOfDay}`,
        sql`${gameActivityLog.createdAt} < ${endOfDay}`
      ))
      .orderBy(desc(gameActivityLog.createdAt));
  }

  // Badge operations
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).orderBy(asc(badges.sortOrder));
  }

  async getBadgeByCode(code: string): Promise<Badge | undefined> {
    const result = await db.select().from(badges).where(eq(badges.code, code)).limit(1);
    return result[0];
  }

  async getUserBadges(userId: string): Promise<Array<UserBadge & { badge: Badge }>> {
    return await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        grantedBy: userBadges.grantedBy,
        grantedReason: userBadges.grantedReason,
        createdAt: userBadges.createdAt,
        badge: badges,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(asc(badges.sortOrder));
  }

  async hasUserBadge(userId: string, badgeCode: string): Promise<boolean> {
    const badge = await this.getBadgeByCode(badgeCode);
    if (!badge) return false;
    
    const result = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)))
      .limit(1);
    return result.length > 0;
  }

  async grantBadge(userId: string, badgeCode: string, grantedBy: string, reason?: string): Promise<UserBadge | undefined> {
    const badge = await this.getBadgeByCode(badgeCode);
    if (!badge) return undefined;
    
    // Check if user already has this badge
    const existing = await this.hasUserBadge(userId, badgeCode);
    if (existing) return undefined;
    
    const result = await db
      .insert(userBadges)
      .values({
        userId,
        badgeId: badge.id,
        grantedBy,
        grantedReason: reason,
      })
      .returning();
    return result[0];
  }

  async revokeBadge(userId: string, badgeCode: string): Promise<void> {
    const badge = await this.getBadgeByCode(badgeCode);
    if (!badge) return;
    
    await db
      .delete(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)));
  }

  async getUserUniqueCardCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${userCards.cardId})` })
      .from(userCards)
      .where(eq(userCards.userId, userId));
    return result[0]?.count || 0;
  }

  async checkAndGrantCollectionMilestones(userId: string): Promise<string[]> {
    const uniqueCards = await this.getUserUniqueCardCount(userId);
    const grantedBadges: string[] = [];
    
    // Collection milestone thresholds
    const milestones = [
      { count: 10, code: 'collector_1' },
      { count: 25, code: 'collector_2' },
      { count: 50, code: 'collector_3' },
    ];
    
    for (const milestone of milestones) {
      if (uniqueCards >= milestone.count) {
        const hasIt = await this.hasUserBadge(userId, milestone.code);
        if (!hasIt) {
          await this.grantBadge(userId, milestone.code, 'system', `Collected ${milestone.count} unique cards`);
          grantedBadges.push(milestone.code);
        }
      }
    }
    
    return grantedBadges;
  }

  async getTrendingCards(limit: number = 10): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await db
      .select({
        cardId: userCards.cardId,
        acquisitionCount: sql<number>`COUNT(*)::int`,
      })
      .from(userCards)
      .where(sql`${userCards.acquiredAt} >= ${sevenDaysAgo}`)
      .groupBy(userCards.cardId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);
    
    // Fetch card details for each trending card
    const trendingWithDetails = await Promise.all(
      result.map(async (item) => {
        const card = await db.select().from(cards).where(eq(cards.id, item.cardId)).limit(1);
        return card[0] ? {
          ...card[0],
          acquisitionCount: item.acquisitionCount,
        } : null;
      })
    );
    
    return trendingWithDetails.filter(Boolean);
  }

  async getTopCollectors(limit: number = 10): Promise<any[]> {
    const result = await db
      .select({
        userId: userCards.userId,
        uniqueCardCount: sql<number>`COUNT(DISTINCT ${userCards.cardId})::int`,
      })
      .from(userCards)
      .groupBy(userCards.userId)
      .orderBy(sql`COUNT(DISTINCT ${userCards.cardId}) DESC`)
      .limit(limit);
    
    // Fetch user details for each collector
    const collectorsWithDetails = await Promise.all(
      result.map(async (item) => {
        const user = await db.select({
          id: users.id,
          name: users.name,
          handle: users.handle,
          avatar: users.avatar,
          isPremium: users.isPremium,
        }).from(users).where(eq(users.id, item.userId)).limit(1);
        return user[0] ? {
          ...user[0],
          uniqueCardCount: item.uniqueCardCount,
        } : null;
      })
    );
    
    return collectorsWithDetails.filter(Boolean);
  }

  // Onboarding operations
  async getOnboardingStatus(userId: string): Promise<{ completed: boolean; firstSummonAt: Date | null; firstShareAt: Date | null }> {
    const result = await db
      .select({
        onboardingCompleted: users.onboardingCompleted,
        firstSummonAt: users.firstSummonAt,
        firstShareAt: users.firstShareAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!result[0]) {
      return { completed: true, firstSummonAt: null, firstShareAt: null }; // Default to completed for unknown users
    }
    
    return {
      completed: result[0].onboardingCompleted,
      firstSummonAt: result[0].firstSummonAt,
      firstShareAt: result[0].firstShareAt,
    };
  }

  async markFirstSummon(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.firstSummonAt) return; // Already marked
    
    await db
      .update(users)
      .set({ firstSummonAt: new Date() })
      .where(eq(users.id, userId));
    
    // Auto-grant Realmwalker I badge on first summon
    await this.grantBadge(userId, 'REALMWALKER_I', 'system', 'Completed your first summon in AniRealm');
    
    // Check if onboarding should be completed (step 1 + 2 done)
    await this.checkOnboardingCompletion(userId);
  }

  async markFirstShare(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.firstShareAt) return; // Already marked
    
    await db
      .update(users)
      .set({ firstShareAt: new Date() })
      .where(eq(users.id, userId));
  }

  async completeOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, userId));
  }

  private async checkOnboardingCompletion(userId: string): Promise<void> {
    // Check if user has completed step 1 (first summon) and step 2 (badge granted)
    const hasBadge = await this.hasUserBadge(userId, 'REALMWALKER_I');
    const user = await this.getUser(userId);
    
    if (user && user.firstSummonAt && hasBadge) {
      await this.completeOnboarding(userId);
    }
  }
}

export const storage = new DbStorage();

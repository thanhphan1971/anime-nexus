import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - core user data
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").default(''),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  avatar: text("avatar").notNull().default('/avatars/preset_001.svg'),
  avatarType: text("avatar_type").notNull().default('preset'), // 'preset' or 'ai' (future)
  avatarId: text("avatar_id").notNull().default('preset_001'), // e.g. preset_001, preset_002
  avatarUpdatedAt: timestamp("avatar_updated_at"),
  bio: text("bio").default(''),
  level: integer("level").notNull().default(1),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  tokens: integer("tokens").notNull().default(1000),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumStartDate: timestamp("premium_start_date"),
  premiumEndDate: timestamp("premium_end_date"),

  // ✅ NEW: whether the subscription is set to cancel at period end (Stripe cancel_at_period_end)
  willCancelAtPeriodEnd: boolean("will_cancel_at_period_end").notNull().default(false),

  isBanned: boolean("is_banned").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  animeInterests: text("anime_interests").array().default(sql`ARRAY[]::text[]`),
  theme: text("theme").default('cyberpunk'),
  birthDate: timestamp("birth_date"),

  birthYear: integer("birth_year"), // For privacy - only year stored for age calculation
  ageBand: text("age_band").default('adult'), // 'child' (<13), 'teen' (13-17), 'adult' (18+)
  isMinor: boolean("is_minor").notNull().default(false),
  parentEmail: text("parent_email"),
  parentalConsentGiven: boolean("parental_consent_given").notNull().default(false),
  freeSummonsUsedToday: integer("free_summons_used_today").notNull().default(0),
  freeSummonsResetAt: timestamp("free_summons_reset_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  supabaseUserId: varchar("supabase_user_id").unique(),
  // Tutorial flags for one-time guided tutorials
  tutorialButtonsDone: boolean("tutorial_buttons_done").notNull().default(false),
  tutorialRewardedDone: boolean("tutorial_rewarded_done").notNull().default(false),
  tutorialFirstEarnDone: boolean("tutorial_first_earn_done").notNull().default(false),
  tutorialPracticeOnlyDone: boolean("tutorial_practice_only_done").notNull().default(false),
  // A/B Testing and Monetization fields
  ctaVariantId: text("cta_variant_id"), // 'A', 'B', or 'C' for A/B testing
  ctaVariantAssignedAt: timestamp("cta_variant_assigned_at"), // When variant was assigned (locked 7 days)
  ctaSeenCount: integer("cta_seen_count").notNull().default(0), // Times user has seen standard CTA
  activeDays: integer("active_days").notNull().default(0), // Days user has been active
  lastActiveDate: timestamp("last_active_date"), // Last active date (for counting unique days)
  hasPurchased: boolean("has_purchased").notNull().default(false), // Has ever made a purchase
  firstPurchaseDiscountUsed: boolean("first_purchase_discount_used").notNull().default(false), // One-time discount used
  firstPurchaseDiscountDeclinedAt: timestamp("first_purchase_discount_declined_at"), // When declined (30-day cooldown)
  firstPurchaseAt: timestamp("first_purchase_at"), // When first purchase was made
  // S-Class Trial fields
  isOnTrial: boolean("is_on_trial").notNull().default(false), // Currently in trial period
  trialStartDate: timestamp("trial_start_date"), // When trial started
  trialEndDate: timestamp("trial_end_date"), // When trial ends (3 days after start)
  trialUsed: boolean("trial_used").notNull().default(false), // Has used trial (one per lifetime)
  // S-Class Welcome reward
  sclassWelcomeRewardClaimed: boolean("sclass_welcome_reward_claimed").notNull().default(false), // One-time welcome bonus claimed
  sclassJoinedAt: timestamp("sclass_joined_at"), // First time became full S-Class (not trial)
  // S-Class Subscription Management
  subscriptionType: text("subscription_type").default('monthly'), // 'monthly' or 'yearly'
  subscriptionStatus: text("subscription_status").default('none'), // 'none', 'active', 'canceled_pending_expiry', 'expired'
  subscriptionCanceledAt: timestamp("subscription_canceled_at"), // When user canceled (access continues until premiumEndDate)
  lastReactivateDate: timestamp("last_reactivate_date"), // When user last reactivated after canceling
  retentionSaveBonusUsed: boolean("retention_save_bonus_used").notNull().default(false), // One-time retention bonus claimed
  // Admin-granted S-Class access (separate from paid subscriptions)
  accessSource: text("access_source"), // 'admin_grant' or 'subscription' or null
  accessExpiresAt: timestamp("access_expires_at"), // When admin-granted access expires
  // Stripe integration fields
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for billing
  stripeSubscriptionId: text("stripe_subscription_id"), // Active Stripe subscription ID
  // Handle change tracking (for cooldown)
  handleChangedAt: timestamp("handle_changed_at"), // When handle was last changed (30-day cooldown)
  // Day-0 Onboarding tracking
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false), // Whether user has completed onboarding
  firstSummonAt: timestamp("first_summon_at"), // When user performed their first summon (for Realmwalker badge)
  firstShareAt: timestamp("first_share_at"), // When user shared their first pull (optional onboarding step)
  // Paid summon tracking for soft reminders
  paidSummonsToday: integer("paid_summons_today").notNull().default(0), // Number of paid summons today
  paidSummonsResetAt: timestamp("paid_summons_reset_at"), // When paid summon counter resets (7:00 PM ET)
  paidReminderShownToday: boolean("paid_reminder_shown_today").notNull().default(false), // Whether reminder was shown today
});

// Posts table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content"),
  image: text("image"),
  postType: text("post_type").default('regular'), // 'regular', 'summon'
  cardId: varchar("card_id"), // Card ID if post is a summon share
  summonSource: text("summon_source"), // 'daily_free' or 'paid' for summon posts
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post Likes - tracks which users liked which posts
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Card Categories - for organizing cards into folders
export const cardCategories = pgTable("card_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").default('#6366f1'), // Hex color for UI display
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cards table
export const cards = pgTable("cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  character: text("character").notNull(),
  anime: text("anime").notNull(),
  rarity: text("rarity").notNull(), // Common, Rare, Epic, Legendary, Mythic
  image: text("image").notNull(),
  power: integer("power").notNull(),
  element: text("element").notNull(),
  categoryId: varchar("category_id").references(() => cardCategories.id, { onDelete: 'set null' }), // Card category/folder
  isArchived: boolean("is_archived").notNull().default(false), // Archived cards are removed from gacha but stay in user collections
  isReleased: boolean("is_released").notNull().default(true), // Only released cards appear in catalog
  isLimited: boolean("is_limited").notNull().default(false), // Limited/event cards get special tag
  isStandard: boolean("is_standard").notNull().default(true), // Standard banner eligible (permanent cards)
  isEventLimited: boolean("is_event_limited").notNull().default(false), // Event-limited cards (excluded from standard)
  isPremiumOnly: boolean("is_premium_only").notNull().default(false), // Premium-only cards (S-Class exclusive)
  obtainableFrom: text("obtainable_from").array().default(sql`ARRAY['daily']::text[]`), // daily, weekly, monthly, event
  poolDates: jsonb("pool_dates").default(sql`'{}'::jsonb`), // { "daily": { "start": "2024-01-01", "end": "2024-12-31" }, ... }
  season: text("season"), // Season/event name (e.g., "Summer 2024", "Halloween Event")
  lore: text("lore"), // Card backstory/description for details modal
  status: text("status").notNull().default('active'), // draft, scheduled, active, retired
  scheduledReleaseDate: timestamp("scheduled_release_date"), // When the card becomes available (null = immediately)
  releaseDate: timestamp("release_date").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Cards (collection)
export const userCards = pgTable("user_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: varchar("card_id").notNull().references(() => cards.id, { onDelete: 'cascade' }),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
});

// Marketplace Listings
export const marketListings = pgTable("market_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: varchar("card_id").notNull().references(() => cards.id, { onDelete: 'cascade' }),
  price: integer("price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Communities (chat rooms)
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  memberCount: integer("member_count").notNull().default(0),
  isPrivate: boolean("is_private").notNull().default(false),
  category: text("category").notNull(), // Shonen, Romance, Mecha, Isekai, etc.
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  rules: text("rules").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Members with Roles
export const communityMembers = pgTable("community_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull().default('member'), // owner, moderator, veteran, member
  tokensEarned: integer("tokens_earned").notNull().default(0),
  messagesCount: integer("messages_count").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Community Sub-channels
export const communityChannels = pgTable("community_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default('chat'), // chat, spoilers, fan-art, theories, announcements
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Messages (updated)
export const communityMessages = pgTable("community_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  channelId: varchar("channel_id"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Events (Watch Parties, Discussions)
export const communityEvents = pgTable("community_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(), // watch_party, discussion, tournament, challenge
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  image: text("image"),
  attendeeCount: integer("attendee_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Event Attendees
export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => communityEvents.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Community Polls
export const communityPolls = pgTable("community_polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  votes: jsonb("votes").notNull().default(sql`'{}'::jsonb`), // { optionIndex: count }
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Poll Votes
export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => communityPolls.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  optionIndex: integer("option_index").notNull(),
  votedAt: timestamp("voted_at").notNull().defaultNow(),
});

// Community Challenges
export const communityChallenges = pgTable("community_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  challengeType: text("challenge_type").notNull(), // art, cosplay, quiz, writing
  reward: integer("reward").notNull().default(100), // tokens reward
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  participantCount: integer("participant_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Challenge Submissions
export const challengeSubmissions = pgTable("challenge_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => communityChallenges.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  image: text("image"),
  votes: integer("votes").notNull().default(0),
  isWinner: boolean("is_winner").notNull().default(false),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

// Swipe Actions (for Find Nakama)
export const swipeActions = pgTable("swipe_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: varchar("to_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // like or pass
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Prize Catalog - all available prize types
export const prizes = pgTable("prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // card, tokens, premium_days, badge, avatar_frame
  rarity: text("rarity").notNull(), // common, rare, epic, legendary, mythic
  value: integer("value").notNull().default(0), // token amount, days, or card power
  iconUrl: text("icon_url"),
  metadata: jsonb("metadata"), // additional prize-specific data
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Draws - scheduled prize drawings
export const draws = pgTable("draws", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cadence: text("cadence").notNull(), // weekly, monthly, special, one_time
  cycleId: text("cycle_id"), // weekly-YYYY-MM-DD or monthly-YYYY-MM for recurring draws
  status: text("status").notNull().default('scheduled'), // scheduled, open, locked, executed, cancelled
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  drawAt: timestamp("draw_at").notNull(), // when winner is selected
  executedAt: timestamp("executed_at"), // when draw was actually executed (for 24h cooldown calculation)
  prizePool: jsonb("prize_pool").notNull(), // array of { prizeId, quantity, odds }
  entryRules: jsonb("entry_rules"), // { minLevel, premiumOnly, activityRequired, minAccountAgeDays, requireEmailVerified }
  maxEntries: integer("max_entries"), // null = unlimited total entries
  maxEntriesPerUser: integer("max_entries_per_user").notNull().default(1), // entries per free user
  premiumEntriesPerUser: integer("premium_entries_per_user").notNull().default(1), // entries per S-Class user
  winnerScaling: jsonb("winner_scaling"), // { minWinners, maxWinners, entriesPerWinner } for dynamic winner counts
  winnerTiers: jsonb("winner_tiers"), // { grand: { count, prizeIds }, secondary: { count, prizeIds } } for monthly
  bannerImage: text("banner_image"),
  isVisible: boolean("is_visible").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  overrideBy: varchar("override_by").references(() => users.id, { onDelete: 'set null' }),
  overrideReason: text("override_reason"),
  overrideAt: timestamp("override_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Draw Entries - user entries into draws
export const drawEntries = pgTable("draw_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawId: varchar("draw_id").notNull().references(() => draws.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tickets: integer("tickets").notNull().default(1), // number of entries/tickets
  entrySource: text("entry_source").notNull().default('auto'), // auto, daily_login, premium_bonus, referral
  metadata: jsonb("metadata"), // additional entry data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Draw Winners - selected winners
export const drawWinners = pgTable("draw_winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawId: varchar("draw_id").notNull().references(() => draws.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryId: varchar("entry_id").references(() => drawEntries.id, { onDelete: 'set null' }),
  prizeId: varchar("prize_id").notNull().references(() => prizes.id, { onDelete: 'cascade' }),
  prizeDetails: jsonb("prize_details"), // snapshot of prize at time of win
  winnerTier: text("winner_tier").notNull().default('standard'), // standard, grand, secondary (for monthly draws)
  claimStatus: text("claim_status").notNull().default('pending'), // pending, claimed, expired
  claimExpiresAt: timestamp("claim_expires_at"),
  claimedAt: timestamp("claimed_at"),
  announcementHeadline: text("announcement_headline"),
  spotlightCopy: text("spotlight_copy"),
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
});

// Token Packages - what users can purchase
export const tokenPackages = pgTable("token_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  tokenAmount: integer("token_amount").notNull(),
  priceUsd: integer("price_usd").notNull(), // in cents (e.g., 499 = $4.99)
  bonusTokens: integer("bonus_tokens").notNull().default(0),
  stripePriceId: text("stripe_price_id"), // Stripe price ID for checkout
  isPopular: boolean("is_popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Token Purchases - transaction history
export const tokenPurchases = pgTable("token_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  packageId: varchar("package_id").references(() => tokenPackages.id, { onDelete: 'set null' }),
  tokenAmount: integer("token_amount").notNull(),
  amountPaid: integer("amount_paid").notNull(), // in cents
  currency: text("currency").notNull().default('usd'),
  stripePaymentId: text("stripe_payment_id"),
  stripeSessionId: text("stripe_session_id"),
  status: text("status").notNull().default('pending'), // pending, completed, failed, refunded
  isMinorPurchase: boolean("is_minor_purchase").notNull().default(false),
  parentNotified: boolean("parent_notified").notNull().default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Parent-Child Account Links
export const parentChildLinks = pgTable("parent_child_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  childId: varchar("child_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // pending, active, revoked
  verificationCode: text("verification_code"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Parental Controls - settings for linked child accounts
export const parentalControls = pgTable("parental_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  childId: varchar("child_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  purchasesEnabled: boolean("purchases_enabled").notNull().default(false),
  dailySpendLimit: integer("daily_spend_limit").notNull().default(1000), // in cents ($10.00)
  monthlySpendLimit: integer("monthly_spend_limit").notNull().default(5000), // in cents ($50.00)
  drawsEnabled: boolean("draws_enabled").notNull().default(true),
  paidDrawsEnabled: boolean("paid_draws_enabled").notNull().default(false),
  gachaEnabled: boolean("gacha_enabled").notNull().default(true),
  marketplaceEnabled: boolean("marketplace_enabled").notNull().default(true),
  chatEnabled: boolean("chat_enabled").notNull().default(true),
  friendRequestsEnabled: boolean("friend_requests_enabled").notNull().default(true),
  notifyOnPurchase: boolean("notify_on_purchase").notNull().default(true),
  notifyOnDraw: boolean("notify_on_draw").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Purchase Requests - for minor token purchases needing parent approval
export const purchaseRequests = pgTable("purchase_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childUserId: varchar("child_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentUserId: varchar("parent_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  packId: text("pack_id").notNull(),
  currency: text("currency").notNull().default('USD'),
  unitAmountCents: integer("unit_amount_cents").notNull(),
  baseTokens: integer("base_tokens").notNull(),
  bonusTokens: integer("bonus_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull(),
  childMessage: text("child_message"),
  status: text("status").notNull().default('PENDING_PARENT'),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  expiresAt: timestamp("expires_at").notNull().default(sql`NOW() + INTERVAL '24 hours'`),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  deniedAt: timestamp("denied_at"),
  paidAt: timestamp("paid_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Parent Notifications - in-app notifications for parents
export const parentNotifications = pgTable("parent_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // PURCHASE_REQUEST, PURCHASE_APPROVED, PURCHASE_DECLINED, PURCHASE_COMPLETED, SYSTEM
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: jsonb("metadata"), // { purchaseRequestId, childId, tokenAmount, priceCents, currency, childName, etc. }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
});

// Token Ledger - idempotent token crediting with unique constraint
export const tokenLedger = pgTable("token_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text("source").notNull(),
  purchaseRequestId: varchar("purchase_request_id").notNull().references(() => purchaseRequests.id, { onDelete: 'cascade' }),
  deltaTokens: integer("delta_tokens").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSourcePurchase: sql`UNIQUE (source, purchase_request_id)`,
}));

// Watchlist Items - user's anime tracking list (AniList integration)
export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  anilistId: integer("anilist_id").notNull(),
  status: text("status").notNull().default('PLANNING'), // WATCHING, COMPLETED, PLANNING, PAUSED, DROPPED
  progress: integer("progress").notNull().default(0),
  score: integer("score"), // 0-10
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Anime Cache - caches AniList API responses for performance
export const animeCache = pgTable("anime_cache", {
  anilistId: integer("anilist_id").primaryKey(),
  payload: jsonb("payload").notNull(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
});

// Site Settings - admin-controlled global settings
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

// Admin Audit Log - tracks admin actions for accountability
export const adminAuditLog = pgTable("admin_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // GRANT_TOKENS, MARK_RESOLVED, etc.
  targetType: text("target_type").notNull(), // purchase_request, user, etc.
  targetId: varchar("target_id").notNull(),
  details: jsonb("details"), // Additional context (old status, new status, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Security Metrics Events - tracks blocked requests/approvals/webhooks for ops monitoring
export const securityMetricsEvents = pgTable("security_metrics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // REQUEST_BLOCKED, APPROVAL_BLOCKED, WEBHOOK_BLOCKED, REQUEST_CREATED, APPROVAL_STARTED, WEBHOOK_CREDITED
  reason: text("reason").notNull(), // DAILY_LIMIT, MONTHLY_LIMIT, REQUEST_EXPIRED, PURCHASES_DISABLED, etc.
  parentId: varchar("parent_id"),
  childId: varchar("child_id"),
  purchaseRequestId: varchar("purchase_request_id"),
  priceCents: integer("price_cents"),
  tokenAmount: integer("token_amount"),
  metadata: jsonb("metadata"), // Keep small: {route, status, nodeEnv} etc. NO secrets.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SecurityMetricsEvent = typeof securityMetricsEvents.$inferSelect;
export type InsertSecurityMetricsEvent = typeof securityMetricsEvents.$inferInsert;

// Media - tracks uploaded files (no base64, just references)
export const media = pgTable("media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  storageProvider: text("storage_provider").notNull().default('supabase'), // supabase or r2
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  kind: text("kind").notNull(), // post, story, avatar, card
  publicUrl: text("public_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Stories - ephemeral user content (24h expiration)
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaId: varchar("media_id").references(() => media.id, { onDelete: 'set null' }),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull(), // 'image' or 'video'
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// ========================
// FRACTURE TRIAL GAME SYSTEM
// ========================

// Game Sessions - individual game runs (server-authoritative)
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  trialType: text("trial_type").notNull(), // safe, unstable, overcharged
  gameMode: text("game_mode").notNull().default('instant'), // instant, event
  isRewarded: boolean("is_rewarded").notNull().default(true), // true = counts for rewards, false = practice
  status: text("status").notNull().default('active'), // active, completed, abandoned
  outcome: text("outcome"), // success, critical_success, failure
  score: integer("score").notNull().default(0),
  fracturesStabilized: integer("fractures_stabilized").notNull().default(0),
  fracturesTotal: integer("fractures_total").notNull().default(5),
  tokensSpent: integer("tokens_spent").notNull().default(0), // for overcharged trials
  tokensRewarded: integer("tokens_rewarded").notNull().default(0),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
  rewardClaimedAt: timestamp("reward_claimed_at"),
  chroniclePostId: varchar("chronicle_post_id").references(() => posts.id, { onDelete: 'set null' }),
  boosterUsed: text("booster_used"), // optional booster type
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // session timeout
});

// User Daily Game Stats - tracks daily limits per user
export const userDailyGameStats = pgTable("user_daily_game_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text("date").notNull(), // YYYY-MM-DD format for easy querying
  rewardedRunsUsed: integer("rewarded_runs_used").notNull().default(0),
  practiceRunsUsed: integer("practice_runs_used").notNull().default(0),
  tokensEarnedToday: integer("tokens_earned_today").notNull().default(0),
  socialBonusClaimed: boolean("social_bonus_claimed").notNull().default(false),
  eventEntriesUsed: integer("event_entries_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Game Events - scheduled world events (scaffold)
export const gameEvents = pgTable("game_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull().default('fracture_storm'), // fracture_storm, boss_raid, etc.
  status: text("status").notNull().default('scheduled'), // scheduled, live, completed, cancelled
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  freeEntriesAllowed: integer("free_entries_allowed").notNull().default(1),
  maxEntriesPerUser: integer("max_entries_per_user").notNull().default(3),
  extraEntryCost: integer("extra_entry_cost").notNull().default(50), // tokens
  rewardPool: jsonb("reward_pool"), // { tokens: { min, max }, items: [...] }
  participants: integer("participants").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Game Activity Log - for tracking/auditing (runs started, rewarded, tokens granted)
export const gameActivityLog = pgTable("game_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id").references(() => gameSessions.id, { onDelete: 'set null' }),
  action: text("action").notNull(), // run_started, run_completed, reward_claimed, tokens_granted, event_joined
  details: jsonb("details"), // { trialType, outcome, tokensGranted, etc. }
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  followers: true,
  following: true,
  level: true,
  tokens: true,
  isPremium: true,
  isBanned: true,
  isAdmin: true,
  supabaseUserId: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likes: true,
  comments: true,
});

export const insertCardCategorySchema = createInsertSchema(cardCategories).omit({
  id: true,
  createdAt: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  createdAt: true,
});

export const insertUserCardSchema = createInsertSchema(userCards).omit({
  id: true,
  acquiredAt: true,
});

export const insertMarketListingSchema = createInsertSchema(marketListings).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  memberCount: true,
});

export const insertCommunityMemberSchema = createInsertSchema(communityMembers).omit({
  id: true,
  joinedAt: true,
  tokensEarned: true,
  messagesCount: true,
});

export const insertCommunityChannelSchema = createInsertSchema(communityChannels).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityMessageSchema = createInsertSchema(communityMessages).omit({
  id: true,
  createdAt: true,
  isPinned: true,
});

export const insertCommunityEventSchema = createInsertSchema(communityEvents).omit({
  id: true,
  createdAt: true,
  attendeeCount: true,
  isActive: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  joinedAt: true,
});

export const insertCommunityPollSchema = createInsertSchema(communityPolls).omit({
  id: true,
  createdAt: true,
  votes: true,
  isActive: true,
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  votedAt: true,
});

export const insertCommunityChallengeSchema = createInsertSchema(communityChallenges).omit({
  id: true,
  createdAt: true,
  participantCount: true,
  isActive: true,
});

export const insertChallengeSubmissionSchema = createInsertSchema(challengeSubmissions).omit({
  id: true,
  submittedAt: true,
  votes: true,
  isWinner: true,
});

export const insertSwipeActionSchema = createInsertSchema(swipeActions).omit({
  id: true,
  createdAt: true,
});

export const insertPrizeSchema = createInsertSchema(prizes).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertDrawSchema = createInsertSchema(draws).omit({
  id: true,
  createdAt: true,
  overrideBy: true,
  overrideReason: true,
  overrideAt: true,
});

export const insertDrawEntrySchema = createInsertSchema(drawEntries).omit({
  id: true,
  createdAt: true,
});

export const insertDrawWinnerSchema = createInsertSchema(drawWinners).omit({
  id: true,
  awardedAt: true,
  claimStatus: true,
});

export const insertTokenPackageSchema = createInsertSchema(tokenPackages).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertTokenPurchaseSchema = createInsertSchema(tokenPurchases).omit({
  id: true,
  createdAt: true,
  status: true,
  parentNotified: true,
});

export const insertParentChildLinkSchema = createInsertSchema(parentChildLinks).omit({
  id: true,
  createdAt: true,
  status: true,
  verifiedAt: true,
});

export const insertParentalControlsSchema = createInsertSchema(parentalControls).omit({
  id: true,
  updatedAt: true,
});

export const insertPurchaseRequestSchema = createInsertSchema(purchaseRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  requestedAt: true,
  approvedAt: true,
  deniedAt: true,
  paidAt: true,
  fulfilledAt: true,
});

export const insertTokenLedgerSchema = createInsertSchema(tokenLedger).omit({
  id: true,
  createdAt: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertParentNotificationSchema = createInsertSchema(parentNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertCardCategory = z.infer<typeof insertCardCategorySchema>;
export type CardCategory = typeof cardCategories.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

export type InsertUserCard = z.infer<typeof insertUserCardSchema>;
export type UserCard = typeof userCards.$inferSelect;

export type InsertMarketListing = z.infer<typeof insertMarketListingSchema>;
export type MarketListing = typeof marketListings.$inferSelect;

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;

export type InsertCommunityChannel = z.infer<typeof insertCommunityChannelSchema>;
export type CommunityChannel = typeof communityChannels.$inferSelect;

export type InsertCommunityMessage = z.infer<typeof insertCommunityMessageSchema>;
export type CommunityMessage = typeof communityMessages.$inferSelect;

export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;
export type CommunityEvent = typeof communityEvents.$inferSelect;

export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;

export type InsertCommunityPoll = z.infer<typeof insertCommunityPollSchema>;
export type CommunityPoll = typeof communityPolls.$inferSelect;

export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;
export type PollVote = typeof pollVotes.$inferSelect;

export type InsertCommunityChallenge = z.infer<typeof insertCommunityChallengeSchema>;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;

export type InsertChallengeSubmission = z.infer<typeof insertChallengeSubmissionSchema>;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;

export type InsertSwipeAction = z.infer<typeof insertSwipeActionSchema>;
export type SwipeAction = typeof swipeActions.$inferSelect;

export type InsertPrize = z.infer<typeof insertPrizeSchema>;
export type Prize = typeof prizes.$inferSelect;

export type InsertDraw = z.infer<typeof insertDrawSchema>;
export type Draw = typeof draws.$inferSelect;

export type InsertDrawEntry = z.infer<typeof insertDrawEntrySchema>;
export type DrawEntry = typeof drawEntries.$inferSelect;

export type InsertDrawWinner = z.infer<typeof insertDrawWinnerSchema>;
export type DrawWinner = typeof drawWinners.$inferSelect;

export type InsertTokenPackage = z.infer<typeof insertTokenPackageSchema>;
export type TokenPackage = typeof tokenPackages.$inferSelect;

export type InsertTokenPurchase = z.infer<typeof insertTokenPurchaseSchema>;
export type TokenPurchase = typeof tokenPurchases.$inferSelect;

export type InsertParentChildLink = z.infer<typeof insertParentChildLinkSchema>;
export type ParentChildLink = typeof parentChildLinks.$inferSelect;

export type InsertParentalControls = z.infer<typeof insertParentalControlsSchema>;
export type ParentalControls = typeof parentalControls.$inferSelect;

export type InsertPurchaseRequest = z.infer<typeof insertPurchaseRequestSchema>;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;

export type InsertTokenLedger = z.infer<typeof insertTokenLedgerSchema>;
export type TokenLedger = typeof tokenLedger.$inferSelect;

export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;

export type InsertParentNotification = z.infer<typeof insertParentNotificationSchema>;
export type ParentNotification = typeof parentNotifications.$inferSelect;

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnimeCacheSchema = createInsertSchema(animeCache).omit({
  cachedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

export type InsertAnimeCache = z.infer<typeof insertAnimeCacheSchema>;
export type AnimeCache = typeof animeCache.$inferSelect;

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true,
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof media.$inferSelect;

// Game System Insert Schemas
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  startedAt: true,
});

export const insertUserDailyGameStatsSchema = createInsertSchema(userDailyGameStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameEventSchema = createInsertSchema(gameEvents).omit({
  id: true,
  createdAt: true,
});

export const insertGameActivityLogSchema = createInsertSchema(gameActivityLog).omit({
  id: true,
  createdAt: true,
});

// Game System Types
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

export type InsertUserDailyGameStats = z.infer<typeof insertUserDailyGameStatsSchema>;
export type UserDailyGameStats = typeof userDailyGameStats.$inferSelect;

export type InsertGameEvent = z.infer<typeof insertGameEventSchema>;
export type GameEvent = typeof gameEvents.$inferSelect;

export type InsertGameActivityLog = z.infer<typeof insertGameActivityLogSchema>;
export type GameActivityLog = typeof gameActivityLog.$inferSelect;

// ============== BADGES SYSTEM ==============

// Badges table - defines available badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // e.g., 'collector_1', 'founder', 'early_realmwalker', 's_class'
  name: text("name").notNull(), // Display name: "Collector I", "Founder", etc.
  description: text("description").notNull(),
  icon: text("icon"), // Optional icon URL or emoji
  category: text("category").notNull().default('achievement'), // 'achievement', 'membership', 'special'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Badges - tracks which badges users have earned
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: 'cascade' }),
  grantedBy: text("granted_by").notNull().default('system'), // 'system' or 'admin'
  grantedReason: text("granted_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Badge Insert Schemas
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  createdAt: true,
});

// Badge Types
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ============== SEASONAL EVENTS SYSTEM ==============

// Seasonal Events - time-limited events with themes
export const seasonalEvents = pgTable("seasonal_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  theme: text("theme").notNull(), // 'summer', 'winter', 'halloween', 'spring', 'anniversary', etc.
  bannerImage: text("banner_image"),
  iconImage: text("icon_image"),
  primaryColor: text("primary_color").default('#6366f1'),
  secondaryColor: text("secondary_color").default('#8b5cf6'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  tokenMultiplier: integer("token_multiplier").notNull().default(1), // Bonus multiplier during event
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Event Challenges - limited-time tasks within events
export const eventChallenges = pgTable("event_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => seasonalEvents.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  challengeType: text("challenge_type").notNull(), // 'daily', 'weekly', 'event_long', 'milestone'
  targetType: text("target_type").notNull(), // 'summons', 'logins', 'tokens_earned', 'cards_collected', 'games_played', 'posts_created'
  targetValue: integer("target_value").notNull(),
  rewardType: text("reward_type").notNull(), // 'tokens', 'card', 'badge', 'xp'
  rewardValue: integer("reward_value").notNull(), // Token amount or XP amount
  rewardCardId: varchar("reward_card_id").references(() => cards.id, { onDelete: 'set null' }), // If reward is a card
  rewardBadgeId: varchar("reward_badge_id").references(() => badges.id, { onDelete: 'set null' }), // If reward is a badge
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isPremiumOnly: boolean("is_premium_only").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Event Progress - tracks user participation in events
export const userEventProgress = pgTable("user_event_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventId: varchar("event_id").notNull().references(() => seasonalEvents.id, { onDelete: 'cascade' }),
  totalPoints: integer("total_points").notNull().default(0),
  challengesCompleted: integer("challenges_completed").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// User Challenge Progress - tracks progress on individual challenges
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  challengeId: varchar("challenge_id").notNull().references(() => eventChallenges.id, { onDelete: 'cascade' }),
  currentProgress: integer("current_progress").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
  rewardClaimedAt: timestamp("reward_claimed_at"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Event Cards - links cards to specific events
export const eventCards = pgTable("event_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => seasonalEvents.id, { onDelete: 'cascade' }),
  cardId: varchar("card_id").notNull().references(() => cards.id, { onDelete: 'cascade' }),
  dropRateBonus: integer("drop_rate_bonus").notNull().default(0), // Percentage bonus (e.g., 50 = 50% higher chance)
  isExclusive: boolean("is_exclusive").notNull().default(true), // Only available during this event
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Seasonal Events Insert Schemas
export const insertSeasonalEventSchema = createInsertSchema(seasonalEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventChallengeSchema = createInsertSchema(eventChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertUserEventProgressSchema = createInsertSchema(userEventProgress).omit({
  id: true,
  joinedAt: true,
});

export const insertUserChallengeProgressSchema = createInsertSchema(userChallengeProgress).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
});

export const insertEventCardSchema = createInsertSchema(eventCards).omit({
  id: true,
  createdAt: true,
});

// Seasonal Events Types
export type InsertSeasonalEvent = z.infer<typeof insertSeasonalEventSchema>;
export type SeasonalEvent = typeof seasonalEvents.$inferSelect;

export type InsertEventChallenge = z.infer<typeof insertEventChallengeSchema>;
export type EventChallenge = typeof eventChallenges.$inferSelect;

export type InsertUserEventProgress = z.infer<typeof insertUserEventProgressSchema>;
export type UserEventProgress = typeof userEventProgress.$inferSelect;

export type InsertUserChallengeProgress = z.infer<typeof insertUserChallengeProgressSchema>;
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;

export type InsertEventCard = z.infer<typeof insertEventCardSchema>;
export type EventCard = typeof eventCards.$inferSelect;

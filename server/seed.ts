import { db } from "./db";
import { cards, communities, users, prizes, draws } from "@shared/schema";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  // Check if cards already seeded
  const existingCards = await db.select().from(cards).limit(1);
  const existingUsers = await db.select().from(users).limit(2);
  
  // If we have cards but not enough sample users, seed users
  if (existingCards.length > 0 && existingUsers.length < 2) {
    console.log("Adding sample users for matching...");
    await seedSampleUsers();
    return;
  }
  
  if (existingCards.length > 0) {
    console.log("Database already seeded");
    return;
  }

  console.log("Seeding database...");

  // Seed cards
  const cardData = [
    {
      name: "Mystic Flames",
      character: "Natsu Dragneel",
      anime: "Fairy Tail",
      rarity: "Legendary",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=natsu",
      power: 950,
      element: "Fire"
    },
    {
      name: "Thunder Strike",
      character: "Killua Zoldyck",
      anime: "Hunter x Hunter",
      rarity: "Epic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=killua",
      power: 880,
      element: "Lightning"
    },
    {
      name: "Shadow Clone",
      character: "Naruto Uzumaki",
      anime: "Naruto",
      rarity: "Legendary",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=naruto",
      power: 920,
      element: "Wind"
    },
    {
      name: "Solar Beam",
      character: "Goku",
      anime: "Dragon Ball Z",
      rarity: "Mythic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=goku",
      power: 999,
      element: "Energy"
    },
    {
      name: "Ice Prison",
      character: "Todoroki",
      anime: "My Hero Academia",
      rarity: "Epic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=todoroki",
      power: 870,
      element: "Ice"
    },
    {
      name: "Titan Shift",
      character: "Eren Yeager",
      anime: "Attack on Titan",
      rarity: "Legendary",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=eren",
      power: 910,
      element: "Titan"
    },
    {
      name: "Spirit Sword",
      character: "Ichigo Kurosaki",
      anime: "Bleach",
      rarity: "Rare",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=ichigo",
      power: 800,
      element: "Soul"
    },
    {
      name: "Demon Slayer",
      character: "Tanjiro Kamado",
      anime: "Demon Slayer",
      rarity: "Epic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=tanjiro",
      power: 850,
      element: "Water"
    },
    {
      name: "Divine Protection",
      character: "Subaru",
      anime: "Re:Zero",
      rarity: "Common",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=subaru",
      power: 650,
      element: "Time"
    },
    {
      name: "Alchemy Master",
      character: "Edward Elric",
      anime: "Fullmetal Alchemist",
      rarity: "Rare",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=edward",
      power: 820,
      element: "Earth"
    },
    {
      name: "Sage Mode",
      character: "Jiraiya",
      anime: "Naruto",
      rarity: "Epic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=jiraiya",
      power: 890,
      element: "Nature"
    },
    {
      name: "All Might",
      character: "Toshinori Yagi",
      anime: "My Hero Academia",
      rarity: "Mythic",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=allmight",
      power: 990,
      element: "Power"
    },
  ];

  await db.insert(cards).values(cardData);

  // Seed communities
  const communityData = [
    {
      name: "Shonen Central",
      description: "For fans of action-packed shonen anime!",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=shonen",
      memberCount: 12450,
      category: "anime",
      isPrivate: false,
    },
    {
      name: "Isekai Haven",
      description: "Discuss your favorite isekai adventures",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=isekai",
      memberCount: 8920,
      category: "anime",
      isPrivate: false,
    },
    {
      name: "Gaming Lounge",
      description: "Chat about anime games and gacha",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=gaming",
      memberCount: 15600,
      category: "gaming",
      isPrivate: false,
    },
    {
      name: "Meme Factory",
      description: "Share the funniest anime memes",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=meme",
      memberCount: 23100,
      category: "community",
      isPrivate: false,
    },
    {
      name: "Art Corner",
      description: "Show off your anime fan art",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=art",
      memberCount: 6780,
      category: "community",
      isPrivate: false,
    },
    {
      name: "S-Class Lounge",
      description: "Exclusive premium member lounge",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=vip",
      memberCount: 420,
      category: "community",
      isPrivate: true,
    },
  ];

  await db.insert(communities).values(communityData);

  // Seed prizes for draw system
  const prizeData = [
    // Weekly Draw Prizes (small prizes)
    { name: "50 Tokens", description: "A small token reward", type: "tokens", rarity: "common", value: 50 },
    { name: "100 Tokens", description: "A token reward", type: "tokens", rarity: "common", value: 100 },
    { name: "200 Tokens", description: "A nice token reward", type: "tokens", rarity: "rare", value: 200 },
    { name: "Bronze Frame", description: "A bronze avatar frame", type: "avatar_frame", rarity: "common", value: 1 },
    { name: "Silver Frame", description: "A silver avatar frame", type: "avatar_frame", rarity: "rare", value: 1 },
    { name: "Random Common Card", description: "A random common rarity card", type: "card", rarity: "common", value: 30 },
    { name: "Random Rare Card", description: "A random rare rarity card", type: "card", rarity: "rare", value: 50 },
    // Monthly Draw Prizes (grand prizes)
    { name: "5000 Tokens", description: "A massive token jackpot!", type: "tokens", rarity: "legendary", value: 5000 },
    { name: "1 Month S-Class", description: "One month of S-Class membership", type: "premium_days", rarity: "legendary", value: 30 },
    { name: "Legendary Card Pack", description: "Contains a guaranteed legendary card", type: "card", rarity: "legendary", value: 85 },
    { name: "Mythic Card", description: "An ultra-rare mythic card", type: "card", rarity: "mythic", value: 100 },
    // Monthly Secondary Prizes
    { name: "1000 Tokens", description: "A generous token reward", type: "tokens", rarity: "epic", value: 1000 },
    { name: "7 Days S-Class", description: "One week of S-Class membership", type: "premium_days", rarity: "epic", value: 7 },
    { name: "Epic Card Pack", description: "Contains a guaranteed epic card", type: "card", rarity: "epic", value: 65 },
    { name: "Gold Frame", description: "A prestigious gold avatar frame", type: "avatar_frame", rarity: "epic", value: 1 },
  ];

  await db.insert(prizes).values(prizeData);

  // Seed sample draws - Friday 7:00 PM draws
  const now = new Date();
  
  // Helper to get next Friday at 7 PM (local time)
  function getNextFriday7PM(fromDate: Date = new Date()): Date {
    const result = new Date(fromDate);
    const dayOfWeek = result.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) : (5 + 7 - dayOfWeek);
    
    if (daysUntilFriday === 0 && result.getHours() >= 19) {
      result.setDate(result.getDate() + 7);
    } else if (daysUntilFriday > 0) {
      result.setDate(result.getDate() + daysUntilFriday);
    }
    
    result.setHours(19, 0, 0, 0);
    return result;
  }
  
  // Helper to get last Friday of month at 7 PM
  function getLastFridayOfMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay();
    const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    const lastFriday = new Date(lastDay);
    lastFriday.setDate(lastDay.getDate() - daysToSubtract);
    lastFriday.setHours(19, 0, 0, 0);
    return lastFriday;
  }
  
  // Weekly: next Friday at 7 PM
  const nextFriday = getNextFriday7PM(now);
  const weeklyOpenDate = new Date(nextFriday.getTime() - 7 * 24 * 60 * 60 * 1000);
  weeklyOpenDate.setHours(19, 0, 0, 0);
  
  // Monthly: last Friday of current month at 7 PM
  let lastFridayThisMonth = getLastFridayOfMonth(now.getFullYear(), now.getMonth());
  if (now >= lastFridayThisMonth) {
    const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    lastFridayThisMonth = getLastFridayOfMonth(nextYear, nextMonth);
  }
  
  // Generate cycle IDs
  const weeklyCycleId = `weekly-${nextFriday.getFullYear()}-${String(nextFriday.getMonth() + 1).padStart(2, '0')}-${String(nextFriday.getDate()).padStart(2, '0')}`;
  const monthlyCycleId = `monthly-${lastFridayThisMonth.getFullYear()}-${String(lastFridayThisMonth.getMonth() + 1).padStart(2, '0')}`;

  const drawData = [
    {
      name: "Weekly Token Jackpot",
      description: "Win up to 5,000 tokens every Friday at 7 PM! All members can enter.",
      cadence: "weekly",
      cycleId: weeklyCycleId,
      status: "open",
      startAt: weeklyOpenDate > now ? weeklyOpenDate : now,
      endAt: nextFriday,
      drawAt: nextFriday,
      prizePool: [
        { name: "5,000 Tokens", type: "tokens", value: 5000, quantity: 1 },
        { name: "2,000 Tokens", type: "tokens", value: 2000, quantity: 3 },
        { name: "500 Tokens", type: "tokens", value: 500, quantity: 10 }
      ],
      entryRules: { minAccountAgeDays: 1 },
      maxEntriesPerUser: 1,
      premiumEntriesPerUser: 2,
      isFeatured: true,
    },
    {
      name: "Monthly Card Giveaway",
      description: "S-Class exclusive! Win legendary and mythic cards on the last Friday of each month.",
      cadence: "monthly",
      cycleId: monthlyCycleId,
      status: "open",
      startAt: now,
      endAt: lastFridayThisMonth,
      drawAt: lastFridayThisMonth,
      prizePool: [
        { name: "Mythic Card Pack", type: "card", rarity: "mythic", quantity: 1 },
        { name: "Legendary Card Pack", type: "card", rarity: "legendary", quantity: 3 },
        { name: "30 Days S-Class", type: "premium_days", value: 30, quantity: 2 }
      ],
      entryRules: { premiumOnly: true, minAccountAgeDays: 7 },
      maxEntriesPerUser: 0,
      premiumEntriesPerUser: 1,
      isFeatured: true,
    },
  ];

  await db.insert(draws).values(drawData);
  console.log("✅ Draws seeded!");

  // Seed sample users for matching
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  const sampleUsers = [
    {
      email: "neokai@placeholder.local",
      username: "neokai",
      password: hashedPassword,
      name: "NeoKai",
      handle: "@neokai",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=neokai&backgroundColor=b6e3f4",
      bio: "Shonen enthusiast and card collector. Always looking for the next big adventure!",
      level: 42,
      followers: 1250,
      following: 890,
      tokens: 5000,
      isPremium: true,
      animeInterests: ["Naruto", "One Piece", "Dragon Ball"],
      theme: "cyberpunk",
    },
    {
      email: "sakurablossom@placeholder.local",
      username: "sakurablossom",
      password: hashedPassword,
      name: "Sakura Blossom",
      handle: "@sakurablossom",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sakura&backgroundColor=ffdfbf",
      bio: "Romance anime lover 💕 Currently watching: Fruits Basket",
      level: 28,
      followers: 890,
      following: 456,
      tokens: 2500,
      isPremium: true,
      premiumStartDate: new Date(),
      premiumEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      animeInterests: ["Fruits Basket", "Your Name", "Toradora"],
      theme: "cyberpunk",
    },
    {
      email: "shadowhunter@placeholder.local",
      username: "shadowhunter",
      password: hashedPassword,
      name: "Shadow Hunter",
      handle: "@shadowhunter",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=shadow&backgroundColor=c0aede",
      bio: "Dark fantasy anime fan. Hunter x Hunter changed my life.",
      level: 35,
      followers: 2100,
      following: 780,
      tokens: 3200,
      isPremium: false,
      animeInterests: ["Hunter x Hunter", "Attack on Titan", "Death Note"],
      theme: "cyberpunk",
    },
    {
      email: "mechaace@placeholder.local",
      username: "mechaace",
      password: hashedPassword,
      name: "Mecha Ace",
      handle: "@mechaace",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mecha&backgroundColor=d1d4f9",
      bio: "Giant robots are the peak of anime. Evangelion supremacy!",
      level: 50,
      followers: 3400,
      following: 1200,
      tokens: 8000,
      isPremium: true,
      animeInterests: ["Evangelion", "Gundam", "Code Geass"],
      theme: "cyberpunk",
    },
    {
      email: "kawaiiqueen@placeholder.local",
      username: "kawaiiqueen",
      password: hashedPassword,
      name: "Kawaii Queen",
      handle: "@kawaiiqueen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kawaii&backgroundColor=ffd5dc",
      bio: "Slice of life is best life! ✨ Collecting cute anime merch",
      level: 22,
      followers: 1800,
      following: 920,
      tokens: 1500,
      isPremium: false,
      animeInterests: ["K-On!", "Lucky Star", "Nichijou"],
      theme: "cyberpunk",
    },
    {
      email: "otakuking@placeholder.local",
      username: "otakuking",
      password: hashedPassword,
      name: "Otaku King",
      handle: "@otakuking",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=otaku&backgroundColor=bde4a7",
      bio: "Watching anime since 2005. Seen over 500 series. AMA!",
      level: 67,
      followers: 5600,
      following: 340,
      tokens: 12000,
      isPremium: true,
      animeInterests: ["Steins;Gate", "Monster", "Legend of Galactic Heroes"],
      theme: "cyberpunk",
    },
    {
      email: "animegamer@placeholder.local",
      username: "animegamer",
      password: hashedPassword,
      name: "Anime Gamer",
      handle: "@animegamer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gamer&backgroundColor=a8e6cf",
      bio: "Playing gacha games and watching seasonal anime. Always broke lol",
      level: 31,
      followers: 920,
      following: 650,
      tokens: 800,
      isPremium: false,
      animeInterests: ["Sword Art Online", "No Game No Life", "Log Horizon"],
      theme: "cyberpunk",
    },
    {
      email: "cosplaypro@placeholder.local",
      username: "cosplaypro",
      password: hashedPassword,
      name: "Cosplay Pro",
      handle: "@cosplaypro",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=cosplay&backgroundColor=ffeaa7",
      bio: "Cosplayer and anime convention regular. Next con: AnimeExpo!",
      level: 38,
      followers: 4200,
      following: 1100,
      tokens: 4500,
      isPremium: true,
      animeInterests: ["My Hero Academia", "Demon Slayer", "Jujutsu Kaisen"],
      theme: "cyberpunk",
    },
  ];

  await db.insert(users).values(sampleUsers);

  console.log("✅ Database seeded successfully!");
}

async function seedSampleUsers() {
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  const sampleUsers = [
    {
      email: "neokai@placeholder.local",
      username: "neokai",
      password: hashedPassword,
      name: "NeoKai",
      handle: "@neokai",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=neokai&backgroundColor=b6e3f4",
      bio: "Shonen enthusiast and card collector. Always looking for the next big adventure!",
      level: 42,
      followers: 1250,
      following: 890,
      tokens: 5000,
      isPremium: true,
      animeInterests: ["Naruto", "One Piece", "Dragon Ball"],
      theme: "cyberpunk",
    },
    {
      email: "sakurablossom@placeholder.local",
      username: "sakurablossom",
      password: hashedPassword,
      name: "Sakura Blossom",
      handle: "@sakurablossom",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sakura&backgroundColor=ffdfbf",
      bio: "Romance anime lover 💕 Currently watching: Fruits Basket",
      level: 28,
      followers: 890,
      following: 456,
      tokens: 2500,
      isPremium: true,
      premiumStartDate: new Date(),
      premiumEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      animeInterests: ["Fruits Basket", "Your Name", "Toradora"],
      theme: "cyberpunk",
    },
    {
      email: "shadowhunter@placeholder.local",
      username: "shadowhunter",
      password: hashedPassword,
      name: "Shadow Hunter",
      handle: "@shadowhunter",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=shadow&backgroundColor=c0aede",
      bio: "Dark fantasy anime fan. Hunter x Hunter changed my life.",
      level: 35,
      followers: 2100,
      following: 780,
      tokens: 3200,
      isPremium: false,
      animeInterests: ["Hunter x Hunter", "Attack on Titan", "Death Note"],
      theme: "cyberpunk",
    },
    {
      email: "mechaace@placeholder.local",
      username: "mechaace",
      password: hashedPassword,
      name: "Mecha Ace",
      handle: "@mechaace",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mecha&backgroundColor=d1d4f9",
      bio: "Giant robots are the peak of anime. Evangelion supremacy!",
      level: 50,
      followers: 3400,
      following: 1200,
      tokens: 8000,
      isPremium: true,
      animeInterests: ["Evangelion", "Gundam", "Code Geass"],
      theme: "cyberpunk",
    },
    {
      email: "kawaiiqueen@placeholder.local",
      username: "kawaiiqueen",
      password: hashedPassword,
      name: "Kawaii Queen",
      handle: "@kawaiiqueen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kawaii&backgroundColor=ffd5dc",
      bio: "Slice of life is best life! ✨ Collecting cute anime merch",
      level: 22,
      followers: 1800,
      following: 920,
      tokens: 1500,
      isPremium: false,
      animeInterests: ["K-On!", "Lucky Star", "Nichijou"],
      theme: "cyberpunk",
    },
    {
      email: "otakuking@placeholder.local",
      username: "otakuking",
      password: hashedPassword,
      name: "Otaku King",
      handle: "@otakuking",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=otaku&backgroundColor=bde4a7",
      bio: "Watching anime since 2005. Seen over 500 series. AMA!",
      level: 67,
      followers: 5600,
      following: 340,
      tokens: 12000,
      isPremium: true,
      animeInterests: ["Steins;Gate", "Monster", "Legend of Galactic Heroes"],
      theme: "cyberpunk",
    },
    {
      email: "animegamer@placeholder.local",
      username: "animegamer",
      password: hashedPassword,
      name: "Anime Gamer",
      handle: "@animegamer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gamer&backgroundColor=a8e6cf",
      bio: "Playing gacha games and watching seasonal anime. Always broke lol",
      level: 31,
      followers: 920,
      following: 650,
      tokens: 800,
      isPremium: false,
      animeInterests: ["Sword Art Online", "No Game No Life", "Log Horizon"],
      theme: "cyberpunk",
    },
    {
      email: "cosplaypro@placeholder.local",
      username: "cosplaypro",
      password: hashedPassword,
      name: "Cosplay Pro",
      handle: "@cosplaypro",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=cosplay&backgroundColor=ffeaa7",
      bio: "Cosplayer and anime convention regular. Next con: AnimeExpo!",
      level: 38,
      followers: 4200,
      following: 1100,
      tokens: 4500,
      isPremium: true,
      animeInterests: ["My Hero Academia", "Demon Slayer", "Jujutsu Kaisen"],
      theme: "cyberpunk",
    },
  ];

  await db.insert(users).values(sampleUsers);
  console.log("✅ Sample users added for matching!");
}

import { db } from "./db";
import { cards, communities, users } from "@shared/schema";
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

  // Seed sample users for matching
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  const sampleUsers = [
    {
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
      isPremium: false,
      animeInterests: ["Fruits Basket", "Your Name", "Toradora"],
      theme: "cyberpunk",
    },
    {
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
      isPremium: false,
      animeInterests: ["Fruits Basket", "Your Name", "Toradora"],
      theme: "cyberpunk",
    },
    {
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

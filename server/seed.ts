import { db } from "./db";
import { cards, communities } from "@shared/schema";

export async function seedDatabase() {
  // Check if already seeded
  const existingCards = await db.select().from(cards).limit(1);
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

  console.log("✅ Database seeded successfully!");
}

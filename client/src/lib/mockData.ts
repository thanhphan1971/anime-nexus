import { User, Post } from "./types";

// Asset Imports
import heroBg from "@assets/generated_images/futuristic_neo-tokyo_cityscape.png";
import avatar1 from "@assets/generated_images/anime_avatar_energetic_swordsman.png";
import avatar2 from "@assets/generated_images/anime_avatar_cyberpunk_hacker.png";
import avatar3 from "@assets/generated_images/anime_avatar_fantasy_mage.png";
import avatar4 from "@assets/generated_images/anime_avatar_mecha_pilot.png";

export const CURRENT_USER: User = {
  id: "u1",
  name: "NeoKai",
  handle: "@neokai_99",
  avatar: avatar1,
  bio: "Energetic swordsman from Neo Tokyo. Searching for the legendary blade.",
  stats: {
    level: 42,
    followers: "1.2k",
    following: 85,
  },
  badges: ["S-Rank", "Beta Tester"],
  theme: "cyberpunk",
};

export const USERS: User[] = [
  {
    id: "u2",
    name: "CyberRogue",
    handle: "@hacker_elite",
    avatar: avatar2,
    bio: "Living in the wires. If you can't hack it, you don't own it.",
    matchScore: 95,
    animeInterests: ["Ghost in the Shell", "Serial Experiments Lain", "Psycho-Pass"],
  },
  {
    id: "u3",
    name: "MysticRose",
    handle: "@magic_user",
    avatar: avatar3,
    bio: "Studying ancient runes. Looking for a party for the next raid.",
    matchScore: 88,
    animeInterests: ["Frieren", "Mushoku Tensei", "Black Clover"],
  },
  {
    id: "u4",
    name: "MechaAce",
    handle: "@pilot_01",
    avatar: avatar4,
    bio: "Get in the robot. Or don't. More glory for me.",
    matchScore: 72,
    animeInterests: ["Gundam", "Evangelion", "Code Geass"],
  },
];

export const POSTS: Post[] = [
  {
    id: "p1",
    userId: "u2",
    user: USERS[0],
    content: "Just upgraded my deck. The cyberspace runs are getting intense tonight! 🌃👾 #cyberpunk #netrunner",
    image: heroBg,
    likes: 124,
    comments: 18,
    timestamp: "2h ago",
  },
  {
    id: "p2",
    userId: "u3",
    user: USERS[1],
    content: "Practicing a new spell rotation. The mana density in this sector is unusually high today. ✨📜",
    likes: 89,
    comments: 12,
    timestamp: "5h ago",
  },
  {
    id: "p3",
    userId: "u4",
    user: USERS[2],
    content: "Maintenance day for Unit-01. Anyone know a good mechanic in Sector 7?",
    likes: 256,
    comments: 45,
    timestamp: "1d ago",
  },
];

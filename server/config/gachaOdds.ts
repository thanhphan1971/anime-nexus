// Gacha Odds Configuration
// Configurable drop rates for free vs paid summons

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface OddsTable {
  Common: number;
  Rare: number;
  Epic: number;
  Legendary: number;
  Mythic: number;
}

// Free Summon Odds (Standard Banner only - worse rates)
export const FREE_ODDS: OddsTable = {
  Common: 55,      // 55%
  Rare: 30,        // 30%
  Epic: 12,        // 12%
  Legendary: 2.8,  // 2.8%
  Mythic: 0.2,     // 0.2%
};

// Paid Summon Odds (Better rates)
export const PAID_ODDS: OddsTable = {
  Common: 40,      // 40%
  Rare: 35,        // 35%
  Epic: 18,        // 18%
  Legendary: 6,    // 6%
  Mythic: 1,       // 1%
};

// S-Class (Premium) Paid Odds (Best rates)
export const PREMIUM_PAID_ODDS: OddsTable = {
  Common: 30,      // 30%
  Rare: 35,        // 35%
  Epic: 23,        // 23%
  Legendary: 10,   // 10%
  Mythic: 2,       // 2%
};

// Daily free summon limits
export const FREE_SUMMON_LIMITS = {
  FREE_USER: 1,       // 1 free summon per day
  PREMIUM_USER: 2,    // 2 free summons per day (S-Class)
};

// Paid summon config
export const PAID_SUMMON_CONFIG = {
  COST: 100,          // 100 tokens per summon
  FREE_USER_CARDS: 1, // 1 card per paid summon for free users
  PREMIUM_USER_CARDS: 2, // 2 cards per paid summon for S-Class
};

// Select rarity based on odds table
export function selectRarity(oddsTable: OddsTable): Rarity {
  const roll = Math.random() * 100;
  let cumulative = 0;
  
  for (const [rarity, chance] of Object.entries(oddsTable)) {
    cumulative += chance;
    if (roll < cumulative) {
      return rarity as Rarity;
    }
  }
  
  return 'Common'; // Fallback
}

// Get the next reset time (midnight local time stored as UTC)
export function getNextResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

// Check if reset is needed (compare current time with stored reset time)
export function needsReset(resetAt: Date | null): boolean {
  if (!resetAt) return true;
  return new Date() >= new Date(resetAt);
}

// Game Configuration - Admin-configurable caps and settings
// These can be overridden via site_settings table

export const DEFAULT_GAME_CONFIG = {
  // Feature flags (can be overridden in site_settings)
  features: {
    fracture_trial_enabled: true,
    rewards_enabled: true,
    events_enabled: true,
    chronicle_posts_enabled: true,
  },

  // Daily run limits
  freeUserRewardedRuns: 3,
  freeUserMaxRuns: 5, // with social bonus
  premiumUserRewardedRuns: 6,
  premiumUserMaxRuns: 10,

  // Social bonus
  socialBonusRuns: 1,

  // Token economy caps
  dailyTokenCap: 500, // max tokens earnable per day
  consolationRewardMin: 5,
  consolationRewardMax: 15,

  // Trial types and their settings
  trials: {
    safe: {
      name: 'Safe Trial',
      description: 'Low risk, small but guaranteed reward',
      riskLevel: 'low',
      tokenCost: 0,
      rewardRange: { min: 10, max: 25 },
      criticalMultiplier: 1.5,
      successRate: 0.85, // 85% success rate
      criticalRate: 0.15, // 15% of successes are critical
      duration: 20, // seconds
      fractureCount: 3,
    },
    unstable: {
      name: 'Unstable Trial',
      description: 'Medium risk, higher potential reward',
      riskLevel: 'medium',
      tokenCost: 0,
      rewardRange: { min: 25, max: 50 },
      criticalMultiplier: 2.0,
      successRate: 0.65, // 65% success rate
      criticalRate: 0.20, // 20% of successes are critical
      duration: 25, // seconds
      fractureCount: 4,
    },
    overcharged: {
      name: 'Overcharged Trial',
      description: 'Token entry required. Highest risk, highest reward',
      riskLevel: 'high',
      tokenCost: 25, // costs 25 tokens to enter
      rewardRange: { min: 50, max: 100 },
      criticalMultiplier: 2.5,
      successRate: 0.45, // 45% success rate
      criticalRate: 0.25, // 25% of successes are critical
      duration: 30, // seconds
      fractureCount: 5,
    },
  },

  // Scheduled Events (scaffold)
  events: {
    maxEntriesPerDay: 3,
    freeEntriesPerDay: 1,
    extraEntryCost: 50, // tokens
    defaultDurationMinutes: 15,
    eventsPerDay: 4, // scheduled events
  },

  // Chronicle Post templates
  chronicleTemplates: {
    success: [
      'stabilized a Fracture in the Void Sector.',
      'contained an unstable energy surge successfully.',
      'sealed a dimensional tear in the Neon District.',
    ],
    critical_success: [
      'achieved a CRITICAL stabilization, uncovering a Relic Fragment!',
      'demonstrated exceptional control during a volatile Fracture event!',
      'mastered the chaos and earned bonus rewards!',
    ],
    failure: [
      'faced a Fracture that slipped away, but earned consolation rewards.',
      'encountered a resistant anomaly. Partial recovery achieved.',
      'survived a difficult trial. The experience strengthened their resolve.',
    ],
  },
};

export type TrialType = 'safe' | 'unstable' | 'overcharged';
export type GameOutcome = 'success' | 'critical_success' | 'failure';

export interface TrialConfig {
  name: string;
  description: string;
  riskLevel: string;
  tokenCost: number;
  rewardRange: { min: number; max: number };
  criticalMultiplier: number;
  successRate: number;
  criticalRate: number;
  duration: number;
  fractureCount: number;
}

// Helper to get config with site_settings overrides
export function getGameConfig(siteSettings?: Record<string, string>) {
  const config = { ...DEFAULT_GAME_CONFIG };
  
  if (siteSettings) {
    // Override feature flags
    if (siteSettings.fracture_trial_enabled !== undefined) {
      config.features.fracture_trial_enabled = siteSettings.fracture_trial_enabled === 'true';
    }
    if (siteSettings.rewards_enabled !== undefined) {
      config.features.rewards_enabled = siteSettings.rewards_enabled === 'true';
    }
    if (siteSettings.events_enabled !== undefined) {
      config.features.events_enabled = siteSettings.events_enabled === 'true';
    }
    if (siteSettings.chronicle_posts_enabled !== undefined) {
      config.features.chronicle_posts_enabled = siteSettings.chronicle_posts_enabled === 'true';
    }

    // Override caps
    if (siteSettings.free_user_rewarded_runs) {
      config.freeUserRewardedRuns = parseInt(siteSettings.free_user_rewarded_runs);
    }
    if (siteSettings.premium_user_rewarded_runs) {
      config.premiumUserRewardedRuns = parseInt(siteSettings.premium_user_rewarded_runs);
    }
    if (siteSettings.daily_token_cap) {
      config.dailyTokenCap = parseInt(siteSettings.daily_token_cap);
    }
  }

  return config;
}

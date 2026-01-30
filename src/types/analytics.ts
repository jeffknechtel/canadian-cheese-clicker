// ===== Analytics Event Types =====

/**
 * Base analytics event interface
 * All events include common metadata
 */
export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
}

/**
 * Union type of all game events for type safety
 */
export type GameEvent =
  // Session events
  | { type: 'session_start'; data: { returning: boolean; lastSessionMs?: number } }
  | { type: 'session_end'; data: { duration: number; curdsEarned: number } }

  // Core gameplay events
  | { type: 'click'; data: { count: number; totalClicks: number } }
  | { type: 'generator_purchase'; data: { generatorId: string; count: number; totalOwned: number } }
  | { type: 'upgrade_purchase'; data: { upgradeId: string } }

  // Achievement events
  | { type: 'achievement_unlock'; data: { achievementId: string; totalUnlocked: number } }

  // Prestige events
  | { type: 'prestige'; data: { tier: 'aging' | 'vintage' | 'legacy'; rennetGained?: number; wheelsGained?: number } }

  // Combat events
  | { type: 'combat_start'; data: { zoneId: string; stageNumber: number; isBoss: boolean } }
  | { type: 'combat_end'; data: { zoneId: string; stageNumber: number; result: 'victory' | 'defeat' | 'flee'; durationMs: number } }

  // Hero events
  | { type: 'hero_recruit'; data: { heroId: string; totalRecruited: number } }
  | { type: 'hero_level_up'; data: { heroId: string; newLevel: number } }

  // Crafting events
  | { type: 'crafting_start'; data: { recipeId: string; caveId: string } }
  | { type: 'crafting_complete'; data: { recipeId: string; quality: number } }
  | { type: 'cheese_consume'; data: { recipeId: string; quality: number } }

  // Settings events
  | { type: 'settings_change'; data: { setting: string; value: unknown } }

  // Milestone events
  | { type: 'milestone_reached'; data: { milestone: number; totalCurdsEarned: number; experimentId?: string; variant?: string; conversionEvent?: string } }

  // Error events
  | { type: 'error'; data: { message: string; stack?: string; context?: string } };

/**
 * Session statistics tracked throughout a session
 */
export interface SessionStats {
  sessionId: string;
  startTime: number;
  totalClicks: number;
  totalCurdsEarned: number;
  generatorsPurchased: number;
  upgradesPurchased: number;
  achievementsUnlocked: number;
  combatBattles: number;
  combatWins: number;
}

/**
 * A/B testing experiment configuration
 */
export interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights: number[]; // Must sum to 1
  isActive: boolean;
}

/**
 * User's assigned variants for active experiments
 */
export interface ExperimentAssignments {
  [experimentId: string]: {
    variant: string;
    assignedAt: number;
  };
}

/**
 * Privacy consent state
 */
export interface PrivacyConsent {
  analyticsEnabled: boolean;
  consentedAt: number | null;
  version: number; // Consent version, increment when policy changes
}

export const CURRENT_CONSENT_VERSION = 1;

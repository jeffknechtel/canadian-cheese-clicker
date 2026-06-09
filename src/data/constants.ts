/**
 * Centralized game balance constants.
 * Single source of truth for values used across multiple data files.
 */

// ===== Generator Balance =====

/** Cost multiplier for all generators (exponential scaling) */
export const GENERATOR_COST_MULTIPLIER = 1.15;

// ===== Zone/Enemy Balance =====

/** Enemy level scaling per stage within a zone */
export const ENEMY_LEVEL_SCALE = 1.15;

/** Default number of stages per zone */
export const STAGES_PER_ZONE = 10;

// ===== Hero Balance =====

/** Maximum hero level */
export const HERO_MAX_LEVEL = 50;

/** Base XP required for level 2 */
export const BASE_XP_REQUIREMENT = 100;

/** XP requirement multiplier per level */
export const XP_MULTIPLIER_PER_LEVEL = 1.5;

// ===== Formation Bonuses =====

/** Bonus for tank in front row */
export const FORMATION_TANK_FRONT_BONUS = 0.05;

/** Bonus for healer in back row */
export const FORMATION_HEALER_BACK_BONUS = 0.05;

/** Bonus for full party (4 heroes) */
export const FORMATION_FULL_PARTY_BONUS = 0.1;

// ===== Prestige Multipliers =====

/** Production bonus per rennet point (Aging tier) */
export const RENNET_PRODUCTION_MULTIPLIER = 0.01;

/** Production bonus per vintage wheel (Vintage tier) */
export const VINTAGE_WHEEL_MULTIPLIER = 0.05;

/** Production bonus per legacy point (Legacy tier) */
export const LEGACY_POINT_MULTIPLIER = 0.01;

/** Maximum prestige cost reduction (90%) */
export const MAX_PRESTIGE_COST_REDUCTION = 0.9;

// ===== Cheese Crafting =====

/** Cheese affinity divisor for quality calculation */
export const CHEESE_AFFINITY_DIVISOR = 1000;

// ===== Game Loop =====

/** Game logic tick interval in milliseconds */
export const GAME_TICK_INTERVAL_MS = 100;

/** Mobile device tick interval (slower for battery) */
export const MOBILE_TICK_INTERVAL_MS = 150;

/** Target frame rate for rendering */
export const TARGET_FPS = 60;

/** Frame budget in milliseconds (1000 / TARGET_FPS) */
export const FRAME_BUDGET_MS = 16;

// ===== Combat Balance =====

/** Maximum ATB gauge value */
export const ATB_MAX = 100;

/** Base ATB fill rate per tick */
export const BASE_ATB_RATE = 10;

/** Maximum limit break gauge value */
export const LIMIT_BREAK_MAX = 100;

/** Limit break gain from dealing damage (% of damage) */
export const LIMIT_BREAK_GAIN_FROM_DEALT = 0.01;

/** Limit break gain from taking damage (% of damage) */
export const LIMIT_BREAK_GAIN_FROM_TAKEN = 0.05;

/** HP percentage threshold for "low health" (red) */
export const HP_LOW_THRESHOLD = 25;

/** HP percentage threshold for "medium health" (yellow) */
export const HP_MEDIUM_THRESHOLD = 50;

/** Defense formula divisor: damage = attack * (1 - defense / (defense + DEFENSE_DIVISOR)) */
export const DEFENSE_DIVISOR = 100;

/** Minimum damage variance multiplier */
export const DAMAGE_VARIANCE_MIN = 0.9;

/** Maximum damage variance multiplier */
export const DAMAGE_VARIANCE_MAX = 1.1;

/** Random ATB start variance for enemies (0 to this value) */
export const INITIAL_ATB_VARIANCE = 20;

/** Boss HP recovery on phase transition (% of max HP) */
export const BOSS_PHASE_HEAL_PERCENT = 0.1;

// ===== Cheese Crafting Quality/Value =====

/** Base multiplier for cheese sell value at quality 1 */
export const CHEESE_SELL_QUALITY_BASE = 0.5;

/** Additional multiplier per quality point for cheese sell value */
export const CHEESE_SELL_QUALITY_SCALE = 1.5;

/** Base multiplier for buff effect at quality 1 */
export const BUFF_QUALITY_BASE = 0.5;

/** Additional multiplier per quality point for buff effect */
export const BUFF_QUALITY_SCALE = 1.0;

// ===== Eh Multiplier =====

/** Number of Eh clicks per multiplier tier */
export const EH_DIVISOR = 100;

/** Bonus multiplier per Eh tier (1% = 0.01) */
export const EH_BONUS_PER_TIER = 0.01;

// ===== Offline Progress =====

/** Maximum offline progress in seconds (8 hours) */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

// ===== Combat Log =====

/** Maximum number of combat log entries to keep */
export const COMBAT_LOG_MAX_ENTRIES = 100;

// ===== Boss Reward Multipliers =====

/** Default multiplier for any boss not in the table */
export const DEFAULT_BOSS_REWARD_MULTIPLIER = { curds: 1.0, xp: 1.0, wheyPercent: 0.1 };

/** Boss-specific reward multipliers by boss ID */
export const BOSS_REWARD_MULTIPLIERS: Record<string, { curds: number; xp: number; wheyPercent: number }> = {
  // Province Bosses (difficulty scales with zone order)
  bland_baron: { curds: 1.5, xp: 2.0, wheyPercent: 0.15 },
  fromage_fantome: { curds: 1.6, xp: 2.1, wheyPercent: 0.16 },
  oil_slick_sally: { curds: 1.7, xp: 2.2, wheyPercent: 0.17 },
  wheat_witch: { curds: 1.8, xp: 2.3, wheyPercent: 0.18 },
  pacific_rim_crab: { curds: 1.9, xp: 2.4, wheyPercent: 0.19 },
  frozen_goalie: { curds: 2.0, xp: 2.5, wheyPercent: 0.20 },
  the_kraken: { curds: 2.1, xp: 2.6, wheyPercent: 0.21 },
  headless_lumberjack: { curds: 2.2, xp: 2.7, wheyPercent: 0.22 },
  annes_dark_side: { curds: 2.3, xp: 2.8, wheyPercent: 0.23 },
  iceberg_leviathan: { curds: 2.4, xp: 2.9, wheyPercent: 0.24 },
  the_wendigo: { curds: 2.5, xp: 3.0, wheyPercent: 0.25 },
  aurora_serpent: { curds: 2.6, xp: 3.1, wheyPercent: 0.26 },
  sedna: { curds: 2.7, xp: 3.2, wheyPercent: 0.27 },
  // Mythology Bosses (hardest content)
  chaos_incarnate: { curds: 3.0, xp: 4.0, wheyPercent: 0.30 },
  wendigo_prime: { curds: 3.5, xp: 4.5, wheyPercent: 0.35 },
  devil_of_the_deal: { curds: 4.0, xp: 5.0, wheyPercent: 0.40 },
};

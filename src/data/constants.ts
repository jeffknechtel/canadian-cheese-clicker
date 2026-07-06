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

/** Per-type interaction limits during cheese aging */
export const INTERACTION_LIMITS: Record<string, number> = {
  rind_wash: 3,
  turn: 10,
  flavor_addition: 2,
  brine: 5,
  smoke: 2,
  press: 3,
};

// ===== Game Loop =====

/** Game logic tick interval in milliseconds */
export const GAME_TICK_INTERVAL_MS = 100;

/** Mobile device tick interval (slower for battery) */
export const MOBILE_TICK_INTERVAL_MS = 150;

/** Target frame rate for rendering */
export const TARGET_FPS = 60;

/** Frame budget in milliseconds (1000 / TARGET_FPS) */
export const FRAME_BUDGET_MS = 16;

/** Seasonal event lifecycle check interval (hourly, not per-tick) */
export const EVENT_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Periodic achievement check interval for pure-idle players */
export const ACHIEVEMENT_CHECK_INTERVAL_MS = 5000;

/**
 * Cap on per-frame delta to prevent huge jumps if the tab was hidden.
 * NOTE (S-6): the loop clamps BEFORE accumulating, so time beyond the cap is
 * dropped rather than deferred — behavior preserved here, only the number named.
 */
export const MAX_TICK_DELTA_MS = 100;

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

// ===== Combat UI =====

/**
 * Feedback overlay grid positions (percentage coordinates) for damage/heal
 * numbers: column base x, alternating-slot x stagger, row base y and height.
 */
export const COMBAT_FEEDBACK_GRID = {
  hero: { baseX: 20, staggerX: 5, baseY: 15, rowHeight: 18 },
  enemy: { baseX: 75, staggerX: 5, baseY: 20, rowHeight: 12 },
} as const;

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

// ===== Synergy Balance =====

/** Synergy: Additional Eh bonus per tier when "The Canadian Way" purchased */
export const SYNERGY_EH_BONUS_ADDITION = 0.01;

/** Synergy: Generator bonus per zone cleared for "Battle-Hardened Vats" */
export const SYNERGY_ZONE_GENERATOR_BONUS = 0.05;

/** Synergy: Combat damage bonus when buffs active for "Cheese-Fueled Warriors" */
export const SYNERGY_BUFF_COMBAT_DAMAGE = 0.25;

/** Synergy: Affinity divisor for crafting speed for "Fromage Affinity" */
export const SYNERGY_AFFINITY_CRAFTING_DIVISOR = 10;

/** Synergy: Full party formation bonus for "Combat Harmony" (replaces base +10%) */
export const SYNERGY_FULL_PARTY_FORMATION_BONUS = 0.25;

// ===== Progressive Unlock Thresholds =====

/** Total curds earned to unlock each feature tab/panel */
export const UNLOCK_THRESHOLDS = {
  upgrades: 0,                // Available immediately (generators need upgrades)
  combat: 1_000,              // After first few generators
  heroes: 10_000,             // After first combat attempts
  crafting: 100_000,          // Mid-game feature
  prestige: 1_000_000_000_000, // 1T curds (prestige becomes viable)
  achievements: 100,          // Show early to give goals
  generatorRevealAhead: 2,    // Show N generators ahead of what player can afford
} as const;

// ===== Offline Progress =====

/** Maximum offline progress in seconds (8 hours) */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

// ===== Combat Log =====

/** Maximum number of combat log entries to keep */
export const COMBAT_LOG_MAX_ENTRIES = 100;

// ===== Cheese Wheel Visual Tiers =====

/** Production milestones that trigger visual evolution of the cheese wheel */
export const CHEESE_WHEEL_TIERS = [
  { threshold: 0, texture: 'basic', holes: 0, wedges: 0, glow: false, label: 'Fresh Curd' },
  { threshold: 1_000, texture: 'aged', holes: 3, wedges: 0, glow: false, label: 'Young Cheese' },
  { threshold: 100_000, texture: 'mature', holes: 6, wedges: 0, glow: false, label: 'Aged Cheese' },
  { threshold: 10_000_000, texture: 'vintage', holes: 9, wedges: 1, glow: false, label: 'Vintage Wheel' },
  { threshold: 1_000_000_000, texture: 'artisan', holes: 12, wedges: 2, glow: true, label: 'Artisan Masterpiece' },
  { threshold: 1_000_000_000_000, texture: 'legendary', holes: 15, wedges: 4, glow: true, label: 'Legendary Fromage' },
] as const;

export type CheeseWheelTier = (typeof CHEESE_WHEEL_TIERS)[number];
export type CheeseTextureType = CheeseWheelTier['texture'];

// ===== Click Critical Hit Mechanics =====

/** Base chance for a click to be a critical hit (5%) */
export const CLICK_CRIT_BASE_CHANCE = 0.05;

/** Base damage multiplier for critical clicks */
export const CLICK_CRIT_BASE_MULTIPLIER = 2;

/** Maximum crit chance from upgrades (50%) */
export const CLICK_CRIT_CHANCE_CAP = 0.5;

// ===== Buy Milestones =====

/** Generator purchase counts that trigger milestone celebrations */
export const BUY_MILESTONES = [25, 50, 100, 150, 200, 250, 300, 400, 500] as const;
export type BuyMilestone = (typeof BUY_MILESTONES)[number];

/** Production multiplier per milestone reached (cumulative: 1.5^milestones) */
export const MILESTONE_MULTIPLIER = 1.5;

// ===== Golden Cheese =====

/** Minimum delay before the next golden cheese spawns */
export const MIN_SPAWN_DELAY_MS = 3 * 60 * 1000; // 3 minutes

/** Maximum delay before the next golden cheese spawns */
export const MAX_SPAWN_DELAY_MS = 10 * 60 * 1000; // 10 minutes

/** How long a spawned golden cheese stays clickable */
export const VISIBLE_DURATION_MS = 15 * 1000; // 15 seconds

/* Reward durations */
export const CHEESE_FRENZY_DURATION_MS = 77 * 1000;
export const CLICK_STORM_DURATION_MS = 13 * 1000;
export const HERO_RALLY_DURATION_MS = 60 * 1000;
export const CURD_TSUNAMI_DURATION_MS = 7 * 1000;

/* Reward multipliers */
export const CHEESE_FRENZY_MULTIPLIER = 7;
export const CLICK_STORM_MULTIPLIER = 77;
export const HERO_RALLY_MULTIPLIER = 5;
export const CURD_TSUNAMI_MULTIPLIER = 777;
export const LUCKY_CURDS_MINUTES = 15;

/** Lifetime-collection perk tiers. Cumulative; derived from goldenCheese.totalCollected. */
export const GOLDEN_CHEESE_META_TIERS = [
  { collected: 10, perk: 'spawnWindow1' },  // max spawn delay 10 → 8 min
  { collected: 25, perk: 'buffDuration' },  // golden buff durations ×1.25
  { collected: 50, perk: 'spawnWindow2' },  // spawn window → 2–7 min
  { collected: 100, perk: 'goldenRush' },   // 10% chance on collect: next spawn in 15–45 s
] as const;
export type GoldenCheeseMetaPerk = (typeof GOLDEN_CHEESE_META_TIERS)[number]['perk'];

export const GOLDEN_RUSH_CHANCE = 0.1;
export const GOLDEN_RUSH_DELAY_MS = { min: 15_000, max: 45_000 };
export const WELCOME_BACK_SPAWN_DELAY_MS = 30_000;
export const WELCOME_BACK_MIN_OFFLINE_MS = 60 * 60 * 1000; // 1 hour

/** Buff duration multiplier when buffDuration perk is unlocked */
export const GOLDEN_BUFF_DURATION_MULTIPLIER = 1.25;

// ===== UI Timing =====

/** Minimum delay between random Canadian dialogue bubbles */
export const RANDOM_DIALOGUE_MIN_MS = 60_000;

/** Maximum delay between random Canadian dialogue bubbles */
export const RANDOM_DIALOGUE_MAX_MS = 120_000;

/** Milestone check interval */
export const MILESTONE_CHECK_INTERVAL_MS = 1000;

// ===== Boss Reward Multipliers =====

// ===== Elemental Damage Multipliers =====

/** Damage multiplier when attacking a weakness */
export const WEAKNESS_DAMAGE_MULTIPLIER = 1.5;

/** Damage multiplier when attacking a resistance */
export const RESISTANCE_DAMAGE_MULTIPLIER = 0.5;

// ===== Vintage/Legacy Gate Constants =====

/** Number of aging resets required to unlock Vintage */
export const VINTAGE_AGING_RESETS_REQUIRED = 10;

/** Rennet cost for Vintage reset */
export const VINTAGE_RENNET_COST = 100;

/** Number of vintage resets required to unlock Legacy */
export const LEGACY_VINTAGE_RESETS_REQUIRED = 10;

/** Vintage wheels required (and consumed) for a Legacy reset */
export const LEGACY_WHEELS_REQUIRED = 10;

/** Bonus curd rewards per legacy point in the battle's province (+10%/point) */
export const LEGACY_PROVINCE_COMBAT_BONUS = 0.10;

// ===== Combat CPS Scaling =====

/** Combat curd rewards are floored at seconds-of-CPS so battles always pay. */
export const STAGE_REWARD_CPS_SECONDS_BASE = 15;
export const STAGE_REWARD_CPS_SECONDS_PER_STAGE = 3;
export const BOSS_REWARD_CPS_SECONDS = 180;

// ===== Boss Rewards =====

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

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

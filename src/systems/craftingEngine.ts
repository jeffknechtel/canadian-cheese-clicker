import Decimal from 'decimal.js';
import type {
  CheeseRecipe,
  CraftingJob,
  CraftingInteraction,
  CheeseEffect,
  Ingredient,
  IngredientUnlockRequirement,
  RecipeUnlockRequirement,
  CaveUnlockRequirement,
} from '../types/game';
import { getCaveById } from '../data/caves';
import {
  getIngredientById,
  getMilkByType,
  getCultureByType,
  getRennetByType,
} from '../data/ingredients';
import { Quality } from '../domain/valueObjects';

/**
 * Crafting Engine for The Great Canadian Cheese Quest
 *
 * Handles all crafting calculations:
 * - Quality calculations (from ingredients, caves, interactions)
 * - Cheese value based on quality
 * - Unlock requirement verification
 * - Buff effect scaling
 */

// ===== Unlock Requirement Service =====

/**
 * Union of all crafting-related unlock requirements.
 */
export type CraftingUnlockRequirement =
  | IngredientUnlockRequirement
  | RecipeUnlockRequirement
  | CaveUnlockRequirement;

/**
 * Read-only view into cross-context state needed for unlock requirements.
 * Makes crafting's upstream dependencies declared rather than ambient.
 */
export interface UnlockContext {
  readonly totalRennet: number;
  readonly totalVintageWheels: number;
  readonly achievements: readonly string[];
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
  readonly unlockedCaves: readonly string[];
  readonly cheeseCollection: Record<string, number>;
}

/**
 * Evaluates whether an unlock requirement is satisfied.
 * Single source of truth — replaces 7 copy-pasted switches.
 */
export function checkUnlockRequirement(
  req: CraftingUnlockRequirement,
  ctx: UnlockContext
): boolean {
  switch (req.type) {
    case 'none':
      return true;
    case 'prestige_rennet':
      return ctx.totalRennet >= req.amount;
    case 'prestige_vintage':
      return ctx.totalVintageWheels >= req.amount;
    case 'achievement':
      return ctx.achievements.includes(req.achievementId);
    case 'province':
    case 'province_complete':
      return ctx.zoneProgress[req.provinceId]?.bossDefeated ?? false;
    case 'cave_unlocked':
      return ctx.unlockedCaves.includes(req.caveId);
    case 'cave_level':
      return ctx.unlockedCaves.includes(req.caveId);
    case 'cheese_crafted':
      return (ctx.cheeseCollection[req.recipeId] ?? 0) >= req.count;
    default:
      return false;
  }
}

// ===== Quality Calculations =====

/**
 * Get the quality modifier for an ingredient
 */
function getIngredientQualityModifier(ingredient: Ingredient | undefined): number {
  return ingredient?.qualityModifier ?? 0;
}

/**
 * Calculate final quality from a job that has pre-computed qualityBonus.
 * This is the primary entry point for collectCheese.
 */
export function calculateCheeseQualityFromJob(
  recipe: CheeseRecipe,
  job: CraftingJob
): number {
  let quality = recipe.baseQuality + job.qualityBonus;
  for (const interaction of job.interactions) {
    quality += interaction.qualityEffect;
  }
  return Quality.of(quality).toNumber();
}

/**
 * Calculate quality bonus from ingredients only (for preview before starting)
 */
export function calculateIngredientQualityBonus(
  ingredients: CraftingJob['ingredients']
): number {
  let bonus = 0;

  const milk = getMilkByType(ingredients.milkType);
  bonus += getIngredientQualityModifier(milk);

  const culture = getCultureByType(ingredients.cultureType);
  bonus += getIngredientQualityModifier(culture);

  const rennet = getRennetByType(ingredients.rennetType);
  bonus += getIngredientQualityModifier(rennet);

  for (const itemId of ingredients.specialtyItems) {
    const item = getIngredientById(itemId);
    bonus += getIngredientQualityModifier(item);
  }

  return bonus;
}

// ===== Value Calculations =====

/**
 * Calculate the curd value of a cheese based on quality
 *
 * Value formula:
 * baseValue = recipe.baseValue
 * qualityMultiplier = CHEESE_SELL_QUALITY_BASE + (quality / 100) * CHEESE_SELL_QUALITY_SCALE
 * finalValue = baseValue * qualityMultiplier
 */
export function calculateCheeseValue(
  recipe: CheeseRecipe,
  quality: number
): Decimal {
  const qualityMultiplier = Quality.of(quality).toSellMultiplier();
  return recipe.baseValue.mul(qualityMultiplier);
}

// ===== Buff Effect Calculations =====

/**
 * Calculate a quality-scaled buff effect.
 * Delegates scaling to Quality value object.
 */
export function calculateBuffEffect(
  effect: CheeseEffect,
  quality: number
): CheeseEffect {
  const qualityMultiplier = Quality.of(quality).toBuffScale();

  const scaledEffect = { ...effect };

  // Scale multiplier-based effects
  if ('multiplier' in scaledEffect && typeof scaledEffect.multiplier === 'number') {
    // For multipliers, scale the bonus portion: (mult - 1) * qualityMult + 1
    const bonus = (scaledEffect.multiplier - 1) * qualityMultiplier;
    scaledEffect.multiplier = 1 + bonus;
  }

  // Scale value-based effects (hero buffs)
  if ('value' in scaledEffect && typeof scaledEffect.value === 'number') {
    scaledEffect.value = Math.round(scaledEffect.value * qualityMultiplier);
  }

  return scaledEffect;
}

// ===== Cave Capacity Calculations =====

/**
 * Get the number of used slots in a cave (internal helper)
 */
function getCaveUsedSlots(
  caveId: string,
  activeJobs: CraftingJob[]
): number {
  return activeJobs.filter((job) => job.caveId === caveId).length;
}

/**
 * Get the number of available slots in a cave
 */
export function getCaveAvailableSlots(
  caveId: string,
  activeJobs: CraftingJob[]
): number {
  const cave = getCaveById(caveId);
  if (!cave) return 0;

  const usedSlots = getCaveUsedSlots(caveId, activeJobs);
  return Math.max(0, cave.capacity - usedSlots);
}

// ===== Interaction Quality Effects =====

/**
 * Calculate quality effect for different interaction types
 */
export function getInteractionQualityEffect(
  interactionType: CraftingInteraction['type'],
  itemId?: string
): number {
  switch (interactionType) {
    case 'rind_wash':
      return 3; // Washing the rind adds +3 quality
    case 'turn':
      return 1; // Turning the cheese adds +1 quality
    case 'flavor_addition':
      // Flavor additions use the item's quality modifier
      if (itemId) {
        const item = getIngredientById(itemId);
        return item?.qualityModifier ?? 2;
      }
      return 2;
    default:
      return 0;
  }
}

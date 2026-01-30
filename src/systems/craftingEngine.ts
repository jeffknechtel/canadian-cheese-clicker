import Decimal from 'decimal.js';
import type {
  GameState,
  CheeseRecipe,
  AffinageCave,
  CraftingJob,
  CraftingInteraction,
  CheeseEffect,
  Ingredient,
} from '../types/game';
import { getRecipeById, CHEESE_RECIPES } from '../data/cheeseRecipes';
import { getCaveById, CAVES } from '../data/caves';
import {
  getIngredientById,
  getMilkByType,
  getCultureByType,
  getRennetByType,
} from '../data/ingredients';

/**
 * Crafting Engine for The Great Canadian Cheese Quest
 *
 * Handles all crafting calculations:
 * - Ingredient costs
 * - Quality calculations (from ingredients, caves, interactions)
 * - Cheese value based on quality
 * - Aging progress tracking
 * - Unlock requirement verification
 * - Buff effect scaling
 */

// ===== Ingredient Cost Calculations =====

/**
 * Calculate the total cost of ingredients for a crafting job
 */
export function calculateIngredientCost(
  ingredients: CraftingJob['ingredients']
): { curds: Decimal; whey: Decimal } {
  let curdsCost = new Decimal(0);
  let wheyCost = new Decimal(0);

  // Get milk cost
  const milk = getMilkByType(ingredients.milkType);
  if (milk) {
    if (milk.costCurrency === 'curds') {
      curdsCost = curdsCost.plus(milk.cost);
    } else {
      wheyCost = wheyCost.plus(milk.cost);
    }
  }

  // Get culture cost
  const culture = getCultureByType(ingredients.cultureType);
  if (culture) {
    if (culture.costCurrency === 'curds') {
      curdsCost = curdsCost.plus(culture.cost);
    } else {
      wheyCost = wheyCost.plus(culture.cost);
    }
  }

  // Get rennet cost
  const rennet = getRennetByType(ingredients.rennetType);
  if (rennet) {
    if (rennet.costCurrency === 'curds') {
      curdsCost = curdsCost.plus(rennet.cost);
    } else {
      wheyCost = wheyCost.plus(rennet.cost);
    }
  }

  // Add specialty item costs
  for (const itemId of ingredients.specialtyItems) {
    const item = getIngredientById(itemId);
    if (item) {
      if (item.costCurrency === 'curds') {
        curdsCost = curdsCost.plus(item.cost);
      } else {
        wheyCost = wheyCost.plus(item.cost);
      }
    }
  }

  return { curds: curdsCost, whey: wheyCost };
}

/**
 * Calculate the cost of a single ingredient
 */
export function calculateSingleIngredientCost(
  ingredientId: string,
  quantity: number = 1
): { curds: Decimal; whey: Decimal } {
  const ingredient = getIngredientById(ingredientId);
  if (!ingredient) {
    return { curds: new Decimal(0), whey: new Decimal(0) };
  }

  const totalCost = ingredient.cost.mul(quantity);

  if (ingredient.costCurrency === 'curds') {
    return { curds: totalCost, whey: new Decimal(0) };
  } else {
    return { curds: new Decimal(0), whey: totalCost };
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
 * Calculate the final quality of a cheese
 *
 * Quality formula:
 * baseQuality = recipe.baseQuality
 * milkBonus = milkType.qualityModifier (cow: 0, goat: +5, sheep: +10, etc.)
 * cultureBonus = cultureType.qualityModifier (basic: 0, artisan: +10, legendary: +20)
 * rennetBonus = rennetType.qualityModifier
 * caveBonus = cave.qualityBonus
 * interactionBonus = sum(interactions.qualityEffect)
 * finalQuality = clamp(baseQuality + milkBonus + cultureBonus + rennetBonus + caveBonus + interactionBonus, 1, 100)
 */
export function calculateCheeseQuality(
  recipe: CheeseRecipe,
  ingredients: CraftingJob['ingredients'],
  cave: AffinageCave,
  interactions: CraftingInteraction[]
): number {
  let quality = recipe.baseQuality;

  // Add milk quality modifier
  const milk = getMilkByType(ingredients.milkType);
  quality += getIngredientQualityModifier(milk);

  // Add culture quality modifier
  const culture = getCultureByType(ingredients.cultureType);
  quality += getIngredientQualityModifier(culture);

  // Add rennet quality modifier
  const rennet = getRennetByType(ingredients.rennetType);
  quality += getIngredientQualityModifier(rennet);

  // Add specialty item quality modifiers
  for (const itemId of ingredients.specialtyItems) {
    const item = getIngredientById(itemId);
    quality += getIngredientQualityModifier(item);
  }

  // Add cave quality bonus
  quality += cave.qualityBonus;

  // Add interaction bonuses
  for (const interaction of interactions) {
    quality += interaction.qualityEffect;
  }

  // Clamp quality between 1 and 100
  return Math.max(1, Math.min(100, quality));
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
 * qualityMultiplier = 0.5 + (quality / 100) * 1.5  // Quality 1 = 0.5x, Quality 100 = 2x
 * finalValue = baseValue * qualityMultiplier
 */
export function calculateCheeseValue(
  recipe: CheeseRecipe,
  quality: number
): Decimal {
  const qualityMultiplier = 0.5 + (quality / 100) * 1.5;
  return recipe.baseValue.mul(qualityMultiplier);
}

/**
 * Calculate cheese value by recipe ID and quality
 */
export function calculateCheeseValueById(
  recipeId: string,
  quality: number
): Decimal {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return new Decimal(0);
  return calculateCheeseValue(recipe, quality);
}

// ===== Aging Progress Calculations =====

/**
 * Calculate the aging progress of a job (0-100)
 */
export function calculateAgingProgress(
  job: CraftingJob,
  currentTime: number
): number {
  const totalDuration = job.endTime - job.startTime;

  // Fresh cheeses (duration 0) are instantly complete
  if (totalDuration === 0) return 100;

  const elapsed = currentTime - job.startTime;
  const progress = (elapsed / totalDuration) * 100;

  return Math.min(100, Math.max(0, progress));
}

/**
 * Check if a crafting job is complete
 */
export function isJobComplete(
  job: CraftingJob,
  currentTime: number
): boolean {
  return currentTime >= job.endTime;
}

/**
 * Get remaining time for a job in milliseconds
 */
export function getJobRemainingTime(
  job: CraftingJob,
  currentTime: number
): number {
  const remaining = job.endTime - currentTime;
  return Math.max(0, remaining);
}

/**
 * Format remaining time as human-readable string
 */
export function formatRemainingTime(remainingMs: number): string {
  if (remainingMs <= 0) return 'Ready!';

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// ===== Unlock Requirement Checks =====

/**
 * Check if a recipe can be unlocked given current game state
 */
export function canUnlockRecipe(
  recipe: CheeseRecipe,
  state: GameState
): boolean {
  // Already unlocked
  if (state.crafting.unlockedRecipes.includes(recipe.id)) return false;

  const req = recipe.unlockRequirement;
  if (!req || req.type === 'none') return true;

  switch (req.type) {
    case 'prestige_rennet':
      return state.prestige.totalRennet >= req.amount;
    case 'prestige_vintage':
      return state.prestige.totalVintageWheels >= req.amount;
    case 'cheese_crafted':
      return (state.crafting.cheeseCollection[req.recipeId] ?? 0) >= req.count;
    case 'province_complete':
      return state.zoneProgress[req.provinceId]?.bossDefeated ?? false;
    default:
      return false;
  }
}

/**
 * Check if a cave can be unlocked given current game state
 */
export function canUnlockCave(
  cave: AffinageCave,
  state: GameState
): boolean {
  // Already unlocked
  if (state.crafting.unlockedCaves.includes(cave.id)) return false;

  // Check rennet cost
  if (state.prestige.rennet < cave.cost) return false;

  const req = cave.unlockRequirement;
  if (!req || req.type === 'none') return true;

  switch (req.type) {
    case 'prestige_rennet':
      return state.prestige.totalRennet >= req.amount;
    case 'prestige_vintage':
      return state.prestige.totalVintageWheels >= req.amount;
    case 'cave_unlocked':
      return state.crafting.unlockedCaves.includes(req.caveId);
    default:
      return false;
  }
}

/**
 * Check if an ingredient can be unlocked given current game state
 */
export function canUnlockIngredient(
  ingredient: Ingredient,
  state: GameState
): boolean {
  // Already unlocked
  if (state.crafting.unlockedIngredients.includes(ingredient.id)) return false;

  const req = ingredient.unlockRequirement;
  if (!req || req.type === 'none') return true;

  switch (req.type) {
    case 'prestige_rennet':
      return state.prestige.totalRennet >= req.amount;
    case 'prestige_vintage':
      return state.prestige.totalVintageWheels >= req.amount;
    case 'achievement':
      return state.achievements.includes(req.achievementId);
    case 'province':
      return state.zoneProgress[req.provinceId]?.bossDefeated ?? false;
    case 'cave_level':
      return state.crafting.unlockedCaves.includes(req.caveId);
    default:
      return false;
  }
}

// ===== Recipe Filtering =====

/**
 * Get all recipes available for a specific cave
 * (recipes that are unlocked and can be crafted in this cave)
 */
export function getAvailableRecipesForCave(
  caveId: string,
  state: GameState
): CheeseRecipe[] {
  const cave = getCaveById(caveId);
  if (!cave) return [];

  // Cave must be unlocked
  if (!state.crafting.unlockedCaves.includes(caveId)) return [];

  // Return all unlocked recipes (all recipes can be made in any cave)
  return CHEESE_RECIPES.filter((recipe) =>
    state.crafting.unlockedRecipes.includes(recipe.id)
  );
}

/**
 * Get recipes that can potentially be unlocked
 */
export function getUnlockableRecipes(state: GameState): CheeseRecipe[] {
  return CHEESE_RECIPES.filter((recipe) => canUnlockRecipe(recipe, state));
}

/**
 * Get caves that can potentially be unlocked
 */
export function getUnlockableCaves(state: GameState): AffinageCave[] {
  return CAVES.filter((cave) => canUnlockCave(cave, state));
}

// ===== Buff Effect Calculations =====

/**
 * Calculate a quality-scaled buff effect
 *
 * Quality scaling:
 * - Quality 1 = 0.5x effect strength
 * - Quality 50 = 1.0x effect strength
 * - Quality 100 = 1.5x effect strength
 */
export function calculateBuffEffect(
  effect: CheeseEffect,
  quality: number
): CheeseEffect {
  // Quality multiplier: 0.5 at Q1, 1.0 at Q50, 1.5 at Q100
  const qualityMultiplier = 0.5 + (quality / 100) * 1.0;

  const scaledEffect = { ...effect };

  // Scale multiplier-based effects
  if ('multiplier' in scaledEffect) {
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

/**
 * Calculate all buff effects from a recipe scaled by quality
 */
export function calculateRecipeBuffEffects(
  recipe: CheeseRecipe,
  quality: number
): CheeseEffect[] {
  if (!recipe.effects) return [];
  return recipe.effects.map((effect) => calculateBuffEffect(effect, quality));
}

// ===== Crafting Validation =====

/**
 * Validate that selected ingredients are compatible with a recipe
 */
export function validateRecipeIngredients(
  recipe: CheeseRecipe,
  ingredients: CraftingJob['ingredients']
): { valid: boolean; reason?: string } {
  const { requiredIngredients } = recipe;

  // Check milk type
  if (!requiredIngredients.milkType.includes(ingredients.milkType)) {
    return {
      valid: false,
      reason: `Recipe requires ${requiredIngredients.milkType.join(' or ')} milk`,
    };
  }

  // Check culture type
  if (!requiredIngredients.cultureType.includes(ingredients.cultureType)) {
    return {
      valid: false,
      reason: `Recipe requires ${requiredIngredients.cultureType.join(' or ')} culture`,
    };
  }

  // Check rennet type (if specified)
  if (requiredIngredients.rennetType && requiredIngredients.rennetType.length > 0) {
    if (!requiredIngredients.rennetType.includes(ingredients.rennetType)) {
      return {
        valid: false,
        reason: `Recipe requires ${requiredIngredients.rennetType.join(' or ')} rennet`,
      };
    }
  }

  // Check required specialty items
  if (requiredIngredients.specialtyItems && requiredIngredients.specialtyItems.length > 0) {
    for (const requiredItem of requiredIngredients.specialtyItems) {
      if (!ingredients.specialtyItems.includes(requiredItem)) {
        const item = getIngredientById(requiredItem);
        return {
          valid: false,
          reason: `Recipe requires ${item?.name ?? requiredItem}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Check if player has unlocked the required ingredients for a recipe
 */
export function hasRequiredIngredients(
  _recipe: CheeseRecipe,
  ingredients: CraftingJob['ingredients'],
  unlockedIngredients: string[]
): { hasAll: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check milk
  const milk = getMilkByType(ingredients.milkType);
  if (milk && !unlockedIngredients.includes(milk.id)) {
    missing.push(milk.name);
  }

  // Check culture
  const culture = getCultureByType(ingredients.cultureType);
  if (culture && !unlockedIngredients.includes(culture.id)) {
    missing.push(culture.name);
  }

  // Check rennet
  const rennet = getRennetByType(ingredients.rennetType);
  if (rennet && !unlockedIngredients.includes(rennet.id)) {
    missing.push(rennet.name);
  }

  // Check specialty items
  for (const itemId of ingredients.specialtyItems) {
    if (!unlockedIngredients.includes(itemId)) {
      const item = getIngredientById(itemId);
      missing.push(item?.name ?? itemId);
    }
  }

  return {
    hasAll: missing.length === 0,
    missing,
  };
}

// ===== Cave Capacity Calculations =====

/**
 * Get the number of used slots in a cave
 */
export function getCaveUsedSlots(
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

/**
 * Get total capacity across all unlocked caves
 */
export function getTotalUnlockedCapacity(
  unlockedCaveIds: string[]
): number {
  return unlockedCaveIds.reduce((total, caveId) => {
    const cave = getCaveById(caveId);
    return total + (cave?.capacity ?? 0);
  }, 0);
}

/**
 * Get total used slots across all caves
 */
export function getTotalUsedSlots(activeJobs: CraftingJob[]): number {
  return activeJobs.length;
}

// ===== Interaction Quality Effects =====

/**
 * Calculate quality effect for different interaction types
 */
export function getInteractionQualityEffect(
  interactionType: CraftingInteraction['type'],
  _itemId?: string
): number {
  switch (interactionType) {
    case 'rind_wash':
      return 3; // Washing the rind adds +3 quality
    case 'turn':
      return 1; // Turning the cheese adds +1 quality
    case 'flavor_addition':
      // Flavor additions use the item's quality modifier
      if (_itemId) {
        const item = getIngredientById(_itemId);
        return item?.qualityModifier ?? 2;
      }
      return 2;
    default:
      return 0;
  }
}

/**
 * Check if an interaction is valid for a job
 */
export function canAddInteraction(
  job: CraftingJob,
  interactionType: CraftingInteraction['type'],
  currentTime: number
): { canAdd: boolean; reason?: string } {
  // Can't interact with completed jobs
  if (currentTime >= job.endTime) {
    return { canAdd: false, reason: 'Cheese has finished aging' };
  }

  // Fresh cheeses (no aging) can't have interactions
  if (job.endTime === job.startTime) {
    return { canAdd: false, reason: 'Fresh cheeses cannot be interacted with' };
  }

  // Limit interactions per job (prevent spam)
  const interactionCount = job.interactions.filter(
    (i) => i.type === interactionType
  ).length;

  const maxInteractions: Record<CraftingInteraction['type'], number> = {
    rind_wash: 3,
    turn: 10,
    flavor_addition: 2,
  };

  if (interactionCount >= maxInteractions[interactionType]) {
    return {
      canAdd: false,
      reason: `Maximum ${maxInteractions[interactionType]} ${interactionType.replace('_', ' ')}s reached`,
    };
  }

  return { canAdd: true };
}

// ===== Cheese Collection Statistics =====

/**
 * Get the total number of unique cheese types crafted
 */
export function getUniqueCheesesCrafted(
  cheeseCollection: Record<string, number>
): number {
  return Object.keys(cheeseCollection).length;
}

/**
 * Get the total number of cheeses ever crafted
 */
export function getTotalCheesesCrafted(
  cheeseCollection: Record<string, number>
): number {
  return Object.values(cheeseCollection).reduce((a, b) => a + b, 0);
}

/**
 * Check if a specific cheese type has been crafted
 */
export function hasEverCrafted(
  recipeId: string,
  cheeseCollection: Record<string, number>
): boolean {
  return (cheeseCollection[recipeId] ?? 0) > 0;
}

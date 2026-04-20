import type { CraftingState } from '../../../types/game';

/**
 * Creates initial crafting state.
 */
export function createInitialCraftingState(): CraftingState {
  return {
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
    unlockedCaves: ['basic_cellar'],
    activeJobs: [],
    cheeseInventory: [],
    cheeseCollection: {},
    activeBuffs: [],
  };
}

/**
 * Creates reset state for prestige tier.
 * Aging: preserve unlocks, reset transient state.
 */
export function createPrestigeCraftingState(
  current: CraftingState,
  tier: 'aging' | 'vintage' | 'legacy'
): CraftingState {
  if (tier === 'aging') {
    return {
      // Preserve permanent progress
      unlockedIngredients: current.unlockedIngredients,
      unlockedRecipes: current.unlockedRecipes,
      unlockedCaves: current.unlockedCaves,
      cheeseCollection: current.cheeseCollection,
      // Reset transient state
      activeJobs: [],
      cheeseInventory: [],
      activeBuffs: [],
    };
  }
  // Vintage/Legacy TBD - for now preserve everything
  return current;
}

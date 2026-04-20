import type Decimal from 'decimal.js';
import type {
  CraftingState,
  CraftingJob,
  CraftingInteraction,
  CraftedCheese,
  CheeseRecipe,
  AffinageCave,
} from '../../../types/game';

export interface CraftingSliceState {
  crafting: CraftingState;
}

export interface CraftingSliceActions {
  unlockIngredient: (ingredientId: string) => boolean;
  unlockRecipe: (recipeId: string) => boolean;
  unlockCave: (caveId: string) => boolean;
  canAffordCave: (caveId: string) => boolean;
  startCrafting: (
    recipeId: string,
    caveId: string,
    ingredients: CraftingJob['ingredients']
  ) => boolean;
  canStartCrafting: (
    recipeId: string,
    caveId: string
  ) => { canStart: boolean; reason?: string };
  getCaveAvailableSlots: (caveId: string) => number;
  tickCrafting: (deltaMs: number) => void;
  collectCheese: (jobId: string) => CraftedCheese | null;
  consumeCheese: (cheeseId: string) => boolean;
  sellCheese: (cheeseId: string) => Decimal;
  addInteraction: (
    jobId: string,
    interaction: Omit<CraftingInteraction, 'timestamp'>
  ) => boolean;
  tickBuffs: (deltaMs: number) => void;
  getActiveBuffMultipliers: () => { production: number; click: number; xp: number };
  getUnlockedRecipes: () => CheeseRecipe[];
  getUnlockedCaves: () => AffinageCave[];
  getActiveJobs: () => CraftingJob[];
  getCheeseInventory: () => CraftedCheese[];
  getJobProgress: (jobId: string) => number;
  getPrestigeCraftingReset: (tier: 'aging' | 'vintage' | 'legacy') => CraftingState;
}

export type CraftingSlice = CraftingSliceState & CraftingSliceActions;

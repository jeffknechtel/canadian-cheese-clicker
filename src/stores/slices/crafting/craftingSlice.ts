import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { CraftingSlice } from './types';
import { createInitialCraftingState, createPrestigeCraftingState } from './resetFactory';
import { recipeRegistry } from '../../../domain';
import { CHEESE_RECIPES } from '../../../data/cheeseRecipes';
import { getCaveById, CAVES } from '../../../data/caves';
import {
  getIngredientById,
  getMilkByType,
  getCultureByType,
  getRennetByType,
} from '../../../data/ingredients';
import {
  trackCraftingStart,
  trackCraftingComplete,
} from '../../../systems/analyticsService';
import type {
  CraftingJob,
  CraftingInteraction,
  CraftedCheese,
  CheeseActiveBuff,
  CheeseRecipe,
  AffinageCave,
} from '../../../types/game';

export type CraftingEvent =
  | { type: 'cheese_complete'; cheese: CraftedCheese; recipe: CheeseRecipe }
  | { type: 'recipe_unlocked'; recipe: CheeseRecipe }
  | { type: 'cave_unlocked'; cave: AffinageCave }
  | { type: 'buff_activated'; buff: CheeseActiveBuff; recipe: CheeseRecipe }
  | { type: 'buff_expired'; buff: CheeseActiveBuff };

type CraftingEventCallback = (event: CraftingEvent) => void;
let craftingEventCallback: CraftingEventCallback | null = null;

export function setCraftingEventCallback(callback: CraftingEventCallback | null): void {
  craftingEventCallback = callback;
}

export const createCraftingSlice: SliceCreator<CraftingSlice> = (set, get) => ({
  // State - use factory for initial
  crafting: createInitialCraftingState(),

  // Exported for prestige slice to call
  getPrestigeCraftingReset: (tier: 'aging' | 'vintage' | 'legacy') => {
    return createPrestigeCraftingState(get().crafting, tier);
  },

  unlockIngredient: (ingredientId: string) => {
    const state = get();
    const ingredient = getIngredientById(ingredientId);

    if (!ingredient) return false;
    if (state.crafting.unlockedIngredients.includes(ingredientId)) return false;

    const req = ingredient.unlockRequirement;
    if (req) {
      switch (req.type) {
        case 'prestige_rennet':
          if (state.prestige.totalRennet < req.amount) return false;
          break;
        case 'prestige_vintage':
          if (state.prestige.totalVintageWheels < req.amount) return false;
          break;
        case 'achievement':
          if (!state.achievements.includes(req.achievementId)) return false;
          break;
        case 'province':
          if (!state.zoneProgress[req.provinceId]?.bossDefeated) return false;
          break;
        case 'cave_level':
          if (!state.crafting.unlockedCaves.includes(req.caveId)) return false;
          break;
      }
    }

    set({
      crafting: {
        ...state.crafting,
        unlockedIngredients: [...state.crafting.unlockedIngredients, ingredientId],
      },
    });

    return true;
  },

  unlockRecipe: (recipeId: string) => {
    const state = get();
    const recipe = recipeRegistry.get(recipeId);

    if (!recipe) return false;
    if (state.crafting.unlockedRecipes.includes(recipeId)) return false;

    const req = recipe.unlockRequirement;
    if (req) {
      switch (req.type) {
        case 'prestige_rennet':
          if (state.prestige.totalRennet < req.amount) return false;
          break;
        case 'prestige_vintage':
          if (state.prestige.totalVintageWheels < req.amount) return false;
          break;
        case 'cheese_crafted':
          if ((state.crafting.cheeseCollection[req.recipeId] ?? 0) < req.count) return false;
          break;
        case 'province_complete':
          if (!state.zoneProgress[req.provinceId]?.bossDefeated) return false;
          break;
      }
    }

    set({
      crafting: {
        ...state.crafting,
        unlockedRecipes: [...state.crafting.unlockedRecipes, recipeId],
      },
    });

    if (craftingEventCallback) {
      craftingEventCallback({ type: 'recipe_unlocked', recipe });
    }

    return true;
  },

  unlockCave: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);

    if (!cave) return false;
    if (state.crafting.unlockedCaves.includes(caveId)) return false;
    if (!state.canAffordCave(caveId)) return false;

    const req = cave.unlockRequirement;
    if (req) {
      switch (req.type) {
        case 'prestige_rennet':
          if (state.prestige.totalRennet < req.amount) return false;
          break;
        case 'prestige_vintage':
          if (state.prestige.totalVintageWheels < req.amount) return false;
          break;
        case 'cave_unlocked':
          if (!state.crafting.unlockedCaves.includes(req.caveId)) return false;
          break;
      }
    }

    set({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet - cave.cost,
      },
      crafting: {
        ...state.crafting,
        unlockedCaves: [...state.crafting.unlockedCaves, caveId],
      },
    });

    if (craftingEventCallback) {
      craftingEventCallback({ type: 'cave_unlocked', cave });
    }

    get().checkAchievements();

    return true;
  },

  canAffordCave: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);

    if (!cave) return false;
    if (state.crafting.unlockedCaves.includes(caveId)) return false;
    if (state.prestige.rennet < cave.cost) return false;

    const req = cave.unlockRequirement;
    if (req) {
      switch (req.type) {
        case 'prestige_rennet':
          if (state.prestige.totalRennet < req.amount) return false;
          break;
        case 'prestige_vintage':
          if (state.prestige.totalVintageWheels < req.amount) return false;
          break;
        case 'cave_unlocked':
          if (!state.crafting.unlockedCaves.includes(req.caveId)) return false;
          break;
      }
    }

    return true;
  },

  startCrafting: (recipeId: string, caveId: string, ingredients: CraftingJob['ingredients']) => {
    const state = get();
    const canStart = state.canStartCrafting(recipeId, caveId);
    if (!canStart.canStart) return false;

    const recipe = recipeRegistry.get(recipeId);
    const cave = getCaveById(caveId);
    if (!recipe || !cave) return false;

    const milk = getMilkByType(ingredients.milkType);
    const culture = getCultureByType(ingredients.cultureType);
    const rennet = getRennetByType(ingredients.rennetType);

    if (!milk || !culture || !rennet) return false;

    const totalCurdsCost = milk.cost.plus(culture.cost).plus(rennet.cost);

    let specialtyCost = new Decimal(0);
    for (const itemId of ingredients.specialtyItems) {
      const item = getIngredientById(itemId);
      if (item) {
        specialtyCost = specialtyCost.plus(item.cost);
      }
    }

    const finalCost = totalCurdsCost.plus(specialtyCost);

    if (state.curds.lt(finalCost)) return false;

    const milkQuality = milk.qualityModifier ?? 0;
    const cultureQuality = culture.qualityModifier ?? 0;
    const rennetQuality = rennet.qualityModifier ?? 0;
    let specialtyQuality = 0;
    for (const itemId of ingredients.specialtyItems) {
      const item = getIngredientById(itemId);
      specialtyQuality += item?.qualityModifier ?? 0;
    }
    const qualityBonus = cave.qualityBonus + milkQuality + cultureQuality + rennetQuality + specialtyQuality;

    const now = Date.now();
    const job: CraftingJob = {
      id: `job_${now}_${Math.random().toString(36).substring(2, 11)}`,
      recipeId,
      caveId,
      startTime: now,
      endTime: now + recipe.agingDuration,
      ingredients,
      qualityBonus,
      interactions: [],
    };

    set({
      curds: state.curds.minus(finalCost),
      crafting: {
        ...state.crafting,
        activeJobs: [...state.crafting.activeJobs, job],
      },
    });

    trackCraftingStart(recipeId, caveId);

    return true;
  },

  canStartCrafting: (recipeId: string, caveId: string) => {
    const state = get();

    if (!state.crafting.unlockedRecipes.includes(recipeId)) {
      return { canStart: false, reason: 'Recipe not unlocked' };
    }

    if (!state.crafting.unlockedCaves.includes(caveId)) {
      return { canStart: false, reason: 'Cave not unlocked' };
    }

    const availableSlots = state.getCaveAvailableSlots(caveId);
    if (availableSlots <= 0) {
      return { canStart: false, reason: 'No available slots in cave' };
    }

    return { canStart: true };
  },

  getCaveAvailableSlots: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);
    if (!cave) return 0;

    const usedSlots = state.crafting.activeJobs.filter(
      (job) => job.caveId === caveId
    ).length;

    return Math.max(0, cave.capacity - usedSlots);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tickCrafting: (_deltaMs: number) => {
    // Jobs stay in activeJobs until collected
    // This could be used for progress notifications in the future
  },

  collectCheese: (jobId: string) => {
    const state = get();
    const now = Date.now();

    const job = state.crafting.activeJobs.find((j) => j.id === jobId);
    if (!job) return null;

    if (now < job.endTime) return null;

    const recipe = recipeRegistry.get(job.recipeId);
    if (!recipe) return null;

    let finalQuality = recipe.baseQuality + job.qualityBonus;

    for (const interaction of job.interactions) {
      finalQuality += interaction.qualityEffect;
    }

    finalQuality = Math.max(1, Math.min(100, finalQuality));

    const cheese: CraftedCheese = {
      id: `cheese_${now}_${Math.random().toString(36).substring(2, 11)}`,
      recipeId: job.recipeId,
      quality: finalQuality,
      craftedAt: now,
      ingredients: job.ingredients,
    };

    set((s) => {
      const currentJobIndex = s.crafting.activeJobs.findIndex((j) => j.id === jobId);
      if (currentJobIndex === -1) return s;

      const newActiveJobs = [...s.crafting.activeJobs];
      newActiveJobs.splice(currentJobIndex, 1);

      return {
        crafting: {
          ...s.crafting,
          activeJobs: newActiveJobs,
          cheeseInventory: [...s.crafting.cheeseInventory, cheese],
          cheeseCollection: {
            ...s.crafting.cheeseCollection,
            [job.recipeId]: (s.crafting.cheeseCollection[job.recipeId] ?? 0) + 1,
          },
        },
      };
    });

    if (craftingEventCallback) {
      craftingEventCallback({ type: 'cheese_complete', cheese, recipe });
    }

    trackCraftingComplete(job.recipeId, finalQuality);
    get().checkAchievements();

    return cheese;
  },

  consumeCheese: (cheeseId: string) => {
    const state = get();
    const now = Date.now();

    const cheese = state.crafting.cheeseInventory.find((c) => c.id === cheeseId);
    if (!cheese) return false;

    const recipe = recipeRegistry.get(cheese.recipeId);
    if (!recipe || !recipe.effects || recipe.effects.length === 0) return false;

    const newBuffs: CheeseActiveBuff[] = recipe.effects.map((effect) => {
      const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.0;
      const scaledEffect = { ...effect };

      if ('multiplier' in scaledEffect) {
        const bonus = (scaledEffect.multiplier - 1) * qualityMultiplier;
        scaledEffect.multiplier = 1 + bonus;
      }
      if ('value' in scaledEffect && typeof scaledEffect.value === 'number') {
        scaledEffect.value = Math.round(scaledEffect.value * qualityMultiplier);
      }

      return {
        id: `buff_${now}_${Math.random().toString(36).substring(2, 11)}`,
        effect: scaledEffect,
        startTime: now,
        endTime: now + effect.duration,
        sourceCheeseId: cheeseId,
      };
    });

    set((s) => {
      const currentIndex = s.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
      if (currentIndex === -1) return s;

      const newInventory = [...s.crafting.cheeseInventory];
      newInventory.splice(currentIndex, 1);

      return {
        crafting: {
          ...s.crafting,
          cheeseInventory: newInventory,
          activeBuffs: [...s.crafting.activeBuffs, ...newBuffs],
        },
      };
    });

    if (craftingEventCallback && newBuffs.length > 0) {
      craftingEventCallback({ type: 'buff_activated', buff: newBuffs[0], recipe });
    }

    return true;
  },

  sellCheese: (cheeseId: string) => {
    const state = get();

    const cheese = state.crafting.cheeseInventory.find((c) => c.id === cheeseId);
    if (!cheese) return new Decimal(0);

    const recipe = recipeRegistry.get(cheese.recipeId);
    if (!recipe) return new Decimal(0);

    const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.5;
    const value = recipe.baseValue.mul(qualityMultiplier);

    set((s) => {
      const currentIndex = s.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
      if (currentIndex === -1) return s;

      const newInventory = [...s.crafting.cheeseInventory];
      newInventory.splice(currentIndex, 1);

      return {
        curds: s.curds.plus(value),
        totalCurdsEarned: s.totalCurdsEarned.plus(value),
        crafting: {
          ...s.crafting,
          cheeseInventory: newInventory,
        },
      };
    });

    return value;
  },

  addInteraction: (jobId: string, interaction: Omit<CraftingInteraction, 'timestamp'>) => {
    const state = get();
    const now = Date.now();

    const job = state.crafting.activeJobs.find((j) => j.id === jobId);
    if (!job) return false;

    if (now >= job.endTime) return false;

    const fullInteraction: CraftingInteraction = {
      ...interaction,
      timestamp: now,
    };

    set((s) => {
      const currentIndex = s.crafting.activeJobs.findIndex((j) => j.id === jobId);
      if (currentIndex === -1) return s;

      const newJobs = [...s.crafting.activeJobs];
      newJobs[currentIndex] = {
        ...newJobs[currentIndex],
        interactions: [...newJobs[currentIndex].interactions, fullInteraction],
      };

      return {
        crafting: {
          ...s.crafting,
          activeJobs: newJobs,
        },
      };
    });

    return true;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tickBuffs: (_deltaMs: number) => {
    const state = get();
    const now = Date.now();

    const expiredBuffs = state.crafting.activeBuffs.filter(
      (buff) => now >= buff.endTime
    );

    const activeBuffs = state.crafting.activeBuffs.filter(
      (buff) => now < buff.endTime
    );

    if (activeBuffs.length !== state.crafting.activeBuffs.length) {
      set({
        crafting: {
          ...state.crafting,
          activeBuffs,
        },
      });

      if (craftingEventCallback) {
        for (const buff of expiredBuffs) {
          craftingEventCallback({ type: 'buff_expired', buff });
        }
      }
    }
  },

  getActiveBuffMultipliers: () => {
    const state = get();
    const now = Date.now();

    let production = 1;
    let click = 1;
    let xp = 1;

    for (const buff of state.crafting.activeBuffs) {
      if (now >= buff.endTime) continue;

      const effect = buff.effect;
      switch (effect.type) {
        case 'productionBoost':
          production *= effect.multiplier;
          break;
        case 'clickBoost':
          click *= effect.multiplier;
          break;
        case 'xpBoost':
          xp *= effect.multiplier;
          break;
      }
    }

    return { production, click, xp };
  },

  getUnlockedRecipes: () => {
    const state = get();
    return CHEESE_RECIPES.filter((r) => state.crafting.unlockedRecipes.includes(r.id));
  },

  getUnlockedCaves: () => {
    const state = get();
    return CAVES.filter((c) => state.crafting.unlockedCaves.includes(c.id));
  },

  getActiveJobs: () => {
    return get().crafting.activeJobs;
  },

  getCheeseInventory: () => {
    return get().crafting.cheeseInventory;
  },

  getJobProgress: (jobId: string) => {
    const state = get();
    const job = state.crafting.activeJobs.find((j) => j.id === jobId);
    if (!job) return 0;

    const now = Date.now();
    const totalDuration = job.endTime - job.startTime;

    if (totalDuration === 0) return 100;

    const elapsed = now - job.startTime;
    const progress = (elapsed / totalDuration) * 100;

    return Math.min(100, Math.max(0, progress));
  },
});

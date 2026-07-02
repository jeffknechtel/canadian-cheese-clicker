import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { CraftingSlice } from './types';
import { createInitialCraftingState, createPrestigeCraftingState } from './resetFactory';
import { recipeRegistry, publish } from '../../../domain';
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
import { playCraftingCompleteSound } from '../../../systems/audioSystem';
import { emitParticles } from '../../../systems/particleSystem';
import {
  checkUnlockRequirement,
  type UnlockContext,
  calculateIngredientQualityBonus,
  calculateCheeseValue,
  calculateBuffEffect,
  getCaveAvailableSlots as engineGetCaveAvailableSlots,
} from '../../../systems/craftingEngine';
import { CraftingJob as CraftingJobModule } from '../../../domain/modules/CraftingJob';
import type {
  CraftingJob,
  CraftingInteraction,
  CraftedCheese,
  CheeseActiveBuff,
} from '../../../types/game';

function buildUnlockContext(state: {
  prestige: { totalRennet: number; totalVintageWheels: number };
  achievements: string[];
  zoneProgress: Record<string, { bossDefeated: boolean }>;
  crafting: { unlockedCaves: string[]; cheeseCollection: Record<string, number> };
}): UnlockContext {
  return {
    totalRennet: state.prestige.totalRennet,
    totalVintageWheels: state.prestige.totalVintageWheels,
    achievements: state.achievements,
    zoneProgress: state.zoneProgress,
    unlockedCaves: state.crafting.unlockedCaves,
    cheeseCollection: state.crafting.cheeseCollection,
  };
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

    if (ingredient.unlockRequirement) {
      const ctx = buildUnlockContext(state);
      if (!checkUnlockRequirement(ingredient.unlockRequirement, ctx)) return false;
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

    if (recipe.unlockRequirement) {
      const ctx = buildUnlockContext(state);
      if (!checkUnlockRequirement(recipe.unlockRequirement, ctx)) return false;
    }

    set({
      crafting: {
        ...state.crafting,
        unlockedRecipes: [...state.crafting.unlockedRecipes, recipeId],
      },
    });
    publish({ type: 'RecipeUnlocked', recipe });
    return true;
  },

  unlockCave: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);
    if (!cave) return false;
    if (state.crafting.unlockedCaves.includes(caveId)) return false;
    if (!state.canAffordCave(caveId)) return false;

    if (cave.unlockRequirement) {
      const ctx = buildUnlockContext(state);
      if (!checkUnlockRequirement(cave.unlockRequirement, ctx)) return false;
    }

    // Use published action instead of direct prestige write
    const success = state.spendRennet(cave.cost);
    if (!success) return false;

    // Only write crafting-owned state
    set({
      crafting: {
        ...state.crafting,
        unlockedCaves: [...state.crafting.unlockedCaves, caveId],
      },
    });
    publish({ type: 'CaveUnlocked', cave });
    get().checkAchievements();
    return true;
  },

  canAffordCave: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);
    if (!cave) return false;
    if (state.crafting.unlockedCaves.includes(caveId)) return false;
    if (state.prestige.rennet < cave.cost) return false;

    if (cave.unlockRequirement) {
      const ctx = buildUnlockContext(state);
      if (!checkUnlockRequirement(cave.unlockRequirement, ctx)) return false;
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
    const ingredientQualityBonus = calculateIngredientQualityBonus(ingredients);
    const qualityBonus = cave.qualityBonus + ingredientQualityBonus;

    const craftingSpeedMultiplier = state.getSynergyCraftingSpeedMultiplier();
    const actualDuration = Math.floor(recipe.agingDuration * craftingSpeedMultiplier);

    // Use callback form to atomically check balance and deduct
    let success = false;
    set((s) => {
      // Re-check balance with fresh state
      if (s.curds.lt(finalCost)) {
        return s;
      }

      // Re-check slot availability with fresh state
      const currentSlots = engineGetCaveAvailableSlots(caveId, s.crafting.activeJobs);
      if (currentSlots <= 0) {
        return s;
      }

      const now = Date.now();
      const job: CraftingJob = {
        id: `job_${now}_${Math.random().toString(36).substring(2, 11)}`,
        recipeId,
        caveId,
        startTime: now,
        endTime: now + actualDuration,
        ingredients,
        qualityBonus,
        interactions: [],
        notificationSent: false,
      };

      success = true;
      return {
        curds: s.curds.minus(finalCost),
        crafting: {
          ...s.crafting,
          activeJobs: [...s.crafting.activeJobs, job],
        },
      };
    });

    if (success) {
      trackCraftingStart(recipeId, caveId);
    }

    return success;
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
    return engineGetCaveAvailableSlots(caveId, state.crafting.activeJobs);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tickCrafting: (_deltaMs: number) => {
    const state = get();
    const now = Date.now();

    // Find jobs that just completed but haven't been notified
    const newlyCompleted = state.crafting.activeJobs.filter(
      (job) => CraftingJobModule.isComplete(job, now) && !job.notificationSent
    );

    if (newlyCompleted.length === 0) return;

    // Mark jobs as notified
    set((s) => ({
      crafting: {
        ...s.crafting,
        activeJobs: s.crafting.activeJobs.map((job) =>
          newlyCompleted.some((c) => c.id === job.id)
            ? { ...job, notificationSent: true }
            : job
        ),
      },
    }));

    // Trigger notifications for completed jobs via domain events
    for (const job of newlyCompleted) {
      const recipe = recipeRegistry.get(job.recipeId);
      if (recipe) {
        const placeholderCheese: CraftedCheese = {
          id: `pending_${job.id}`,
          recipeId: job.recipeId,
          quality: recipe.baseQuality + job.qualityBonus,
          craftedAt: now,
          ingredients: job.ingredients,
        };
        publish({ type: 'CheeseCollected', cheese: placeholderCheese, recipe });
        playCraftingCompleteSound();
        emitParticles(window.innerWidth / 2, window.innerHeight / 3, 'confetti');
      }
    }
  },

  collectCheese: (jobId: string) => {
    const state = get();
    const now = Date.now();

    const job = state.crafting.activeJobs.find((j) => j.id === jobId);
    if (!job) return null;

    const cheese = CraftingJobModule.collect(job, now);
    if (!cheese) return null;

    const recipe = recipeRegistry.get(job.recipeId);
    if (!recipe) return null;

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

    publish({ type: 'CheeseCollected', cheese, recipe });

    trackCraftingComplete(job.recipeId, cheese.quality);
    get().incrementChallengeProgress('craftCheese', 1);
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
      const scaledEffect = calculateBuffEffect(effect, cheese.quality);
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

    if (newBuffs.length > 0) {
      publish({ type: 'BuffActivated', buff: newBuffs[0], recipe });
    }

    get().incrementChallengeProgress('consumeCheese', 1);

    return true;
  },

  sellCheese: (cheeseId: string) => {
    const state = get();

    const cheese = state.crafting.cheeseInventory.find((c) => c.id === cheeseId);
    if (!cheese) return new Decimal(0);

    const recipe = recipeRegistry.get(cheese.recipeId);
    if (!recipe) return new Decimal(0);

    const value = calculateCheeseValue(recipe, cheese.quality);

    // Route through addCurds to respect slice boundaries
    get().addCurds(value);
    set((s) => {
      const currentIndex = s.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
      if (currentIndex === -1) return s;

      const newInventory = [...s.crafting.cheeseInventory];
      newInventory.splice(currentIndex, 1);

      return {
        crafting: {
          ...s.crafting,
          cheeseInventory: newInventory,
        },
        currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
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

    // Per-type interaction limits
    const INTERACTION_LIMITS: Record<string, number> = {
      rind_wash: 3,
      turn: 10,
      flavor_addition: 2,
      brine: 5,
      smoke: 2,
      press: 3,
    };

    // Check interaction limit for this type
    const limit = INTERACTION_LIMITS[interaction.type] ?? Infinity;
    const currentCount = job.interactions.filter((i) => i.type === interaction.type).length;
    if (currentCount >= limit) {
      console.log(`Interaction limit reached: ${interaction.type} (${currentCount}/${limit})`);
      return false;
    }

    // Check timing constraints for certain interactions
    if (interaction.type === 'flavor_addition') {
      const progress = (now - job.startTime) / (job.endTime - job.startTime);
      if (progress > 0.5) {
        console.log('Too late to add flavors - cheese is past 50% aging');
        return false;
      }
    }

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
    const now = Date.now();
    const expiredBuffs: CheeseActiveBuff[] = [];

    set((s) => {
      const activeBuffs = s.crafting.activeBuffs.filter((buff) => {
        if (now >= buff.endTime) {
          expiredBuffs.push(buff);
          return false;
        }
        return true;
      });

      if (activeBuffs.length === s.crafting.activeBuffs.length) {
        return s;
      }

      return {
        crafting: {
          ...s.crafting,
          activeBuffs,
        },
      };
    });

    // Publish events outside of set() to avoid nested state updates
    for (const buff of expiredBuffs) {
      publish({ type: 'BuffExpired', buff });
    }
  },

  addBuff: (buff: CheeseActiveBuff) => {
    set((s) => ({
      crafting: {
        ...s.crafting,
        activeBuffs: [...s.crafting.activeBuffs, buff],
      },
    }));
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
    return CraftingJobModule.getProgress(job);
  },
});

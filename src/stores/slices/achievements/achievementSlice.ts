import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { AchievementSlice } from './types';
import {
  calculateAchievementGlobalMultiplier,
  calculateAchievementClickMultiplier,
  calculateClickMultiplier,
  calculatePrestigeClickMultiplier,
} from '../../../systems/productionEngine';
import { computeCps } from '../production/cpsCalculator';
import { ACHIEVEMENTS } from '../../../data/achievements';
import { GENERATORS } from '../../../data/generators';
import { CHEESE_RECIPES } from '../../../data/cheeseRecipes';
import { trackAchievementUnlock } from '../../../systems/analyticsService';
import type { Achievement, GameState } from '../../../types/game';

type AchievementUnlockCallback = (achievement: Achievement) => void;
let achievementUnlockCallback: AchievementUnlockCallback | null = null;

export function setAchievementUnlockCallback(callback: AchievementUnlockCallback | null): void {
  achievementUnlockCallback = callback;
}

function checkAchievementRequirement(
  achievement: Achievement,
  state: GameState
): boolean {
  const { requirement } = achievement;

  switch (requirement.type) {
    case 'totalCurds':
      return state.totalCurdsEarned.gte(requirement.amount);

    case 'totalClicks':
      return state.totalClicks >= requirement.count;

    case 'generatorOwned': {
      const owned = state.generators[requirement.generatorId] ?? 0;
      return owned >= requirement.count;
    }

    case 'anyGeneratorOwned': {
      for (const generatorId of Object.keys(state.generators)) {
        if ((state.generators[generatorId] ?? 0) >= requirement.count) {
          return true;
        }
      }
      return false;
    }

    case 'allGeneratorsOwned': {
      for (const generator of GENERATORS) {
        const owned = state.generators[generator.id] ?? 0;
        if (owned < requirement.count) {
          return false;
        }
      }
      return true;
    }

    case 'cps':
      return state.curdPerSecond.gte(requirement.amount);

    case 'upgradesPurchased':
      return state.upgrades.length >= requirement.count;

    case 'agingResets':
      return state.prestige.agingResetCount >= requirement.count;

    case 'rennet':
      return state.prestige.rennet >= requirement.amount;

    case 'agingUpgradesPurchased':
      return state.prestige.agingUpgrades.length >= requirement.count;

    case 'vintageResets':
      return state.prestige.vintageResetCount >= requirement.count;

    case 'legacyResets':
      return state.prestige.legacyResetCount >= requirement.count;

    case 'cheese_crafted_total': {
      const totalCrafted = Object.values(state.crafting.cheeseCollection).reduce(
        (sum, count) => sum + count,
        0
      );
      return totalCrafted >= requirement.count;
    }

    case 'cheese_types_crafted': {
      const typesCrafted = Object.keys(state.crafting.cheeseCollection).length;
      return typesCrafted >= requirement.count;
    }

    case 'caves_owned':
      return state.crafting.unlockedCaves.length >= requirement.count;

    case 'cheese_quality': {
      const hasHighQuality = state.crafting.cheeseInventory.some(
        (cheese) => cheese.quality >= requirement.quality
      );
      return hasHighQuality;
    }

    case 'cheese_inventory_size':
      return state.crafting.cheeseInventory.length >= requirement.count;

    case 'legendary_cheese_crafted': {
      const legendaryRecipes = CHEESE_RECIPES.filter((r) => r.category === 'legendary');
      return legendaryRecipes.some((recipe) => state.crafting.cheeseCollection[recipe.id] > 0);
    }

    default:
      return false;
  }
}

export const createAchievementSlice: SliceCreator<AchievementSlice> = (set, get) => ({
  // State
  achievements: [],

  // Actions
  checkAchievements: () => {
    const state = get();
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (state.achievements.includes(achievement.id)) continue;

      // Cast state to GameState for requirement checking
      if (checkAchievementRequirement(achievement, state as unknown as GameState)) {
        newlyUnlocked.push(achievement);
      }
    }

    if (newlyUnlocked.length === 0) return;

    const newAchievements = [...state.achievements, ...newlyUnlocked.map((a) => a.id)];

    // Recalculate click value with new achievement bonuses
    const upgradeClickMultiplier = calculateClickMultiplier(state.upgrades);
    const achievementClickMultiplier = calculateAchievementClickMultiplier(newAchievements);
    const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
    const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
    const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);

    set({
      achievements: newAchievements,
      curdPerClick: newCurdPerClick,
    });

    // Recalculate CPS with new achievement bonuses
    set({ curdPerSecond: computeCps(get()) });

    // Notify about unlocked achievements and track analytics
    const totalUnlocked = get().achievements.length;
    for (const achievement of newlyUnlocked) {
      if (achievementUnlockCallback) {
        achievementUnlockCallback(achievement);
      }
      trackAchievementUnlock(achievement.id, totalUnlocked);
    }
  },

  isAchievementUnlocked: (id: string) => {
    return get().achievements.includes(id);
  },

  getUnlockedAchievements: () => {
    const { achievements } = get();
    return ACHIEVEMENTS.filter((a) => achievements.includes(a.id));
  },

  getLockedAchievements: () => {
    const { achievements } = get();
    return ACHIEVEMENTS.filter((a) => !achievements.includes(a.id));
  },

  getAchievementGlobalMultiplier: () => {
    const { achievements } = get();
    return calculateAchievementGlobalMultiplier(achievements);
  },

  getAchievementClickMultiplier: () => {
    const { achievements } = get();
    return calculateAchievementClickMultiplier(achievements);
  },
});

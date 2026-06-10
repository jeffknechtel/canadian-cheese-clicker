import type { SliceCreator } from '../../types';
import type { AchievementSlice } from './types';
import {
  calculateAchievementGlobalMultiplier,
  calculateAchievementClickMultiplier,
} from '../../../systems/productionEngine';
import { ACHIEVEMENTS } from '../../../data/achievements';
import { GENERATORS } from '../../../data/generators';
import { CHEESE_RECIPES } from '../../../data/cheeseRecipes';
import { trackAchievementUnlock } from '../../../systems/analyticsService';
import { publish, heroRegistry } from '../../../domain';
import type { Achievement, GameState } from '../../../types/game';

const PROVINCIAL_ZONES = [
  'ontario_cheese_trail',
  'quebec_fromage_frontier',
  'alberta_stampede_range',
  'manitoba_prairie_curds',
  'saskatchewan_wheat_wheels',
  'bc_pacific_creamery',
  'nova_scotia_maritime',
  'new_brunswick_bridges',
  'pei_annes_island',
  'newfoundland_viking_shores',
  'yukon_gold_rush',
  'nwt_aurora_territories',
  'nunavut_frozen_crown',
];

const MYTHOLOGY_ZONES = ['thunderbird_saga', 'wendigo_warning', 'chasse_galerie'];

const LEGENDARY_HERO_IDS = ['nanabozho', 'sedna_ally', 'wisakedjak', 'glooscap'];

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

    case 'zoneCompleted': {
      const zoneId = requirement.zoneId;
      const progress = state.zoneProgress[zoneId];
      return progress?.bossDefeated === true;
    }

    case 'zonesCompleted': {
      const zones = requirement.zones;
      return zones.every((zoneId: string) => state.zoneProgress[zoneId]?.bossDefeated === true);
    }

    case 'allProvincialZonesCompleted': {
      return PROVINCIAL_ZONES.every(
        (zoneId) => state.zoneProgress[zoneId]?.bossDefeated === true
      );
    }

    case 'allMythologyZonesCompleted': {
      return MYTHOLOGY_ZONES.every(
        (zoneId) => state.zoneProgress[zoneId]?.bossDefeated === true
      );
    }

    case 'bossDefeated': {
      const bossId = requirement.bossId;
      for (const [zoneId, progress] of Object.entries(state.zoneProgress)) {
        if (progress.bossDefeated && zoneId.includes(bossId.replace('_boss', ''))) {
          return true;
        }
      }
      return false;
    }

    case 'bossesDefeated': {
      const defeatedCount = Object.values(state.zoneProgress).filter(
        (progress) => progress.bossDefeated
      ).length;
      return defeatedCount >= requirement.count;
    }

    case 'heroesRecruited': {
      const recruitedCount = Object.keys(state.heroes).length;
      return recruitedCount >= requirement.count;
    }

    case 'legendaryHeroesRecruited': {
      const recruitedLegendaries = LEGENDARY_HERO_IDS.filter(
        (id) => state.heroes[id] !== undefined
      ).length;
      return recruitedLegendaries >= requirement.count;
    }

    case 'provincesRepresented': {
      const provinces = new Set<string>();
      for (const heroId of Object.keys(state.heroes)) {
        const hero = heroRegistry.get(heroId);
        if (hero?.province) {
          provinces.add(hero.province);
        }
      }
      return provinces.size >= requirement.count;
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

    set({ achievements: newAchievements });

    publish({ type: 'CpsInputsChanged' });

    // Notify about unlocked achievements and track analytics
    const totalUnlocked = get().achievements.length;
    for (const achievement of newlyUnlocked) {
      publish({ type: 'AchievementUnlocked', achievement });
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

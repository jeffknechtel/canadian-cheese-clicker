import { create } from 'zustand';
import Decimal from 'decimal.js';
import type {
  GameState,
  Upgrade,
  UpgradeRequirement,
  Achievement,
  HeroState,
  HeroDefinition,
  FormationPosition,
  EquipmentSlot,
  Equipment,
  ZoneProgress,
  CombatRewards,
  HeroStats,
  CraftingJob,
  CraftingInteraction,
  CraftedCheese,
  CheeseRecipe,
  AffinageCave,
  CheeseActiveBuff,
} from '../types/game';
import {
  calculateCps,
  calculateGeneratorCost,
  calculateMaxAffordable,
  calculateClickMultiplier,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateAchievementClickMultiplier,
  calculateHeroCpsBonus,
  calculateFormationBonus,
  calculateXpPerSecond,
  calculateHeroStats,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeClickMultiplier,
  calculatePrestigeCostReduction,
  calculatePrestigeXpMultiplier,
  calculatePrestigeCombatMultiplier,
  calculatePotentialRennet,
  calculateStartingCurds,
  calculateStartingGenerators,
} from '../systems/productionEngine';
import {
  initializeCombat,
  tickCombat,
  calculateCombatRewards,
  createEmptyCombatState,
  isBossStage,
  executeHeroAbility,
  executeHeroLimitBreak,
  canUseAbility,
  canUseLimitBreak,
} from '../systems/combatEngine';
import { UPGRADES, getUpgradeById } from '../data/upgrades';
import {
  getAgingUpgradeById,
  getAgingUpgradePurchaseCount as getAgingUpgradePurchaseCountHelper,
  canPurchaseAgingUpgrade as canPurchaseAgingUpgradeHelper,
} from '../data/agingUpgrades';
import { ACHIEVEMENTS } from '../data/achievements';
import { GENERATORS } from '../data/generators';
import { HEROES, getHeroById, getXpForLevel, HERO_MAX_LEVEL } from '../data/heroes';
import { getEquipmentById } from '../data/equipment';
import {
  saveGame,
  loadGame,
  calculateOfflineProgress,
  type OfflineProgress,
} from '../systems/saveSystem';
import { MILESTONE_THRESHOLDS } from '../data/canadianDialogue';
import { getRecipeById, CHEESE_RECIPES } from '../data/cheeseRecipes';
import { getCaveById, CAVES } from '../data/caves';
import { getIngredientById, getMilkByType, getCultureByType, getRennetByType } from '../data/ingredients';
import { getEventById, calculateEventBonusMultiplier } from '../data/events';
import {
  trackAchievementUnlock,
  trackGeneratorPurchase,
  trackUpgradePurchase,
  trackPrestige,
  trackCombatStart,
  trackCombatEnd,
  trackHeroRecruit,
  trackHeroLevelUp,
  trackCraftingStart,
  trackCraftingComplete,
} from '../systems/analyticsService';
import type { EventBonus } from '../types/game';

// Callback for achievement unlock notifications
type AchievementUnlockCallback = (achievement: Achievement) => void;
let achievementUnlockCallback: AchievementUnlockCallback | null = null;

export function setAchievementUnlockCallback(callback: AchievementUnlockCallback | null): void {
  achievementUnlockCallback = callback;
}

// Callback for hero level-up notifications
type HeroLevelUpCallback = (hero: HeroDefinition, newLevel: number) => void;
let heroLevelUpCallback: HeroLevelUpCallback | null = null;

export function setHeroLevelUpCallback(callback: HeroLevelUpCallback | null): void {
  heroLevelUpCallback = callback;
}

// Callback for crafting events
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

interface GameStore extends GameState {
  // Actions
  click: () => void;
  tick: (deltaMs: number) => void;
  addCurds: (amount: Decimal) => void;
  // Generator actions
  buyGenerator: (id: string, count: number) => boolean;
  getGeneratorCost: (id: string, count: number) => Decimal;
  canAffordGenerator: (id: string, count: number) => boolean;
  getMaxAffordable: (id: string) => number;
  getGeneratorCount: (id: string) => number;
  // Upgrade actions
  buyUpgrade: (id: string) => boolean;
  canAffordUpgrade: (id: string) => boolean;
  isUpgradeVisible: (id: string) => boolean;
  isUpgradePurchased: (id: string) => boolean;
  getAvailableUpgrades: () => Upgrade[];
  getPurchasedUpgrades: () => Upgrade[];
  // Achievement actions
  checkAchievements: () => void;
  isAchievementUnlocked: (id: string) => boolean;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementGlobalMultiplier: () => number;
  getAchievementClickMultiplier: () => number;
  // Hero actions
  recruitHero: (heroId: string) => boolean;
  canAffordHero: (heroId: string) => boolean;
  isHeroRecruited: (heroId: string) => boolean;
  getHeroState: (heroId: string) => HeroState | undefined;
  getAvailableHeroes: () => HeroDefinition[];
  getRecruitedHeroes: () => HeroDefinition[];
  // Party management
  assignToParty: (heroId: string, position: FormationPosition) => boolean;
  removeFromParty: (position: FormationPosition) => void;
  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => void;
  getPartyHeroes: () => (HeroDefinition | null)[];
  // Equipment management
  buyEquipment: (equipmentId: string) => boolean;
  canAffordEquipment: (equipmentId: string) => boolean;
  equipItem: (heroId: string, equipmentId: string) => boolean;
  unequipItem: (heroId: string, slot: EquipmentSlot) => void;
  getHeroEquipment: (heroId: string) => Equipment[];
  // XP and leveling
  grantXp: (heroId: string, amount: number) => void;
  tickHeroXp: (deltaMs: number) => void;
  // Canadian dialogue / "eh" counter
  incrementEh: () => void;
  getEhBonus: () => number;
  checkMilestone: () => number | null; // Returns milestone if newly crossed, null otherwise
  setLastMilestone: (milestone: number) => void;
  // Computed values
  getClickValue: () => Decimal;
  getClickMultiplier: () => number;
  getGeneratorMultiplier: (id: string) => number;
  getGlobalMultiplier: () => number;
  getHeroMultiplier: () => number;
  recalculateCps: () => void;
  // Combat actions
  startCombat: (zoneId: string, stageNumber: number) => boolean;
  tickCombat: (deltaMs: number) => void;
  endCombat: (result: 'victory' | 'defeat' | 'flee') => void;
  setCombatSpeed: (speed: 1 | 2 | 4) => void;
  useHeroSkill: (heroId: string, skillId: string, targetId?: string) => boolean;
  useLimitBreak: (heroId: string) => boolean;
  canUseHeroSkill: (heroId: string) => { canUse: boolean; reason?: string };
  canUseLimitBreakAction: (heroId: string) => { canUse: boolean; reason?: string };
  claimCombatRewards: () => CombatRewards | null;
  getPartyStats: () => Record<string, HeroStats>;
  getZoneProgress: (zoneId: string) => ZoneProgress | undefined;
  // Persistence
  save: () => void;
  load: () => OfflineProgress | null;
  reset: () => void;
  // Prestige actions
  getPotentialRennet: () => number;
  canPerformAging: () => boolean;
  performAging: () => { rennetGained: number; newTotal: number };
  purchaseAgingUpgrade: (upgradeId: string) => boolean;
  canPurchaseAgingUpgrade: (upgradeId: string) => boolean;
  getAgingUpgradePurchaseCount: (upgradeId: string) => number;
  getPrestigeMultipliers: () => {
    production: number;
    click: number;
    costReduction: number;
    xp: number;
    combat: number;
  };
  // Vintage actions (framework)
  canPerformVintage: () => boolean;
  performVintage: () => { wheelsGained: number; newTotal: number };
  // Legacy actions (framework)
  canPerformLegacy: () => boolean;
  performLegacy: () => { legacyGained: number };

  // Crafting actions
  unlockIngredient: (ingredientId: string) => boolean;
  unlockRecipe: (recipeId: string) => boolean;
  unlockCave: (caveId: string) => boolean;
  canAffordCave: (caveId: string) => boolean;

  startCrafting: (recipeId: string, caveId: string, ingredients: CraftingJob['ingredients']) => boolean;
  canStartCrafting: (recipeId: string, caveId: string) => { canStart: boolean; reason?: string };
  getCaveAvailableSlots: (caveId: string) => number;

  tickCrafting: (deltaMs: number) => void;
  collectCheese: (jobId: string) => CraftedCheese | null;

  consumeCheese: (cheeseId: string) => boolean;
  sellCheese: (cheeseId: string) => Decimal;

  addInteraction: (jobId: string, interaction: Omit<CraftingInteraction, 'timestamp'>) => boolean;

  tickBuffs: (deltaMs: number) => void;
  getActiveBuffMultipliers: () => { production: number; click: number; xp: number };

  // Crafting getters
  getUnlockedRecipes: () => CheeseRecipe[];
  getUnlockedCaves: () => AffinageCave[];
  getActiveJobs: () => CraftingJob[];
  getCheeseInventory: () => CraftedCheese[];
  getJobProgress: (jobId: string) => number; // 0-100

  // Event actions
  activateEvent: (eventId: string) => boolean;
  deactivateEvent: (eventId: string) => boolean;
  getEventBonuses: () => EventBonus[];
  getEventMultipliers: () => { production: number; xp: number; drops: number; click: number };
}

const initialState: GameState = {
  curds: new Decimal(0),
  whey: new Decimal(0),
  totalCurdsEarned: new Decimal(0),
  totalClicks: 0,
  curdPerClick: new Decimal(1),
  curdPerSecond: new Decimal(0),
  generators: {},
  upgrades: [],
  achievements: [],
  ehCount: 0,
  lastMilestone: 0,
  lastSaved: Date.now(),
  gameStarted: Date.now(),
  // Hero system
  heroes: {},
  party: {
    frontLeft: null,
    frontRight: null,
    backLeft: null,
    backRight: null,
  },
  equipmentInventory: [],
  // Combat system
  combat: {
    isInCombat: false,
    currentZone: null,
    currentStage: 0,
    enemies: [],
    heroStates: {},
    combatLog: [],
    combatSpeed: 1,
    limitBreakGauge: 0,
    battleResult: null,
  },
  zoneProgress: {},
  // Prestige system
  prestige: {
    rennet: 0,
    totalRennet: 0,
    agingResetCount: 0,
    agingUpgrades: [],
    vintageWheels: 0,
    totalVintageWheels: 0,
    vintageResetCount: 0,
    vintageUnlocks: [],
    legacy: 0,
    legacyBonuses: {
      ontario: 0,
      quebec: 0,
      alberta: 0,
      manitoba: 0,
      saskatchewan: 0,
      yukon: 0,
      bc: 0,
      nova_scotia: 0,
      new_brunswick: 0,
      pei: 0,
      newfoundland: 0,
      nwt: 0,
      nunavut: 0,
    },
    legacyResetCount: 0,
  },
  // Crafting system
  crafting: {
    unlockedIngredients: ['milk_cow', 'culture_basic', 'rennet_animal'],
    unlockedRecipes: ['cottage_cheese', 'ricotta', 'cream_cheese'],
    unlockedCaves: ['basic_cellar'],
    activeJobs: [],
    cheeseInventory: [],
    cheeseCollection: {},
    activeBuffs: [],
  },

  // Event system
  activeEvents: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  click: () => {
    const state = get();
    const baseClickValue = state.getClickValue();
    // Apply cheese buff and event click multipliers
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const clickValue = baseClickValue.mul(buffMultipliers.click).mul(eventMultipliers.click);

    set((s) => ({
      curds: s.curds.plus(clickValue),
      totalCurdsEarned: s.totalCurdsEarned.plus(clickValue),
      totalClicks: s.totalClicks + 1,
    }));
    // Check achievements after click
    get().checkAchievements();
  },

  tick: (deltaMs: number) => {
    const state = get();
    const { curdPerSecond } = state;
    if (curdPerSecond.isZero()) return;

    // Apply cheese buff and event production multipliers
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const effectiveCps = curdPerSecond.mul(buffMultipliers.production).mul(eventMultipliers.production);

    const secondsElapsed = deltaMs / 1000;
    const curdsEarned = effectiveCps.mul(secondsElapsed);

    set((s) => ({
      curds: s.curds.plus(curdsEarned),
      totalCurdsEarned: s.totalCurdsEarned.plus(curdsEarned),
    }));
  },

  addCurds: (amount: Decimal) => {
    set((state) => ({
      curds: state.curds.plus(amount),
      totalCurdsEarned: state.totalCurdsEarned.plus(amount),
    }));
  },

  buyGenerator: (id: string, count: number) => {
    const state = get();
    const cost = calculateGeneratorCost(id, state.generators[id] ?? 0, count);

    if (state.curds.lt(cost)) {
      return false;
    }

    const currentOwned = get().generators[id] ?? 0;

    set((s) => {
      const newGenerators = {
        ...s.generators,
        [id]: (s.generators[id] ?? 0) + count,
      };
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(newGenerators, generatorMultipliers, totalGlobalMultiplier);

      return {
        curds: s.curds.minus(cost),
        generators: newGenerators,
        curdPerSecond: newCps,
      };
    });

    // Track analytics
    trackGeneratorPurchase(id, count, currentOwned + count);

    // Check achievements after purchase
    get().checkAchievements();

    return true;
  },

  getGeneratorCost: (id: string, count: number) => {
    const { generators } = get();
    return calculateGeneratorCost(id, generators[id] ?? 0, count);
  },

  canAffordGenerator: (id: string, count: number) => {
    const { curds, generators } = get();
    const cost = calculateGeneratorCost(id, generators[id] ?? 0, count);
    return curds.gte(cost);
  },

  getMaxAffordable: (id: string) => {
    const { curds, generators } = get();
    return calculateMaxAffordable(id, generators[id] ?? 0, curds);
  },

  getGeneratorCount: (id: string) => {
    return get().generators[id] ?? 0;
  },

  // ===== Upgrade Actions =====

  buyUpgrade: (id: string) => {
    const state = get();
    const upgrade = getUpgradeById(id);

    if (!upgrade) return false;
    if (state.upgrades.includes(id)) return false;
    if (!state.canAffordUpgrade(id)) return false;
    if (!state.isUpgradeVisible(id)) return false;

    const currency = upgrade.costCurrency === 'curds' ? state.curds : state.whey;
    if (currency.lt(upgrade.cost)) return false;

    set((s) => {
      const newUpgrades = [...s.upgrades, id];
      const generatorMultipliers = calculateGeneratorMultipliers(newUpgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(newUpgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      // Calculate new click value based on multipliers (including achievement and prestige bonuses)
      const upgradeClickMultiplier = calculateClickMultiplier(newUpgrades);
      const achievementClickMultiplier = calculateAchievementClickMultiplier(s.achievements);
      const prestigeClickMultiplier = calculatePrestigeClickMultiplier(s.prestige);
      const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
      const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);

      return {
        curds: upgrade.costCurrency === 'curds'
          ? s.curds.minus(upgrade.cost)
          : s.curds,
        whey: upgrade.costCurrency === 'whey'
          ? s.whey.minus(upgrade.cost)
          : s.whey,
        upgrades: newUpgrades,
        curdPerSecond: newCps,
        curdPerClick: newCurdPerClick,
      };
    });

    // Track analytics
    trackUpgradePurchase(id);

    // Check achievements after purchase
    get().checkAchievements();

    return true;
  },

  canAffordUpgrade: (id: string) => {
    const { curds, whey, upgrades } = get();
    const upgrade = getUpgradeById(id);

    if (!upgrade) return false;
    if (upgrades.includes(id)) return false;

    const currency = upgrade.costCurrency === 'curds' ? curds : whey;
    return currency.gte(upgrade.cost);
  },

  isUpgradeVisible: (id: string) => {
    const { generators, upgrades } = get();
    const upgrade = getUpgradeById(id);

    if (!upgrade) return false;
    if (upgrades.includes(id)) return false; // Already purchased

    // Check requirement
    if (upgrade.requirement) {
      return checkRequirement(upgrade.requirement, generators);
    }

    return true; // No requirement, always visible
  },

  isUpgradePurchased: (id: string) => {
    return get().upgrades.includes(id);
  },

  getAvailableUpgrades: () => {
    const state = get();
    return UPGRADES.filter((upgrade) => {
      // Not already purchased
      if (state.upgrades.includes(upgrade.id)) return false;
      // Requirements met
      if (upgrade.requirement) {
        return checkRequirement(upgrade.requirement, state.generators);
      }
      return true;
    });
  },

  getPurchasedUpgrades: () => {
    const { upgrades } = get();
    return UPGRADES.filter((upgrade) => upgrades.includes(upgrade.id));
  },

  // ===== Achievement Actions =====

  checkAchievements: () => {
    const state = get();
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip already unlocked
      if (state.achievements.includes(achievement.id)) continue;

      // Check if requirement is met
      if (checkAchievementRequirement(achievement, state)) {
        newlyUnlocked.push(achievement);
      }
    }

    if (newlyUnlocked.length === 0) return;

    // Unlock achievements and recalculate multipliers
    set((s) => {
      const newAchievements = [...s.achievements, ...newlyUnlocked.map((a) => a.id)];

      // Recalculate CPS with new achievement bonuses
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(newAchievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      // Recalculate click value with new achievement and prestige bonuses
      const upgradeClickMultiplier = calculateClickMultiplier(s.upgrades);
      const achievementClickMultiplier = calculateAchievementClickMultiplier(newAchievements);
      const prestigeClickMultiplier = calculatePrestigeClickMultiplier(s.prestige);
      const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
      const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);

      return {
        achievements: newAchievements,
        curdPerSecond: newCps,
        curdPerClick: newCurdPerClick,
      };
    });

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

  // ===== Hero Actions =====

  recruitHero: (heroId: string) => {
    const state = get();
    const heroDef = getHeroById(heroId);

    if (!heroDef) return false;
    if (state.heroes[heroId]) return false; // Already recruited
    if (state.curds.lt(heroDef.recruitCost)) return false;

    set((s) => {
      const newHeroState: HeroState = {
        id: heroId,
        level: 1,
        xp: 0,
        xpToNextLevel: getXpForLevel(1),
        equipment: {},
      };

      const newHeroes = { ...s.heroes, [heroId]: newHeroState };

      // Recalculate CPS with new hero
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(newHeroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, newHeroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        curds: s.curds.minus(heroDef.recruitCost),
        heroes: newHeroes,
        curdPerSecond: newCps,
      };
    });

    // Track analytics
    const totalRecruited = Object.keys(get().heroes).length;
    trackHeroRecruit(heroId, totalRecruited);

    return true;
  },

  canAffordHero: (heroId: string) => {
    const { curds, heroes } = get();
    const heroDef = getHeroById(heroId);

    if (!heroDef) return false;
    if (heroes[heroId]) return false; // Already recruited
    return curds.gte(heroDef.recruitCost);
  },

  isHeroRecruited: (heroId: string) => {
    return get().heroes[heroId] !== undefined;
  },

  getHeroState: (heroId: string) => {
    return get().heroes[heroId];
  },

  getAvailableHeroes: () => {
    const { heroes } = get();
    return HEROES.filter((h) => !heroes[h.id]);
  },

  getRecruitedHeroes: () => {
    const { heroes } = get();
    return HEROES.filter((h) => heroes[h.id] !== undefined);
  },

  // ===== Party Management =====

  assignToParty: (heroId: string, position: FormationPosition) => {
    const state = get();

    // Hero must be recruited
    if (!state.heroes[heroId]) return false;

    // Check if hero is already in party at another position
    const currentPosition = Object.entries(state.party).find(
      ([, id]) => id === heroId
    )?.[0] as FormationPosition | undefined;

    set((s) => {
      const newParty = { ...s.party };

      // Remove from current position if in party
      if (currentPosition) {
        newParty[currentPosition] = null;
      }

      // Assign to new position
      newParty[position] = heroId;

      // Recalculate CPS with new party
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, newParty);
      const formationBonus = calculateFormationBonus(newParty, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        party: newParty,
        curdPerSecond: newCps,
      };
    });

    return true;
  },

  removeFromParty: (position: FormationPosition) => {
    set((s) => {
      const newParty = { ...s.party, [position]: null };

      // Recalculate CPS
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, newParty);
      const formationBonus = calculateFormationBonus(newParty, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        party: newParty,
        curdPerSecond: newCps,
      };
    });
  },

  swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => {
    set((s) => {
      const newParty = {
        ...s.party,
        [pos1]: s.party[pos2],
        [pos2]: s.party[pos1],
      };

      // Recalculate CPS (formation bonus may change)
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(s.heroes, newParty);
      const formationBonus = calculateFormationBonus(newParty, s.heroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        party: newParty,
        curdPerSecond: newCps,
      };
    });
  },

  getPartyHeroes: () => {
    const { party } = get();
    const positions: FormationPosition[] = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];
    return positions.map((pos) => {
      const heroId = party[pos];
      return heroId ? getHeroById(heroId) ?? null : null;
    });
  },

  // ===== Equipment Management =====

  buyEquipment: (equipmentId: string) => {
    const state = get();
    const equipment = getEquipmentById(equipmentId);

    if (!equipment) return false;
    if (state.equipmentInventory.includes(equipmentId)) return false; // Already owned
    if (state.curds.lt(equipment.cost)) return false;

    set((s) => ({
      curds: s.curds.minus(equipment.cost),
      equipmentInventory: [...s.equipmentInventory, equipmentId],
    }));

    return true;
  },

  canAffordEquipment: (equipmentId: string) => {
    const { curds, equipmentInventory } = get();
    const equipment = getEquipmentById(equipmentId);

    if (!equipment) return false;
    if (equipmentInventory.includes(equipmentId)) return false; // Already owned
    return curds.gte(equipment.cost);
  },

  equipItem: (heroId: string, equipmentId: string) => {
    const state = get();
    const heroState = state.heroes[heroId];
    const equipment = getEquipmentById(equipmentId);

    if (!heroState) return false;
    if (!equipment) return false;
    if (!state.equipmentInventory.includes(equipmentId)) return false; // Must own it

    // Check if equipment is already equipped on another hero
    for (const [otherId, otherHero] of Object.entries(state.heroes)) {
      if (otherId !== heroId && Object.values(otherHero.equipment).includes(equipmentId)) {
        return false; // Equipment already in use
      }
    }

    set((s) => {
      const newHeroState: HeroState = {
        ...s.heroes[heroId],
        equipment: {
          ...s.heroes[heroId].equipment,
          [equipment.slot]: equipmentId,
        },
      };

      const newHeroes = { ...s.heroes, [heroId]: newHeroState };

      // Recalculate CPS with new equipment (affects hero stats -> affinity -> CPS bonus)
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(newHeroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, newHeroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        heroes: newHeroes,
        curdPerSecond: newCps,
      };
    });

    return true;
  },

  unequipItem: (heroId: string, slot: EquipmentSlot) => {
    const state = get();
    const heroState = state.heroes[heroId];

    if (!heroState) return;
    if (!heroState.equipment[slot]) return; // Nothing to unequip

    set((s) => {
      const newEquipment = { ...s.heroes[heroId].equipment };
      delete newEquipment[slot];

      const newHeroState: HeroState = {
        ...s.heroes[heroId],
        equipment: newEquipment,
      };

      const newHeroes = { ...s.heroes, [heroId]: newHeroState };

      // Recalculate CPS
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(newHeroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, newHeroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        heroes: newHeroes,
        curdPerSecond: newCps,
      };
    });
  },

  getHeroEquipment: (heroId: string) => {
    const heroState = get().heroes[heroId];
    if (!heroState) return [];

    const equipment: Equipment[] = [];
    for (const equipmentId of Object.values(heroState.equipment)) {
      if (equipmentId) {
        const eq = getEquipmentById(equipmentId);
        if (eq) equipment.push(eq);
      }
    }
    return equipment;
  },

  // ===== XP and Leveling =====

  grantXp: (heroId: string, amount: number) => {
    const state = get();
    const heroState = state.heroes[heroId];

    if (!heroState) return;
    if (heroState.level >= HERO_MAX_LEVEL) return;

    set((s) => {
      const currentHero = s.heroes[heroId];
      let xp = currentHero.xp + amount;
      let level = currentHero.level;
      let xpToNextLevel = currentHero.xpToNextLevel;

      // Process level ups
      while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
        xp -= xpToNextLevel;
        level += 1;
        xpToNextLevel = getXpForLevel(level);

        // Notify about level up
        const heroDef = getHeroById(heroId);
        if (heroDef && heroLevelUpCallback) {
          heroLevelUpCallback(heroDef, level);
        }

        // Track analytics
        trackHeroLevelUp(heroId, level);
      }

      // Cap XP at max level
      if (level >= HERO_MAX_LEVEL) {
        xp = 0;
        xpToNextLevel = 0;
      }

      const hero: HeroState = {
        ...currentHero,
        xp,
        level,
        xpToNextLevel,
      };

      const newHeroes = { ...s.heroes, [heroId]: hero };

      // Recalculate CPS (level affects stats -> affinity -> bonus)
      const generatorMultipliers = calculateGeneratorMultipliers(s.upgrades);
      const upgradeGlobalMultiplier = calculateGlobalMultiplier(s.upgrades);
      const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(s.achievements);
      const heroBonus = calculateHeroCpsBonus(newHeroes, s.party);
      const formationBonus = calculateFormationBonus(s.party, newHeroes);
      const prestigeMultiplier = calculatePrestigeProductionMultiplier(s.prestige);
      const totalGlobalMultiplier =
        upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
      const newCps = calculateCps(s.generators, generatorMultipliers, totalGlobalMultiplier);

      return {
        heroes: newHeroes,
        curdPerSecond: newCps,
      };
    });
  },

  tickHeroXp: (deltaMs: number) => {
    const state = get();
    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null);

    if (partyHeroIds.length === 0) return;

    // Calculate XP per second based on CPS
    const xpPerSecond = calculateXpPerSecond(state.curdPerSecond);

    // Apply cheese buff and event XP multipliers
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * deltaMs) / 1000;

    // Split XP among party members
    const xpPerHero = xpGained / partyHeroIds.length;

    for (const heroId of partyHeroIds) {
      get().grantXp(heroId, xpPerHero);
    }
  },

  // ===== Canadian Dialogue / "Eh" Counter =====

  incrementEh: () => {
    set((state) => ({ ehCount: state.ehCount + 1 }));
  },

  getEhBonus: () => {
    // Every 100 "eh"s gives +1% production
    const { ehCount } = get();
    return 1 + Math.floor(ehCount / 100) * 0.01;
  },

  checkMilestone: () => {
    const { totalCurdsEarned, lastMilestone } = get();
    const totalNum = totalCurdsEarned.toNumber();

    // Find the next milestone we haven't triggered yet
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (threshold > lastMilestone && totalNum >= threshold) {
        // We've crossed a new milestone
        set({ lastMilestone: threshold });
        return threshold;
      }
    }
    return null;
  },

  setLastMilestone: (milestone: number) => {
    set({ lastMilestone: milestone });
  },

  // ===== Computed Values =====

  getClickValue: () => {
    const { curdPerClick } = get();
    return curdPerClick;
  },

  getClickMultiplier: () => {
    const { upgrades, achievements, prestige } = get();
    const upgradeMultiplier = calculateClickMultiplier(upgrades);
    const achievementMultiplier = calculateAchievementClickMultiplier(achievements);
    const prestigeMultiplier = calculatePrestigeClickMultiplier(prestige);
    return upgradeMultiplier * achievementMultiplier * prestigeMultiplier;
  },

  getGeneratorMultiplier: (id: string) => {
    const { upgrades } = get();
    const multipliers = calculateGeneratorMultipliers(upgrades);
    return multipliers[id] ?? 1;
  },

  getGlobalMultiplier: () => {
    const { upgrades, achievements, heroes, party, prestige } = get();
    const upgradeMultiplier = calculateGlobalMultiplier(upgrades);
    const achievementMultiplier = calculateAchievementGlobalMultiplier(achievements);
    const heroBonus = calculateHeroCpsBonus(heroes, party);
    const formationBonus = calculateFormationBonus(party, heroes);
    const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
    return upgradeMultiplier * achievementMultiplier * heroBonus * formationBonus * prestigeMultiplier;
  },

  getHeroMultiplier: () => {
    const { heroes, party } = get();
    const heroBonus = calculateHeroCpsBonus(heroes, party);
    const formationBonus = calculateFormationBonus(party, heroes);
    return heroBonus * formationBonus;
  },

  recalculateCps: () => {
    const { generators, upgrades, achievements, heroes, party, prestige } = get();
    const generatorMultipliers = calculateGeneratorMultipliers(upgrades);
    const upgradeGlobalMultiplier = calculateGlobalMultiplier(upgrades);
    const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(achievements);
    const heroBonus = calculateHeroCpsBonus(heroes, party);
    const formationBonus = calculateFormationBonus(party, heroes);
    const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
    const totalGlobalMultiplier =
      upgradeGlobalMultiplier * achievementGlobalMultiplier * heroBonus * formationBonus * prestigeMultiplier;
    const newCps = calculateCps(generators, generatorMultipliers, totalGlobalMultiplier);
    set({ curdPerSecond: newCps });
  },

  // ===== Combat Actions =====

  startCombat: (zoneId: string, stageNumber: number) => {
    const state = get();

    // Can't start combat if already in combat
    if (state.combat.isInCombat) return false;

    // Need at least one hero in party
    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    if (partyHeroIds.length === 0) return false;

    const combatState = initializeCombat(zoneId, stageNumber, state.heroes, state.party);
    if (!combatState) return false;

    set({ combat: combatState });

    // Track analytics
    const isBoss = isBossStage(zoneId, stageNumber);
    trackCombatStart(zoneId, stageNumber, isBoss);

    return true;
  },

  tickCombat: (deltaMs: number) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') return;

    const partyStats = get().getPartyStats();
    const result = tickCombat(state.combat, deltaMs, partyStats);

    if (Object.keys(result.stateUpdates).length > 0 || result.newLogEntries.length > 0) {
      set((s) => ({
        combat: {
          ...s.combat,
          ...result.stateUpdates,
          combatLog: [...s.combat.combatLog, ...result.newLogEntries].slice(-100), // Keep last 100 entries
        },
      }));
    }
  },

  endCombat: (result: 'victory' | 'defeat' | 'flee') => {
    const state = get();
    if (!state.combat.isInCombat) return;

    if (result === 'victory') {
      // Update zone progress
      const zoneId = state.combat.currentZone;
      const stageNumber = state.combat.currentStage;

      if (zoneId) {
        const currentProgress = state.zoneProgress[zoneId] || {
          zoneId,
          highestStageCleared: 0,
          bossDefeated: false,
          timesCompleted: 0,
        };

        const isBoss = isBossStage(zoneId, stageNumber);
        const newProgress = {
          ...currentProgress,
          highestStageCleared: Math.max(currentProgress.highestStageCleared, stageNumber),
          bossDefeated: currentProgress.bossDefeated || isBoss,
          timesCompleted: isBoss ? currentProgress.timesCompleted + 1 : currentProgress.timesCompleted,
        };

        set((s) => ({
          zoneProgress: {
            ...s.zoneProgress,
            [zoneId]: newProgress,
          },
        }));
      }
    }

    // Track combat end analytics
    const zoneIdForTracking = state.combat.currentZone;
    const stageNumberForTracking = state.combat.currentStage;
    if (zoneIdForTracking) {
      // Combat log can be used to estimate duration (first entry timestamp to now)
      const firstLogEntry = state.combat.combatLog[0];
      const durationMs = firstLogEntry ? Date.now() - firstLogEntry.timestamp : 0;
      trackCombatEnd(zoneIdForTracking, stageNumberForTracking, result, durationMs);
    }

    // Combat ends but we keep the state for rewards claiming
    set((s) => ({
      combat: {
        ...s.combat,
        battleResult: result === 'flee' ? 'defeat' : result,
      },
    }));
  },

  setCombatSpeed: (speed: 1 | 2 | 4) => {
    set((s) => ({
      combat: {
        ...s.combat,
        combatSpeed: speed,
      },
    }));
  },

  useHeroSkill: (heroId: string, _skillId: string, targetId?: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = get().getPartyStats();
    const result = executeHeroAbility(state.combat, heroId, partyStats, targetId);

    if (!result.success) {
      return false;
    }

    // Apply state updates
    set((s) => {
      const updatedCombat = {
        ...s.combat,
        ...result.stateUpdates,
        combatLog: [...s.combat.combatLog, ...result.logEntries].slice(-100),
      };

      // Check for victory
      if (result.stateUpdates.enemies?.every((e: { isAlive: boolean }) => !e.isAlive)) {
        updatedCombat.battleResult = 'victory';
      }

      return { combat: updatedCombat };
    });

    return true;
  },

  useLimitBreak: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return false;
    }

    const partyStats = get().getPartyStats();
    const result = executeHeroLimitBreak(state.combat, heroId, partyStats);

    if (!result.success) {
      return false;
    }

    // Apply state updates
    set((s) => {
      const updatedCombat = {
        ...s.combat,
        ...result.stateUpdates,
        combatLog: [...s.combat.combatLog, ...result.logEntries].slice(-100),
      };

      // Check for victory
      if (result.stateUpdates.enemies?.every((e: { isAlive: boolean }) => !e.isAlive)) {
        updatedCombat.battleResult = 'victory';
      }

      return { combat: updatedCombat };
    });

    return true;
  },

  canUseHeroSkill: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return { canUse: false, reason: 'Not in active combat' };
    }
    const heroState = state.combat.heroStates[heroId];
    if (!heroState) {
      return { canUse: false, reason: 'Hero not in combat' };
    }
    return canUseAbility(heroState, heroId);
  },

  canUseLimitBreakAction: (heroId: string) => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
      return { canUse: false, reason: 'Not in active combat' };
    }
    return canUseLimitBreak(state.combat, heroId);
  },

  claimCombatRewards: () => {
    const state = get();
    if (!state.combat.isInCombat || state.combat.battleResult !== 'victory') {
      return null;
    }

    const zoneId = state.combat.currentZone;
    const stageNumber = state.combat.currentStage;
    const isBoss = zoneId ? isBossStage(zoneId, stageNumber) : false;

    // Get party hero IDs
    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    // Calculate rewards
    const rewards = calculateCombatRewards(state.combat.enemies, partyHeroIds, isBoss);

    // Apply rewards
    set((s) => ({
      curds: s.curds.plus(rewards.curds),
      whey: s.whey.plus(rewards.whey),
      totalCurdsEarned: s.totalCurdsEarned.plus(rewards.curds),
    }));

    // Grant XP to heroes
    for (const [heroId, xpAmount] of Object.entries(rewards.xp)) {
      get().grantXp(heroId, xpAmount);
    }

    // Reset combat state
    set({ combat: createEmptyCombatState() });

    return rewards;
  },

  getPartyStats: () => {
    const state = get();
    const stats: Record<string, HeroStats> = {};

    const partyHeroIds = [
      state.party.frontLeft,
      state.party.frontRight,
      state.party.backLeft,
      state.party.backRight,
    ].filter((id): id is string => id !== null && state.heroes[id] !== undefined);

    for (const heroId of partyHeroIds) {
      const heroState = state.heroes[heroId];
      if (heroState) {
        stats[heroId] = calculateHeroStats(heroId, heroState);
      }
    }

    return stats;
  },

  getZoneProgress: (zoneId: string) => {
    return get().zoneProgress[zoneId];
  },

  // ===== Prestige Actions =====

  getPotentialRennet: () => {
    const { totalCurdsEarned } = get();
    return calculatePotentialRennet(totalCurdsEarned);
  },

  canPerformAging: () => {
    const potentialRennet = get().getPotentialRennet();
    return potentialRennet > 0;
  },

  performAging: () => {
    const state = get();
    const rennetGained = calculatePotentialRennet(state.totalCurdsEarned);

    if (rennetGained === 0) {
      return { rennetGained: 0, newTotal: state.prestige.rennet };
    }

    // Calculate starting resources from Aging upgrades
    const startingCurds = calculateStartingCurds(state.prestige);
    const startingGenerators = calculateStartingGenerators(state.prestige);

    set((s) => ({
      // Reset progress
      curds: startingCurds,
      whey: new Decimal(0),
      totalCurdsEarned: new Decimal(0),
      totalClicks: 0,
      generators: startingGenerators,
      upgrades: [],

      // Keep heroes, equipment, achievements, zone progress, eh count
      // (These persist through Aging)

      // Update prestige state
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet + rennetGained,
        totalRennet: s.prestige.totalRennet + rennetGained,
        agingResetCount: s.prestige.agingResetCount + 1,
        // agingUpgrades persist through Aging
      },

      // Reset derived values
      curdPerClick: new Decimal(1),
      curdPerSecond: new Decimal(0),

      // Reset combat state (not in combat after prestige)
      combat: {
        isInCombat: false,
        currentZone: null,
        currentStage: 0,
        enemies: [],
        heroStates: {},
        combatLog: [],
        combatSpeed: 1,
        limitBreakGauge: 0,
        battleResult: null,
      },

      // Crafting system: preserve caves and collection, reset active jobs/inventory/buffs
      crafting: {
        ...s.crafting,
        // Keep: unlocked ingredients, recipes, caves, and collection stats
        unlockedIngredients: s.crafting.unlockedIngredients,
        unlockedRecipes: s.crafting.unlockedRecipes,
        unlockedCaves: s.crafting.unlockedCaves,
        cheeseCollection: s.crafting.cheeseCollection,
        // Reset: active jobs (cancel), inventory (lose), active buffs (expire)
        activeJobs: [],
        cheeseInventory: [],
        activeBuffs: [],
      },

      lastSaved: Date.now(),
    }));

    // Recalculate CPS with new prestige multipliers
    get().recalculateCps();

    // Track analytics
    trackPrestige('aging', rennetGained);

    return {
      rennetGained,
      newTotal: get().prestige.rennet,
    };
  },

  purchaseAgingUpgrade: (upgradeId: string) => {
    const state = get();
    const upgrade = getAgingUpgradeById(upgradeId);

    if (!upgrade) return false;
    if (!state.canPurchaseAgingUpgrade(upgradeId)) return false;

    set((s) => ({
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet - upgrade.cost,
        agingUpgrades: [...s.prestige.agingUpgrades, upgradeId],
      },
    }));

    // Recalculate multipliers
    get().recalculateCps();

    return true;
  },

  canPurchaseAgingUpgrade: (upgradeId: string) => {
    const { prestige } = get();
    const upgrade = getAgingUpgradeById(upgradeId);
    if (!upgrade) return false;

    const totalRennetSpent = prestige.totalRennet - prestige.rennet;
    return canPurchaseAgingUpgradeHelper(
      upgrade,
      prestige.agingUpgrades,
      prestige.rennet,
      prestige.agingResetCount,
      totalRennetSpent
    );
  },

  getAgingUpgradePurchaseCount: (upgradeId: string) => {
    return getAgingUpgradePurchaseCountHelper(get().prestige.agingUpgrades, upgradeId);
  },

  getPrestigeMultipliers: () => {
    const { prestige } = get();
    return {
      production: calculatePrestigeProductionMultiplier(prestige),
      click: calculatePrestigeClickMultiplier(prestige),
      costReduction: calculatePrestigeCostReduction(prestige),
      xp: calculatePrestigeXpMultiplier(prestige),
      combat: calculatePrestigeCombatMultiplier(prestige),
    };
  },

  // ===== Vintage Actions (Framework) =====

  canPerformVintage: () => {
    const { prestige } = get();
    return prestige.agingResetCount >= 100 && prestige.rennet >= 100;
  },

  performVintage: () => {
    const state = get();
    if (!state.canPerformVintage()) {
      return { wheelsGained: 0, newTotal: state.prestige.vintageWheels };
    }

    const wheelsGained = Math.floor(state.prestige.rennet / 100);

    set((s) => ({
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet % 100, // Keep remainder
        vintageWheels: s.prestige.vintageWheels + wheelsGained,
        totalVintageWheels: s.prestige.totalVintageWheels + wheelsGained,
        vintageResetCount: s.prestige.vintageResetCount + 1,
        agingUpgrades: [], // Reset Aging upgrades on Vintage
      },
    }));

    return {
      wheelsGained,
      newTotal: get().prestige.vintageWheels,
    };
  },

  // ===== Legacy Actions (Framework) =====

  canPerformLegacy: () => {
    const { prestige } = get();
    return prestige.vintageResetCount >= 10 && prestige.vintageWheels >= 10;
  },

  performLegacy: () => {
    const state = get();
    if (!state.canPerformLegacy()) {
      return { legacyGained: 0 };
    }

    const legacyGained = state.prestige.vintageWheels;

    set((s) => ({
      prestige: {
        ...s.prestige,
        vintageWheels: 0,
        legacy: s.prestige.legacy + legacyGained,
        legacyResetCount: s.prestige.legacyResetCount + 1,
        vintageUnlocks: [], // Reset Vintage unlocks on Legacy
      },
    }));

    return { legacyGained };
  },

  // ===== Crafting Actions =====

  unlockIngredient: (ingredientId: string) => {
    const state = get();
    const ingredient = getIngredientById(ingredientId);

    if (!ingredient) return false;
    if (state.crafting.unlockedIngredients.includes(ingredientId)) return false;

    // Check unlock requirement
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

    set((s) => ({
      crafting: {
        ...s.crafting,
        unlockedIngredients: [...s.crafting.unlockedIngredients, ingredientId],
      },
    }));

    return true;
  },

  unlockRecipe: (recipeId: string) => {
    const state = get();
    const recipe = getRecipeById(recipeId);

    if (!recipe) return false;
    if (state.crafting.unlockedRecipes.includes(recipeId)) return false;

    // Check unlock requirement
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

    set((s) => ({
      crafting: {
        ...s.crafting,
        unlockedRecipes: [...s.crafting.unlockedRecipes, recipeId],
      },
    }));

    // Notify about recipe unlock
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

    // Check if can afford
    if (!state.canAffordCave(caveId)) return false;

    // Check unlock requirement
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

    // Deduct cost and unlock cave
    set((s) => ({
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet - cave.cost,
      },
      crafting: {
        ...s.crafting,
        unlockedCaves: [...s.crafting.unlockedCaves, caveId],
      },
    }));

    // Notify about cave unlock
    if (craftingEventCallback) {
      craftingEventCallback({ type: 'cave_unlocked', cave });
    }

    // Check achievements after unlocking cave
    get().checkAchievements();

    return true;
  },

  canAffordCave: (caveId: string) => {
    const state = get();
    const cave = getCaveById(caveId);

    if (!cave) return false;
    if (state.crafting.unlockedCaves.includes(caveId)) return false;

    // Check rennet cost
    if (state.prestige.rennet < cave.cost) return false;

    // Check unlock requirement
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

    const recipe = getRecipeById(recipeId);
    const cave = getCaveById(caveId);
    if (!recipe || !cave) return false;

    // Calculate ingredient costs
    const milk = getMilkByType(ingredients.milkType);
    const culture = getCultureByType(ingredients.cultureType);
    const rennet = getRennetByType(ingredients.rennetType);

    if (!milk || !culture || !rennet) return false;

    const totalCurdsCost = milk.cost.plus(culture.cost).plus(rennet.cost);

    // Add specialty item costs
    let specialtyCost = new Decimal(0);
    for (const itemId of ingredients.specialtyItems) {
      const item = getIngredientById(itemId);
      if (item) {
        specialtyCost = specialtyCost.plus(item.cost);
      }
    }

    const finalCost = totalCurdsCost.plus(specialtyCost);

    // Check affordability
    if (state.curds.lt(finalCost)) return false;

    // Calculate quality bonus from cave and ingredients
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
      id: `job_${now}_${Math.random().toString(36).substr(2, 9)}`,
      recipeId,
      caveId,
      startTime: now,
      endTime: now + recipe.agingDuration,
      ingredients,
      qualityBonus,
      interactions: [],
    };

    set((s) => ({
      curds: s.curds.minus(finalCost),
      crafting: {
        ...s.crafting,
        activeJobs: [...s.crafting.activeJobs, job],
      },
    }));

    // Track analytics
    trackCraftingStart(recipeId, caveId);

    return true;
  },

  canStartCrafting: (recipeId: string, caveId: string) => {
    const state = get();

    // Check recipe is unlocked
    if (!state.crafting.unlockedRecipes.includes(recipeId)) {
      return { canStart: false, reason: 'Recipe not unlocked' };
    }

    // Check cave is unlocked
    if (!state.crafting.unlockedCaves.includes(caveId)) {
      return { canStart: false, reason: 'Cave not unlocked' };
    }

    // Check cave has available slots
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
    // Check for completed jobs (jobs that have ended but need to be flagged)
    // Jobs stay in activeJobs until collected, but we could add notifications here
    // For now, this just keeps jobs updated for progress display
    // The collectCheese action handles actual completion
  },

  collectCheese: (jobId: string) => {
    const state = get();
    const now = Date.now();

    const jobIndex = state.crafting.activeJobs.findIndex((j) => j.id === jobId);
    if (jobIndex === -1) return null;

    const job = state.crafting.activeJobs[jobIndex];

    // Check if job is complete
    if (now < job.endTime) return null;

    const recipe = getRecipeById(job.recipeId);
    if (!recipe) return null;

    // Calculate final quality
    let finalQuality = recipe.baseQuality + job.qualityBonus;

    // Add interaction bonuses
    for (const interaction of job.interactions) {
      finalQuality += interaction.qualityEffect;
    }

    // Clamp quality to 1-100
    finalQuality = Math.max(1, Math.min(100, finalQuality));

    const cheese: CraftedCheese = {
      id: `cheese_${now}_${Math.random().toString(36).substr(2, 9)}`,
      recipeId: job.recipeId,
      quality: finalQuality,
      craftedAt: now,
      ingredients: job.ingredients,
    };

    set((s) => {
      const newActiveJobs = [...s.crafting.activeJobs];
      newActiveJobs.splice(jobIndex, 1);

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

    // Notify about cheese completion
    if (craftingEventCallback) {
      craftingEventCallback({ type: 'cheese_complete', cheese, recipe });
    }

    // Track analytics
    trackCraftingComplete(job.recipeId, finalQuality);

    // Check achievements after collecting cheese
    get().checkAchievements();

    return cheese;
  },

  consumeCheese: (cheeseId: string) => {
    const state = get();
    const now = Date.now();

    const cheeseIndex = state.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
    if (cheeseIndex === -1) return false;

    const cheese = state.crafting.cheeseInventory[cheeseIndex];
    const recipe = getRecipeById(cheese.recipeId);
    if (!recipe || !recipe.effects || recipe.effects.length === 0) return false;

    // Create buffs from cheese effects
    const newBuffs: CheeseActiveBuff[] = recipe.effects.map((effect) => {
      // Scale effect by quality (quality 50 = 1x, quality 100 = 1.5x, quality 1 = 0.5x)
      const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.0;
      const scaledEffect = { ...effect };

      if ('multiplier' in scaledEffect) {
        // For multipliers, scale the bonus portion: (mult - 1) * qualityMult + 1
        const bonus = (scaledEffect.multiplier - 1) * qualityMultiplier;
        scaledEffect.multiplier = 1 + bonus;
      }
      if ('value' in scaledEffect && typeof scaledEffect.value === 'number') {
        scaledEffect.value = Math.round(scaledEffect.value * qualityMultiplier);
      }

      return {
        id: `buff_${now}_${Math.random().toString(36).substr(2, 9)}`,
        effect: scaledEffect,
        startTime: now,
        endTime: now + effect.duration,
        sourceCheeseId: cheeseId,
      };
    });

    set((s) => {
      const newInventory = [...s.crafting.cheeseInventory];
      newInventory.splice(cheeseIndex, 1);

      return {
        crafting: {
          ...s.crafting,
          cheeseInventory: newInventory,
          activeBuffs: [...s.crafting.activeBuffs, ...newBuffs],
        },
      };
    });

    // Notify about buff activation
    if (craftingEventCallback && newBuffs.length > 0) {
      craftingEventCallback({ type: 'buff_activated', buff: newBuffs[0], recipe });
    }

    return true;
  },

  sellCheese: (cheeseId: string) => {
    const state = get();

    const cheeseIndex = state.crafting.cheeseInventory.findIndex((c) => c.id === cheeseId);
    if (cheeseIndex === -1) return new Decimal(0);

    const cheese = state.crafting.cheeseInventory[cheeseIndex];
    const recipe = getRecipeById(cheese.recipeId);
    if (!recipe) return new Decimal(0);

    // Calculate value based on quality
    // Quality 1 = 0.5x, Quality 100 = 2x
    const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.5;
    const value = recipe.baseValue.mul(qualityMultiplier);

    set((s) => {
      const newInventory = [...s.crafting.cheeseInventory];
      newInventory.splice(cheeseIndex, 1);

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

    const jobIndex = state.crafting.activeJobs.findIndex((j) => j.id === jobId);
    if (jobIndex === -1) return false;

    const job = state.crafting.activeJobs[jobIndex];
    const now = Date.now();

    // Can't interact with completed jobs
    if (now >= job.endTime) return false;

    const fullInteraction: CraftingInteraction = {
      ...interaction,
      timestamp: now,
    };

    set((s) => {
      const newJobs = [...s.crafting.activeJobs];
      newJobs[jobIndex] = {
        ...newJobs[jobIndex],
        interactions: [...newJobs[jobIndex].interactions, fullInteraction],
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

    // Find expired buffs for notifications
    const expiredBuffs = state.crafting.activeBuffs.filter(
      (buff) => now >= buff.endTime
    );

    // Remove expired buffs
    const activeBuffs = state.crafting.activeBuffs.filter(
      (buff) => now < buff.endTime
    );

    // Only update if buffs changed
    if (activeBuffs.length !== state.crafting.activeBuffs.length) {
      set((s) => ({
        crafting: {
          ...s.crafting,
          activeBuffs,
        },
      }));

      // Notify about expired buffs
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
        case 'production_boost':
          production *= effect.multiplier;
          break;
        case 'click_boost':
          click *= effect.multiplier;
          break;
        case 'xp_boost':
          xp *= effect.multiplier;
          break;
      }
    }

    return { production, click, xp };
  },

  // ===== Crafting Getters =====

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

    // Fresh cheeses (duration 0) are instantly complete
    if (totalDuration === 0) return 100;

    const elapsed = now - job.startTime;
    const progress = (elapsed / totalDuration) * 100;

    return Math.min(100, Math.max(0, progress));
  },

  // ===== Event Actions =====

  activateEvent: (eventId: string) => {
    const state = get();
    const event = getEventById(eventId);

    if (!event) return false;
    if (state.activeEvents.includes(eventId)) return false;

    set((s) => ({
      activeEvents: [...s.activeEvents, eventId],
    }));

    return true;
  },

  deactivateEvent: (eventId: string) => {
    const state = get();

    if (!state.activeEvents.includes(eventId)) return false;

    set((s) => ({
      activeEvents: s.activeEvents.filter((id) => id !== eventId),
    }));

    return true;
  },

  getEventBonuses: () => {
    const state = get();
    const bonuses: EventBonus[] = [];

    for (const eventId of state.activeEvents) {
      const event = getEventById(eventId);
      if (event) {
        bonuses.push(...event.bonuses);
      }
    }

    return bonuses;
  },

  getEventMultipliers: () => {
    const state = get();
    return {
      production: calculateEventBonusMultiplier(state.activeEvents, 'production'),
      xp: calculateEventBonusMultiplier(state.activeEvents, 'xp'),
      drops: calculateEventBonusMultiplier(state.activeEvents, 'drops'),
      click: calculateEventBonusMultiplier(state.activeEvents, 'click'),
    };
  },

  // ===== Persistence =====

  save: () => {
    const state = get();
    saveGame(state);
    set({ lastSaved: Date.now() });
  },

  load: () => {
    const savedState = loadGame();
    if (!savedState) return null;

    // Calculate offline progress before updating state
    const offlineProgress = calculateOfflineProgress(
      savedState.curdPerSecond,
      savedState.lastSaved
    );

    // Apply saved state plus offline curds
    set({
      ...savedState,
      curds: savedState.curds.plus(offlineProgress.curdsEarned),
      totalCurdsEarned: savedState.totalCurdsEarned.plus(offlineProgress.curdsEarned),
      lastSaved: Date.now(),
    });

    return offlineProgress;
  },

  reset: () => {
    set({
      ...initialState,
      lastSaved: Date.now(),
      gameStarted: Date.now(),
    });
  },
}));

// Helper function to check upgrade requirements
function checkRequirement(
  requirement: UpgradeRequirement,
  generators: Record<string, number>
): boolean {
  if (requirement.type === 'generatorOwned') {
    const owned = generators[requirement.generatorId] ?? 0;
    return owned >= requirement.count;
  }
  return false;
}

// Helper function to check achievement requirements
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
      // Check if ANY generator has reached the count
      for (const generatorId of Object.keys(state.generators)) {
        if ((state.generators[generatorId] ?? 0) >= requirement.count) {
          return true;
        }
      }
      return false;
    }

    case 'allGeneratorsOwned': {
      // Check if ALL generators have at least the required count
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

    // Prestige requirements
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

    // Crafting requirements
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
      // Check if any cheese in inventory or collection history has reached this quality
      const hasHighQuality = state.crafting.cheeseInventory.some(
        (cheese) => cheese.quality >= requirement.quality
      );
      return hasHighQuality;
    }

    case 'cheese_inventory_size':
      return state.crafting.cheeseInventory.length >= requirement.count;

    case 'legendary_cheese_crafted': {
      // Check if any legendary cheese has been crafted
      const legendaryRecipes = CHEESE_RECIPES.filter((r) => r.category === 'legendary');
      return legendaryRecipes.some((recipe) => state.crafting.cheeseCollection[recipe.id] > 0);
    }

    default:
      return false;
  }
}

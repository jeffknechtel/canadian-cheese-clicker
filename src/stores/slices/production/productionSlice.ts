import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { ProductionSlice } from './types';
import { computeCps } from './cpsCalculator';
import {
  calculateGeneratorCost,
  calculateMaxAffordable,
  calculateClickMultiplier,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeClickMultiplier,
  calculateAchievementClickMultiplier,
} from '../../../systems/productionEngine';
import { upgradeRegistry } from '../../../domain';
import { UPGRADES } from '../../../data/upgrades';
import { MILESTONE_THRESHOLDS } from '../../../data/canadianDialogue';
import {
  trackGeneratorPurchase,
  trackUpgradePurchase,
} from '../../../systems/analyticsService';
import type { UpgradeRequirement } from '../../../types/game';

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

export const createProductionSlice: SliceCreator<ProductionSlice> = (set, get) => ({
  // State
  curds: new Decimal(0),
  whey: new Decimal(0),
  totalCurdsEarned: new Decimal(0),
  totalClicks: 0,
  curdPerClick: new Decimal(1),
  curdPerSecond: new Decimal(0),
  generators: {},
  upgrades: [],
  ehCount: 0,
  lastMilestone: 0,

  // Actions
  click: () => {
    const state = get();
    const baseClickValue = state.getClickValue();
    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const clickValue = baseClickValue.mul(buffMultipliers.click).mul(eventMultipliers.click);

    set({
      curds: state.curds.plus(clickValue),
      totalCurdsEarned: state.totalCurdsEarned.plus(clickValue),
      totalClicks: state.totalClicks + 1,
    });
    get().checkAchievements();
  },

  tick: (deltaMs: number) => {
    const state = get();
    const { curdPerSecond } = state;
    if (curdPerSecond.isZero()) return;

    const buffMultipliers = state.getActiveBuffMultipliers();
    const eventMultipliers = state.getEventMultipliers();
    const effectiveCps = curdPerSecond.mul(buffMultipliers.production).mul(eventMultipliers.production);

    const secondsElapsed = deltaMs / 1000;
    const curdsEarned = effectiveCps.mul(secondsElapsed);

    set({
      curds: state.curds.plus(curdsEarned),
      totalCurdsEarned: state.totalCurdsEarned.plus(curdsEarned),
    });
  },

  addCurds: (amount: Decimal) => {
    const state = get();
    set({
      curds: state.curds.plus(amount),
      totalCurdsEarned: state.totalCurdsEarned.plus(amount),
    });
  },

  buyGenerator: (id: string, count: number) => {
    const state = get();
    const cost = calculateGeneratorCost(id, state.generators[id] ?? 0, count);

    if (state.curds.lt(cost)) {
      return false;
    }

    const currentOwned = state.generators[id] ?? 0;

    set({
      curds: state.curds.minus(cost),
      generators: { ...state.generators, [id]: currentOwned + count },
    });

    set({ curdPerSecond: computeCps(get()) });

    trackGeneratorPurchase(id, count, currentOwned + count);
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

  buyUpgrade: (id: string) => {
    const state = get();
    const upgrade = upgradeRegistry.get(id);

    if (!upgrade) return false;
    if (state.upgrades.includes(id)) return false;
    if (!state.canAffordUpgrade(id)) return false;
    if (!state.isUpgradeVisible(id)) return false;

    const currency = upgrade.costCurrency === 'curds' ? state.curds : state.whey;
    if (currency.lt(upgrade.cost)) return false;

    const newUpgrades = [...state.upgrades, id];

    const upgradeClickMultiplier = calculateClickMultiplier(newUpgrades);
    const achievementClickMultiplier = calculateAchievementClickMultiplier(state.achievements);
    const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
    const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
    const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);

    set({
      curds: upgrade.costCurrency === 'curds' ? state.curds.minus(upgrade.cost) : state.curds,
      whey: upgrade.costCurrency === 'whey' ? state.whey.minus(upgrade.cost) : state.whey,
      upgrades: newUpgrades,
      curdPerClick: newCurdPerClick,
    });

    set({ curdPerSecond: computeCps(get()) });

    trackUpgradePurchase(id);
    get().checkAchievements();

    return true;
  },

  canAffordUpgrade: (id: string) => {
    const { curds, whey, upgrades } = get();
    const upgrade = upgradeRegistry.get(id);

    if (!upgrade) return false;
    if (upgrades.includes(id)) return false;

    const currency = upgrade.costCurrency === 'curds' ? curds : whey;
    return currency.gte(upgrade.cost);
  },

  isUpgradeVisible: (id: string) => {
    const { generators, upgrades } = get();
    const upgrade = upgradeRegistry.get(id);

    if (!upgrade) return false;
    if (upgrades.includes(id)) return false;

    if (upgrade.requirement) {
      return checkRequirement(upgrade.requirement, generators);
    }

    return true;
  },

  isUpgradePurchased: (id: string) => {
    return get().upgrades.includes(id);
  },

  getAvailableUpgrades: () => {
    const state = get();
    return UPGRADES.filter((upgrade) => {
      if (state.upgrades.includes(upgrade.id)) return false;
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

  incrementEh: () => {
    set((state) => ({ ehCount: state.ehCount + 1 }));
  },

  getEhMultiplier: () => {
    const { ehCount } = get();
    return 1 + Math.floor(ehCount / 100) * 0.01;
  },

  checkMilestone: () => {
    const { totalCurdsEarned, lastMilestone } = get();

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (threshold > lastMilestone && totalCurdsEarned.gte(threshold)) {
        set({ lastMilestone: threshold });
        return threshold;
      }
    }
    return null;
  },

  setLastMilestone: (milestone: number) => {
    set({ lastMilestone: milestone });
  },

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
    const heroMultiplier = calculateHeroCpsMultiplier(heroes, party);
    const formationMultiplier = calculateFormationMultiplier(party, heroes);
    const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
    return upgradeMultiplier * achievementMultiplier * heroMultiplier * formationMultiplier * prestigeMultiplier;
  },

  recalculateCps: () => {
    set({ curdPerSecond: computeCps(get()) });
  },
});

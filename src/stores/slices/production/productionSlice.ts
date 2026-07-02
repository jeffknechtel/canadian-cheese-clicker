import Decimal from 'decimal.js';
import type { SliceCreator } from '../../types';
import type { ProductionSlice } from './types';
import { computeCps, computeClickValue } from './cpsCalculator';
import { createPrestigeProductionState } from './resetFactory';
import { publish } from '../../../domain/events';
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
import { GENERATORS } from '../../../data/generators';
import { MILESTONE_THRESHOLDS } from '../../../data/canadianDialogue';
import {
  trackGeneratorPurchase,
  trackUpgradePurchase,
} from '../../../systems/analyticsService';
import { EH_DIVISOR, EH_BONUS_PER_TIER, UNLOCK_THRESHOLDS, CLICK_CRIT_BASE_CHANCE, CLICK_CRIT_BASE_MULTIPLIER, BUY_MILESTONES } from '../../../data/constants';
import { playCriticalSound, playBuyMilestoneSound } from '../../../systems/audioSystem';
import { vibrateCrit, vibrateSuccess } from '../../../systems/haptics';
import { emitParticles } from '../../../systems/particleSystem';
import { announce } from '../../../systems/accessibilityAnnouncer';
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
  currencyAnimationTrigger: 0,
  lastClickWasCrit: false,

  // Actions
  click: () => {
    const state = get();
    const baseClickValue = state.getClickValue();
    const buffMultipliers = state.getActiveBuffMultipliers();
    // Event multipliers already baked into curdPerClick via computeClickValue
    let clickValue = baseClickValue.mul(buffMultipliers.click);

    // Roll for critical hit
    const isCrit = Math.random() < CLICK_CRIT_BASE_CHANCE;
    if (isCrit) {
      clickValue = clickValue.mul(CLICK_CRIT_BASE_MULTIPLIER);
      playCriticalSound();
      vibrateCrit();
    }

    set({
      curds: state.curds.plus(clickValue),
      totalCurdsEarned: state.totalCurdsEarned.plus(clickValue),
      totalClicks: state.totalClicks + 1,
      currencyAnimationTrigger: state.currencyAnimationTrigger + 1,
      lastClickWasCrit: isCrit,
    });
    get().incrementChallengeProgress('collectClicks', 1);
    get().checkAchievements();
  },

  tick: (deltaMs: number) => {
    const state = get();
    const { curdPerSecond } = state;
    if (curdPerSecond.isZero()) return;

    const buffMultipliers = state.getActiveBuffMultipliers();
    // Event multipliers already baked into curdPerSecond via computeCps
    const effectiveCps = curdPerSecond.mul(buffMultipliers.production);

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
    const cost = calculateGeneratorCost(id, state.generators[id] ?? 0, count, state.prestige);

    if (state.curds.lt(cost)) {
      return false;
    }

    const currentOwned = state.generators[id] ?? 0;
    const newOwned = currentOwned + count;

    // Check if we crossed a buy milestone
    const crossedMilestone = BUY_MILESTONES.find(
      (m) => currentOwned < m && newOwned >= m
    );

    set({
      curds: state.curds.minus(cost),
      generators: { ...state.generators, [id]: newOwned },
      currencyAnimationTrigger: state.currencyAnimationTrigger + 1,
    });

    publish({ type: 'CpsInputsChanged' });

    // Celebrate milestone
    if (crossedMilestone) {
      const generator = GENERATORS.find((g) => g.id === id);
      playBuyMilestoneSound(crossedMilestone);
      vibrateSuccess();
      emitParticles(window.innerWidth / 2, window.innerHeight / 3, 'fireworks');
      announce(`${generator?.name ?? 'Generator'} milestone: ${crossedMilestone}!`, 'polite');
    }

    trackGeneratorPurchase(id, count, newOwned);
    get().checkAchievements();

    return true;
  },

  getGeneratorCost: (id: string, count: number) => {
    const { generators, prestige } = get();
    return calculateGeneratorCost(id, generators[id] ?? 0, count, prestige);
  },

  canAffordGenerator: (id: string, count: number) => {
    const { curds, generators, prestige } = get();
    const cost = calculateGeneratorCost(id, generators[id] ?? 0, count, prestige);
    return curds.gte(cost);
  },

  getMaxAffordable: (id: string) => {
    const { curds, generators, prestige } = get();
    return calculateMaxAffordable(id, generators[id] ?? 0, curds, prestige);
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

    set({
      curds: upgrade.costCurrency === 'curds' ? state.curds.minus(upgrade.cost) : state.curds,
      whey: upgrade.costCurrency === 'whey' ? state.whey.minus(upgrade.cost) : state.whey,
      upgrades: newUpgrades,
      currencyAnimationTrigger: state.currencyAnimationTrigger + 1,
    });

    publish({ type: 'CpsInputsChanged' });

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
    const oldEhCount = get().ehCount;
    const newEhCount = oldEhCount + 1;
    set({ ehCount: newEhCount });

    // Recalculate CPS when crossing an Eh tier boundary (when multiplier changes)
    if (Math.floor(newEhCount / EH_DIVISOR) > Math.floor(oldEhCount / EH_DIVISOR)) {
      publish({ type: 'CpsInputsChanged' });
    }
  },

  getEhMultiplier: () => {
    const state = get();
    const synergyBonus = state.getSynergyEhBonus();
    const baseBonus = EH_BONUS_PER_TIER + synergyBonus;
    const ehTier = Math.floor(state.ehCount / EH_DIVISOR);
    return 1 + ehTier * baseBonus;
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

  recalculateClickValue: () => {
    set({ curdPerClick: computeClickValue(get()) });
  },

  getPrestigeProductionReset: () => {
    return createPrestigeProductionState(get().prestige);
  },

  getVisibleGenerators: () => {
    const state = get();
    const curds = state.curds;

    // Find the highest generator the player can afford
    let highestAffordableIndex = -1;
    for (let i = 0; i < GENERATORS.length; i++) {
      if (curds.gte(GENERATORS[i].baseCost)) {
        highestAffordableIndex = i;
      }
    }

    // Show up to N generators ahead
    const revealUpTo = Math.min(
      highestAffordableIndex + UNLOCK_THRESHOLDS.generatorRevealAhead + 1,
      GENERATORS.length
    );

    // Always show at least the first 3 generators
    const minVisible = 3;

    return GENERATORS.slice(0, Math.max(revealUpTo, minVisible));
  },
});

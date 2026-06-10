import type { SliceCreator } from '../../types';
import type { PrestigeSlice } from './types';
import { publish } from '../../../domain/events';
import {
  calculatePotentialRennet,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeClickMultiplier,
  calculatePrestigeCostReduction,
  calculatePrestigeXpMultiplier,
  calculatePrestigeCombatMultiplier,
} from '../../../systems/productionEngine';
import {
  getAgingUpgradeById,
  getAgingUpgradePurchaseCount as getAgingUpgradePurchaseCountHelper,
  canPurchaseAgingUpgrade as canPurchaseAgingUpgradeHelper,
} from '../../../data/agingUpgrades';
import { trackPrestige } from '../../../systems/analyticsService';

export const createPrestigeSlice: SliceCreator<PrestigeSlice> = (set, get) => ({
  // State
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

  // Actions
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

    // Get reset states FROM OTHER SLICES (not hardcoded here)
    const productionReset = state.getPrestigeProductionReset();
    const combatReset = state.getPrestigeCombatReset();
    const craftingReset = state.getPrestigeCraftingReset('aging');

    set({
      // Production reset - DELEGATED to production slice
      ...productionReset,

      // Combat reset - DELEGATED to combat slice
      combat: combatReset,

      // Crafting reset - DELEGATED to crafting slice
      crafting: craftingReset,

      // Prestige update
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet + rennetGained,
        totalRennet: state.prestige.totalRennet + rennetGained,
        agingResetCount: state.prestige.agingResetCount + 1,
      },

      lastSaved: Date.now(),
    });

    publish({ type: 'CpsInputsChanged' });
    trackPrestige('aging', rennetGained);

    return { rennetGained, newTotal: get().prestige.rennet };
  },

  purchaseAgingUpgrade: (upgradeId: string) => {
    const state = get();
    const upgrade = getAgingUpgradeById(upgradeId);

    if (!upgrade) return false;
    if (!state.canPurchaseAgingUpgrade(upgradeId)) return false;

    set({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet - upgrade.cost,
        agingUpgrades: [...state.prestige.agingUpgrades, upgradeId],
      },
    });

    publish({ type: 'CpsInputsChanged' });

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

    set({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet % 100,
        vintageWheels: state.prestige.vintageWheels + wheelsGained,
        totalVintageWheels: state.prestige.totalVintageWheels + wheelsGained,
        vintageResetCount: state.prestige.vintageResetCount + 1,
        agingUpgrades: [],
      },
    });

    return {
      wheelsGained,
      newTotal: get().prestige.vintageWheels,
    };
  },

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

    set({
      prestige: {
        ...state.prestige,
        vintageWheels: 0,
        legacy: state.prestige.legacy + legacyGained,
        legacyResetCount: state.prestige.legacyResetCount + 1,
        vintageUnlocks: [],
      },
    });

    return { legacyGained };
  },

  spendRennet: (amount: number) => {
    const state = get();
    if (state.prestige.rennet < amount) return false;

    set({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet - amount,
      },
    });
    return true;
  },
});

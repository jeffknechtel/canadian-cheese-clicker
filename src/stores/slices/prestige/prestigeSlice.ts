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
  calculateHeroRetentionCount,
} from '../../../systems/productionEngine';
import type { Province } from '../../../types/game';
import {
  getAgingUpgradeById,
  getAgingUpgradePurchaseCount as getAgingUpgradePurchaseCountHelper,
  canPurchaseAgingUpgrade as canPurchaseAgingUpgradeHelper,
} from '../../../data/agingUpgrades';
import { trackPrestige } from '../../../systems/analyticsService';
import {
  VINTAGE_AGING_RESETS_REQUIRED,
  VINTAGE_RENNET_COST,
  LEGACY_VINTAGE_RESETS_REQUIRED,
  LEGACY_WHEELS_REQUIRED,
} from '../../../data/constants';

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
    // Loyal Companions: keep the N highest-level heroes through Aging only
    const heroReset = state.getPrestigeHeroReset(calculateHeroRetentionCount(state.prestige));

    set({
      // Production reset - DELEGATED to production slice
      ...productionReset,

      // Combat reset - DELEGATED to combat slice (includes zoneProgress)
      ...combatReset,

      // Hero reset - DELEGATED to hero slice
      ...heroReset,

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

    // Reset golden cheese timer (but preserve totalCollected)
    get().resetGoldenCheeseOnPrestige();

    publish({ type: 'CpsInputsChanged' });
    publish({ type: 'PrestigePerformed', tier: 'aging', currencyGained: rennetGained });
    trackPrestige('aging', rennetGained);
    get().incrementChallengeProgress('prestigeReset', 1);

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
    return prestige.agingResetCount >= VINTAGE_AGING_RESETS_REQUIRED && prestige.rennet >= VINTAGE_RENNET_COST;
  },

  performVintage: () => {
    const state = get();
    if (!state.canPerformVintage()) {
      return { wheelsGained: 0, newTotal: state.prestige.vintageWheels };
    }

    const wheelsGained = Math.floor(state.prestige.rennet / VINTAGE_RENNET_COST);

    // Get reset states FROM OTHER SLICES (same pattern as performAging)
    const productionReset = state.getPrestigeProductionReset();
    const combatReset = state.getPrestigeCombatReset();
    const craftingReset = state.getPrestigeCraftingReset('vintage');
    const heroReset = state.getPrestigeHeroReset(0); // Vintage wipes all heroes

    set({
      // Production reset - DELEGATED to production slice
      ...productionReset,

      // Combat reset - DELEGATED to combat slice (includes zoneProgress)
      ...combatReset,

      // Hero reset - DELEGATED to hero slice
      ...heroReset,

      // Crafting reset - DELEGATED to crafting slice
      crafting: craftingReset,

      // Prestige update - also reset aging upgrades and aging reset count
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet % VINTAGE_RENNET_COST,
        vintageWheels: state.prestige.vintageWheels + wheelsGained,
        totalVintageWheels: state.prestige.totalVintageWheels + wheelsGained,
        vintageResetCount: state.prestige.vintageResetCount + 1,
        agingUpgrades: [],
        agingResetCount: 0, // Reset aging count for vintage tier
      },

      lastSaved: Date.now(),
    });

    // Reset golden cheese timer (but preserve totalCollected)
    get().resetGoldenCheeseOnPrestige();

    publish({ type: 'CpsInputsChanged' });
    publish({ type: 'PrestigePerformed', tier: 'vintage', currencyGained: wheelsGained });
    trackPrestige('vintage', wheelsGained);
    get().incrementChallengeProgress('prestigeReset', 1);

    return {
      wheelsGained,
      newTotal: get().prestige.vintageWheels,
    };
  },

  canPerformLegacy: () => {
    const { prestige } = get();
    return (
      prestige.vintageResetCount >= LEGACY_VINTAGE_RESETS_REQUIRED &&
      prestige.vintageWheels >= LEGACY_WHEELS_REQUIRED
    );
  },

  performLegacy: (province: Province) => {
    const state = get();
    if (!state.canPerformLegacy()) {
      return { legacyGained: 0 };
    }

    const legacyGained = state.prestige.vintageWheels;

    // Get reset states FROM OTHER SLICES (same pattern as performAging)
    const productionReset = state.getPrestigeProductionReset();
    const combatReset = state.getPrestigeCombatReset();
    const craftingReset = state.getPrestigeCraftingReset('legacy');
    const heroReset = state.getPrestigeHeroReset(0); // Legacy wipes all heroes

    set({
      // Production reset - DELEGATED to production slice
      ...productionReset,

      // Combat reset - DELEGATED to combat slice (includes zoneProgress)
      ...combatReset,

      // Hero reset - DELEGATED to hero slice
      ...heroReset,

      // Crafting reset - DELEGATED to crafting slice
      crafting: craftingReset,

      // Prestige update - reset vintage and aging state
      prestige: {
        ...state.prestige,
        vintageWheels: 0,
        legacy: state.prestige.legacy + legacyGained,
        // Province allocation: the production engine reads this map directly
        legacyBonuses: {
          ...state.prestige.legacyBonuses,
          [province]: state.prestige.legacyBonuses[province] + legacyGained,
        },
        legacyResetCount: state.prestige.legacyResetCount + 1,
        vintageResetCount: 0, // Reset vintage count for legacy tier
        agingUpgrades: [],
        agingResetCount: 0,
        rennet: 0, // Reset rennet too
      },

      lastSaved: Date.now(),
    });

    // Reset golden cheese timer (but preserve totalCollected)
    get().resetGoldenCheeseOnPrestige();

    publish({ type: 'CpsInputsChanged' });
    publish({ type: 'PrestigePerformed', tier: 'legacy', currencyGained: legacyGained });
    trackPrestige('legacy', legacyGained);
    get().incrementChallengeProgress('prestigeReset', 1);

    return { legacyGained };
  },

  spendRennet: (amount: number) => {
    let success = false;
    set((s) => {
      if (s.prestige.rennet < amount) {
        return s;
      }
      success = true;
      return {
        prestige: {
          ...s.prestige,
          rennet: s.prestige.rennet - amount,
        },
      };
    });

    // Rennet affects CPS via held-rennet bonus
    if (success) {
      publish({ type: 'CpsInputsChanged' });
    }

    return success;
  },

  grantRennet: (amount: number) => {
    set((s) => ({
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet + amount,
        totalRennet: s.prestige.totalRennet + amount,
      },
    }));
    publish({ type: 'CpsInputsChanged' });
  },
});

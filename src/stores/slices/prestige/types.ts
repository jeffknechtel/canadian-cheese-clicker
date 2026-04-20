import type { PrestigeState } from '../../../types/game';

export interface PrestigeSliceState {
  prestige: PrestigeState;
}

export interface PrestigeSliceActions {
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
  canPerformVintage: () => boolean;
  performVintage: () => { wheelsGained: number; newTotal: number };
  canPerformLegacy: () => boolean;
  performLegacy: () => { legacyGained: number };
}

export type PrestigeSlice = PrestigeSliceState & PrestigeSliceActions;

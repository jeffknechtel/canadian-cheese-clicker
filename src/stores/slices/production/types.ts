import type Decimal from 'decimal.js';
import type { Upgrade, Generator } from '../../../types/game';
import type { ProductionResetState } from './resetFactory';

export interface ProductionState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  generators: Record<string, number>;
  upgrades: string[];
  ehCount: number;
  lastMilestone: number;
  currencyAnimationTrigger: number;
}

export interface ProductionActions {
  click: () => void;
  tick: (deltaMs: number) => void;
  addCurds: (amount: Decimal) => void;
  buyGenerator: (id: string, count: number) => boolean;
  getGeneratorCost: (id: string, count: number) => Decimal;
  canAffordGenerator: (id: string, count: number) => boolean;
  getMaxAffordable: (id: string) => number;
  getGeneratorCount: (id: string) => number;
  buyUpgrade: (id: string) => boolean;
  canAffordUpgrade: (id: string) => boolean;
  isUpgradeVisible: (id: string) => boolean;
  isUpgradePurchased: (id: string) => boolean;
  getAvailableUpgrades: () => Upgrade[];
  getPurchasedUpgrades: () => Upgrade[];
  incrementEh: () => void;
  getEhMultiplier: () => number;
  checkMilestone: () => number | null;
  setLastMilestone: (milestone: number) => void;
  getClickValue: () => Decimal;
  getClickMultiplier: () => number;
  getGeneratorMultiplier: (id: string) => number;
  getGlobalMultiplier: () => number;
  recalculateCps: () => void;
  recalculateClickValue: () => void;
  getPrestigeProductionReset: () => ProductionResetState;
  getVisibleGenerators: () => Generator[];
}

export type ProductionSlice = ProductionState & ProductionActions;

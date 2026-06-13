import Decimal from 'decimal.js';
import type { PrestigeState } from '../../../types/game';
import {
  calculateStartingCurds,
  calculateStartingGenerators,
} from '../../../systems/productionEngine';

export interface ProductionResetState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  currencyAnimationTrigger: number;
  lastClickWasCrit: boolean;
}

export function createInitialProductionState(): ProductionResetState {
  return {
    curds: new Decimal(0),
    whey: new Decimal(0),
    totalCurdsEarned: new Decimal(0),
    totalClicks: 0,
    generators: {},
    upgrades: [],
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),
    currencyAnimationTrigger: 0,
    lastClickWasCrit: false,
  };
}

export function createPrestigeProductionState(
  prestige: PrestigeState
): ProductionResetState {
  return {
    curds: calculateStartingCurds(prestige),
    whey: new Decimal(0),
    totalCurdsEarned: new Decimal(0),
    totalClicks: 0,
    generators: calculateStartingGenerators(prestige),
    upgrades: [],
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),
    currencyAnimationTrigger: 0,
    lastClickWasCrit: false,
  };
}

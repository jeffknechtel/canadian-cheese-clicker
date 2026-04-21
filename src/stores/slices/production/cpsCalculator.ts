import Decimal from 'decimal.js';
import {
  calculateCps,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
} from '../../../systems/productionEngine';
import type { GameStore } from '../../types';

/**
 * Single source of truth for CPS calculation.
 * Replaces 10+ copy-pasted blocks throughout the store.
 * NOW WIRES IN the Eh multiplier (fixes the bug where getEhMultiplier() was calculated but never used).
 */
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
  const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();

  const totalGlobalMultiplier =
    upgradeGlobalMultiplier *
    achievementGlobalMultiplier *
    heroMultiplier *
    formationMultiplier *
    prestigeMultiplier *
    ehMultiplier;

  return calculateCps(state.generators, generatorMultipliers, totalGlobalMultiplier);
}

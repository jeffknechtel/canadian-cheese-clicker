import Decimal from 'decimal.js';
import {
  calculateCps,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsBonus,
  calculateFormationBonus,
  calculatePrestigeProductionMultiplier,
} from '../../../systems/productionEngine';
import type { GameStore } from '../../types';

/**
 * Single source of truth for CPS calculation.
 * Replaces 10+ copy-pasted blocks throughout the store.
 * NOW WIRES IN the Eh bonus (fixes the bug where getEhBonus() was calculated but never used).
 */
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroBonus = calculateHeroCpsBonus(state.heroes, state.party);
  const formationBonus = calculateFormationBonus(state.party, state.heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehBonus = state.getEhBonus();

  const totalGlobalMultiplier =
    upgradeGlobalMultiplier *
    achievementGlobalMultiplier *
    heroBonus *
    formationBonus *
    prestigeMultiplier *
    ehBonus;

  return calculateCps(state.generators, generatorMultipliers, totalGlobalMultiplier);
}

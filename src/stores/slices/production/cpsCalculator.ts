import Decimal from 'decimal.js';
import {
  calculateCps,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
  calculatePrestigeGeneratorEfficiency,
  calculateClickMultiplier,
  calculateAchievementClickMultiplier,
  calculatePrestigeClickMultiplier,
} from '../../../systems/productionEngine';
import type { GameStore } from '../../types';

/**
 * Single source of truth for CPS calculation.
 * Replaces 10+ copy-pasted blocks throughout the store.
 * Includes: Eh multiplier, event multipliers, prestige, heroes, achievements.
 */
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);

  const synergyZoneMultipliers = state.getSynergyZoneGeneratorMultipliers();
  for (const [generatorId, multiplier] of Object.entries(synergyZoneMultipliers)) {
    generatorMultipliers[generatorId] = (generatorMultipliers[generatorId] ?? 1) * multiplier;
  }

  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
  const synergyFormationBonus = state.getSynergyFormationBonus();
  const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, synergyFormationBonus);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();

  // Generator efficiency: bonus % per generator owned
  const efficiencyPerGenerator = calculatePrestigeGeneratorEfficiency(state.prestige);
  const totalGenerators = Object.values(state.generators).reduce((sum, count) => sum + count, 0);
  const efficiencyMultiplier = 1 + efficiencyPerGenerator * totalGenerators;

  const totalGlobalMultiplier =
    upgradeGlobalMultiplier *
    achievementGlobalMultiplier *
    heroMultiplier *
    formationMultiplier *
    prestigeMultiplier *
    ehMultiplier *
    efficiencyMultiplier *
    eventMultipliers.production;

  return calculateCps(state.generators, generatorMultipliers, totalGlobalMultiplier);
}

/**
 * Single source of truth for click value calculation.
 * Replaces 3 copy-pasted blocks in productionSlice, achievementSlice, and saveSystem.
 * Includes: Eh multiplier, event multipliers, prestige, achievements.
 */
export function computeClickValue(state: GameStore): Decimal {
  const upgradeClickMultiplier = calculateClickMultiplier(state.upgrades);
  const achievementClickMultiplier = calculateAchievementClickMultiplier(state.achievements);
  const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();
  const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier * ehMultiplier * eventMultipliers.click;
  return new Decimal(1).mul(totalClickMultiplier);
}

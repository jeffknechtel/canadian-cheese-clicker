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
  calculateClickCpsPercent,
} from '../../../systems/productionEngine';
import { BUY_MILESTONES, MILESTONE_MULTIPLIER } from '../../../data/constants';
import type { GameStore } from '../../types';

/**
 * Count milestones reached for a given generator count.
 */
function countMilestonesReached(owned: number): number {
  return BUY_MILESTONES.filter((m) => owned >= m).length;
}

/**
 * Calculate milestone multiplier for a generator (MILESTONE_MULTIPLIER^milestonesReached).
 */
function calculateMilestoneMultiplier(owned: number): number {
  const milestones = countMilestonesReached(owned);
  return Math.pow(MILESTONE_MULTIPLIER, milestones);
}

/**
 * Single source of truth for CPS calculation.
 * Replaces 10+ copy-pasted blocks throughout the store.
 * Includes: Eh multiplier, event multipliers, prestige, heroes, achievements.
 */
export function computeCps(state: GameStore): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(state.upgrades);

  // Apply milestone multipliers per generator
  for (const [generatorId, owned] of Object.entries(state.generators)) {
    const milestoneMultiplier = calculateMilestoneMultiplier(owned);
    generatorMultipliers[generatorId] = (generatorMultipliers[generatorId] ?? 1) * milestoneMultiplier;
  }

  const synergyZoneMultipliers = state.getSynergyZoneGeneratorMultipliers();
  for (const [generatorId, multiplier] of Object.entries(synergyZoneMultipliers)) {
    generatorMultipliers[generatorId] = (generatorMultipliers[generatorId] ?? 1) * multiplier;
  }

  const upgradeGlobalMultiplier = calculateGlobalMultiplier(state.upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(state.achievements);
  // Include cheeseAffinity bonus from active cheese buffs
  const heroBuffTotals = state.getActiveHeroBuffTotals();
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party, heroBuffTotals.cheeseAffinity ?? 0);
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
 * Includes: Eh multiplier, event multipliers, prestige, achievements, CPS percent.
 * CPS component is added AFTER the multiplier product (Cookie Clicker convention).
 */
export function computeClickValue(state: GameStore): Decimal {
  const upgradeClickMultiplier = calculateClickMultiplier(state.upgrades);
  const achievementClickMultiplier = calculateAchievementClickMultiplier(state.achievements);
  const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();
  const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier * ehMultiplier * eventMultipliers.click;

  // CPS percent: fraction of CPS added to each click (additive, not multiplied)
  const cpsPercent = calculateClickCpsPercent(state.upgrades);

  return new Decimal(1)
    .mul(totalClickMultiplier)
    .plus(state.curdPerSecond.mul(cpsPercent));
}

import Decimal from 'decimal.js';
import { generatorRegistry, upgradeRegistry, heroRegistry } from '../domain';
import { getAchievementById } from '../data/achievements';
import { getAgingUpgradeById } from '../data/agingUpgrades';
import {
  FORMATION_TANK_FRONT_BONUS,
  FORMATION_HEALER_BACK_BONUS,
  FORMATION_FULL_PARTY_BONUS,
  RENNET_PRODUCTION_MULTIPLIER,
  VINTAGE_WHEEL_MULTIPLIER,
  LEGACY_POINT_MULTIPLIER,
  MAX_PRESTIGE_COST_REDUCTION,
  CHEESE_AFFINITY_DIVISOR,
} from '../data/constants';
import type { HeroState, HeroStats, PartyFormation, PrestigeState } from '../types/game';

/**
 * Calculate total curds per second from all owned generators
 */
export function calculateCps(
  ownedGenerators: Record<string, number>,
  generatorMultipliers: Record<string, number> = {},
  globalMultiplier: number = 1
): Decimal {
  let totalCps = new Decimal(0);

  for (const generator of generatorRegistry.getAll()) {
    const owned = ownedGenerators[generator.id] ?? 0;
    if (owned > 0) {
      const multiplier = generatorMultipliers[generator.id] ?? 1;
      totalCps = totalCps.plus(generator.getCps(owned, multiplier));
    }
  }

  return totalCps.mul(globalMultiplier);
}

/**
 * Calculate the cost to buy N generators, accounting for scaling
 * Cost formula: baseCost * costMultiplier^owned * (costMultiplier^count - 1) / (costMultiplier - 1)
 */
export function calculateGeneratorCost(
  generatorId: string,
  owned: number,
  count: number
): Decimal {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return new Decimal(Infinity);
  return generator.getCost(owned, count);
}

/**
 * Calculate maximum generators that can be bought with given curds
 */
export function calculateMaxAffordable(
  generatorId: string,
  owned: number,
  curds: Decimal
): number {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return 0;
  return generator.getMaxAffordable(owned, curds);
}

/**
 * Calculate total click multiplier from all purchased upgrades
 */
export function calculateClickMultiplier(purchasedUpgradeIds: string[]): number {
  let multiplier = 1;

  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'clickMultiplier') {
      multiplier *= upgrade.getMultiplierValue();
    }
  }

  return multiplier;
}

/**
 * Calculate multipliers for each generator from purchased upgrades
 * Returns a map of generatorId -> multiplier
 */
export function calculateGeneratorMultipliers(
  purchasedUpgradeIds: string[]
): Record<string, number> {
  const multipliers: Record<string, number> = {};

  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'generatorMultiplier') {
      const { generatorId, value } = upgrade.effect;
      multipliers[generatorId] = (multipliers[generatorId] ?? 1) * value;
    }
  }

  return multipliers;
}

/**
 * Calculate global production multiplier from purchased upgrades
 */
export function calculateGlobalMultiplier(purchasedUpgradeIds: string[]): number {
  let multiplier = 1;

  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'globalMultiplier') {
      multiplier *= upgrade.getMultiplierValue();
    }
  }

  return multiplier;
}

/**
 * Calculate global production multiplier from unlocked achievements
 */
export function calculateAchievementGlobalMultiplier(
  unlockedAchievementIds: string[]
): number {
  let multiplier = 1;

  for (const achievementId of unlockedAchievementIds) {
    const achievement = getAchievementById(achievementId);
    if (achievement?.reward?.type === 'globalMultiplier') {
      multiplier *= achievement.reward.value;
    }
  }

  return multiplier;
}

/**
 * Calculate click multiplier from unlocked achievements
 */
export function calculateAchievementClickMultiplier(
  unlockedAchievementIds: string[]
): number {
  let multiplier = 1;

  for (const achievementId of unlockedAchievementIds) {
    const achievement = getAchievementById(achievementId);
    if (achievement?.reward?.type === 'clickMultiplier') {
      multiplier *= achievement.reward.value;
    }
  }

  return multiplier;
}

// ===== Hero System Calculations =====

/**
 * Calculate effective stats for a hero (base + growth + equipment)
 */
export function calculateHeroStats(
  heroId: string,
  heroState: HeroState
): HeroStats {
  const hero = heroRegistry.get(heroId);
  if (!hero) {
    return { hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 };
  }
  return hero.getFullStats(heroState);
}

/**
 * Calculate total CPS multiplier from all party heroes
 * Returns a multiplier where 1.0 = no bonus
 */
export function calculateHeroCpsMultiplier(
  heroes: Record<string, HeroState>,
  party: PartyFormation
): number {
  // Get all party member IDs
  const partyMemberIds = [
    party.frontLeft,
    party.frontRight,
    party.backLeft,
    party.backRight,
  ].filter((id): id is string => id !== null);

  if (partyMemberIds.length === 0) {
    return 1; // No bonus with empty party
  }

  // Sum cheese affinity of all party members
  let totalAffinity = 0;
  for (const heroId of partyMemberIds) {
    const heroState = heroes[heroId];
    if (heroState) {
      const stats = calculateHeroStats(heroId, heroState);
      totalAffinity += stats.cheeseAffinity;
    }
  }

  // Convert affinity to multiplier: every 100 affinity = +10% CPS
  // Formula: 1 + (totalAffinity / CHEESE_AFFINITY_DIVISOR)
  // This means 100 affinity = 1.1x, 500 affinity = 1.5x, etc.
  return 1 + totalAffinity / CHEESE_AFFINITY_DIVISOR;
}

/**
 * Calculate formation multiplier based on party composition
 * Returns a multiplier where 1.0 = no bonus
 *
 * Bonuses:
 * - Tank in front row: +5%
 * - Healer in back row: +5%
 * - Full party (4 heroes): +10%
 * Maximum possible bonus: +20%
 */
export function calculateFormationMultiplier(
  party: PartyFormation,
  heroes: Record<string, HeroState>
): number {
  let bonus = 0;

  // Check for tank in front row
  const frontHeroes = [party.frontLeft, party.frontRight].filter(
    (id): id is string => id !== null
  );
  for (const heroId of frontHeroes) {
    const hero = heroRegistry.get(heroId);
    if (hero?.class === 'tank') {
      bonus += FORMATION_TANK_FRONT_BONUS;
      break; // Only count once
    }
  }

  // Check for healer in back row
  const backHeroes = [party.backLeft, party.backRight].filter(
    (id): id is string => id !== null
  );
  for (const heroId of backHeroes) {
    const hero = heroRegistry.get(heroId);
    if (hero?.class === 'healer') {
      bonus += FORMATION_HEALER_BACK_BONUS;
      break; // Only count once
    }
  }

  // Check for full party
  const partySize = [...frontHeroes, ...backHeroes].length;
  if (partySize === 4) {
    bonus += FORMATION_FULL_PARTY_BONUS;
  }

  // Verify heroes exist in heroes record (prevent phantom bonuses)
  const validPartyMembers = [
    party.frontLeft,
    party.frontRight,
    party.backLeft,
    party.backRight,
  ].filter((id): id is string => id !== null && heroes[id] !== undefined);

  // Only return bonus if we have valid party members
  if (validPartyMembers.length === 0) {
    return 1;
  }

  return 1 + bonus;
}

/**
 * Calculate XP gain rate per second for heroes
 * XP scales with CPS: base rate of 0.1 XP/s, plus 1 XP per 1000 CPS
 */
export function calculateXpPerSecond(curdPerSecond: Decimal): number {
  // Minimum XP gain of 0.1 per second
  // Additional 1 XP per 1000 CPS
  return Math.max(0.1, curdPerSecond.div(1000).toNumber());
}

// ===== Prestige System Calculations =====

/**
 * Calculate Rennet earned from current run
 * Formula: floor(sqrt(totalCurdsEarned / 1e12))
 * Requires at least 1 trillion curds for any Rennet
 */
export function calculatePotentialRennet(totalCurdsEarned: Decimal): number {
  const threshold = new Decimal(1e12);
  if (totalCurdsEarned.lt(threshold)) return 0;

  const ratio = totalCurdsEarned.div(threshold);
  // Use Decimal.sqrt() and floor() for arbitrary precision
  return Decimal.sqrt(ratio).floor().toNumber();
}

/**
 * Calculate base Rennet multiplier (+1% per Rennet)
 */
export function calculateRennetMultiplier(rennet: number): number {
  return 1 + rennet * RENNET_PRODUCTION_MULTIPLIER;
}

/**
 * Calculate total prestige production multiplier
 * Combines Rennet bonus, Aging upgrades, Vintage Wheels, and Legacy bonuses
 */
export function calculatePrestigeProductionMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  // Base Rennet bonus: +1% per Rennet
  multiplier *= calculateRennetMultiplier(prestige.rennet);

  // Aging upgrade bonuses
  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'productionBonus') {
      multiplier *= 1 + upgrade.effect.value;
    }
  }

  // Vintage Wheels bonus (future): +5% per wheel
  multiplier *= 1 + prestige.vintageWheels * VINTAGE_WHEEL_MULTIPLIER;

  // Legacy bonus (future): sum of province bonuses
  const legacyBonus = Object.values(prestige.legacyBonuses).reduce((a, b) => a + b, 0);
  multiplier *= 1 + legacyBonus * LEGACY_POINT_MULTIPLIER;

  return multiplier;
}

/**
 * Calculate prestige click multiplier from Aging upgrades
 */
export function calculatePrestigeClickMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'clickBonus') {
      multiplier *= 1 + upgrade.effect.value;
    }
  }

  return multiplier;
}

/**
 * Calculate generator cost reduction from prestige upgrades
 * Returns reduction as a decimal (e.g., 0.2 for 20% reduction)
 * Capped at 90% reduction
 */
export function calculatePrestigeCostReduction(prestige: PrestigeState): number {
  let reduction = 0;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'generatorCostReduction') {
      reduction += upgrade.effect.value;
    }
  }

  // Cap at 90% reduction
  return Math.min(reduction, MAX_PRESTIGE_COST_REDUCTION);
}

/**
 * Calculate XP bonus from prestige upgrades
 */
export function calculatePrestigeXpMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'xpBonus') {
      multiplier *= 1 + upgrade.effect.value;
    }
  }

  return multiplier;
}

/**
 * Calculate combat reward bonus from prestige upgrades
 */
export function calculatePrestigeCombatMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'combatBonus') {
      multiplier *= 1 + upgrade.effect.value;
    }
  }

  return multiplier;
}

/**
 * Calculate starting curds after Aging reset based on upgrades
 */
export function calculateStartingCurds(prestige: PrestigeState): Decimal {
  let startingCurds = new Decimal(0);

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'startingCurds') {
      startingCurds = startingCurds.plus(upgrade.effect.value);
    }
  }

  return startingCurds;
}

/**
 * Calculate starting generators after Aging reset based on upgrades
 * Returns a map of generatorId -> count
 */
export function calculateStartingGenerators(prestige: PrestigeState): Record<string, number> {
  const starting: Record<string, number> = {};

  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = getAgingUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'startingGenerators') {
      const effect = upgrade.effect;
      starting[effect.generatorId] = (starting[effect.generatorId] || 0) + effect.value;
    }
  }

  return starting;
}

// ===== CPS Recalculation Utility =====

/**
 * Recalculate CPS from game state components.
 * Centralizes the repeated pattern of:
 * 1. Calculate generator multipliers
 * 2. Calculate global multiplier from upgrades
 * 3. Calculate achievement multiplier
 * 4. Calculate hero CPS bonus
 * 5. Calculate formation bonus
 * 6. Calculate prestige multiplier
 * 7. Combine and calculate final CPS
 */
export function recalculateCpsFromState(
  generators: Record<string, number>,
  upgrades: string[],
  achievements: string[],
  heroes: Record<string, HeroState>,
  party: PartyFormation,
  prestige: PrestigeState
): Decimal {
  const generatorMultipliers = calculateGeneratorMultipliers(upgrades);
  const upgradeGlobalMultiplier = calculateGlobalMultiplier(upgrades);
  const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(achievements);
  const heroMultiplier = calculateHeroCpsMultiplier(heroes, party);
  const formationMultiplier = calculateFormationMultiplier(party, heroes);
  const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
  const totalGlobalMultiplier =
    upgradeGlobalMultiplier * achievementGlobalMultiplier * heroMultiplier * formationMultiplier * prestigeMultiplier;

  return calculateCps(generators, generatorMultipliers, totalGlobalMultiplier);
}

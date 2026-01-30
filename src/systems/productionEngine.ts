import Decimal from 'decimal.js';
import { GENERATORS, getGeneratorById } from '../data/generators';
import { getUpgradeById } from '../data/upgrades';
import { getAchievementById } from '../data/achievements';
import { getHeroById } from '../data/heroes';
import { getEquipmentById } from '../data/equipment';
import { getAgingUpgradeById } from '../data/agingUpgrades';
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

  for (const generator of GENERATORS) {
    const owned = ownedGenerators[generator.id] ?? 0;
    if (owned > 0) {
      const multiplier = generatorMultipliers[generator.id] ?? 1;
      const generatorCps = generator.baseCps.mul(owned).mul(multiplier);
      totalCps = totalCps.plus(generatorCps);
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
  const generator = getGeneratorById(generatorId);
  if (!generator) return new Decimal(Infinity);

  const { baseCost, costMultiplier } = generator;

  // Cost of buying `count` generators when you already own `owned`
  // Sum of geometric series: baseCost * m^owned * (1 + m + m^2 + ... + m^(count-1))
  // = baseCost * m^owned * (m^count - 1) / (m - 1)
  const multiplierPowOwned = new Decimal(costMultiplier).pow(owned);
  const multiplierPowCount = new Decimal(costMultiplier).pow(count);
  const numerator = multiplierPowCount.minus(1);
  const denominator = new Decimal(costMultiplier).minus(1);

  return baseCost.mul(multiplierPowOwned).mul(numerator.div(denominator)).floor();
}

/**
 * Calculate maximum generators that can be bought with given curds
 */
export function calculateMaxAffordable(
  generatorId: string,
  owned: number,
  curds: Decimal
): number {
  const generator = getGeneratorById(generatorId);
  if (!generator) return 0;

  // Binary search for max affordable
  let low = 0;
  let high = 1000; // Reasonable upper bound

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const cost = calculateGeneratorCost(generatorId, owned, mid);
    if (curds.gte(cost)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

/**
 * Calculate total click multiplier from all purchased upgrades
 */
export function calculateClickMultiplier(purchasedUpgradeIds: string[]): number {
  let multiplier = 1;

  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = getUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'clickMultiplier') {
      multiplier *= upgrade.effect.value;
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
    const upgrade = getUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'generatorMultiplier') {
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
    const upgrade = getUpgradeById(upgradeId);
    if (upgrade && upgrade.effect.type === 'globalMultiplier') {
      multiplier *= upgrade.effect.value;
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
  const heroDef = getHeroById(heroId);
  if (!heroDef) {
    return { hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 };
  }

  // Start with base stats
  const stats: HeroStats = { ...heroDef.baseStats };

  // Add stat growth * (level - 1)
  const levelBonus = heroState.level - 1;
  stats.hp += heroDef.statGrowth.hp * levelBonus;
  stats.attack += heroDef.statGrowth.attack * levelBonus;
  stats.defense += heroDef.statGrowth.defense * levelBonus;
  stats.speed += heroDef.statGrowth.speed * levelBonus;
  stats.cheeseAffinity += heroDef.statGrowth.cheeseAffinity * levelBonus;

  // Add equipment bonuses
  for (const equipmentId of Object.values(heroState.equipment)) {
    if (equipmentId) {
      const equipment = getEquipmentById(equipmentId);
      if (equipment?.stats) {
        stats.hp += equipment.stats.hp ?? 0;
        stats.attack += equipment.stats.attack ?? 0;
        stats.defense += equipment.stats.defense ?? 0;
        stats.speed += equipment.stats.speed ?? 0;
        stats.cheeseAffinity += equipment.stats.cheeseAffinity ?? 0;
      }
    }
  }

  return stats;
}

/**
 * Calculate total CPS bonus multiplier from all party heroes
 * Returns a multiplier where 1.0 = no bonus
 */
export function calculateHeroCpsBonus(
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
  // Formula: 1 + (totalAffinity / 1000)
  // This means 100 affinity = 1.1x, 500 affinity = 1.5x, etc.
  return 1 + totalAffinity / 1000;
}

/**
 * Calculate formation bonus multiplier based on party composition
 * Returns a multiplier where 1.0 = no bonus
 *
 * Bonuses:
 * - Tank in front row: +5%
 * - Healer in back row: +5%
 * - Full party (4 heroes): +10%
 * Maximum possible bonus: +20%
 */
export function calculateFormationBonus(
  party: PartyFormation,
  heroes: Record<string, HeroState>
): number {
  let bonus = 0;

  // Check for tank in front row
  const frontHeroes = [party.frontLeft, party.frontRight].filter(
    (id): id is string => id !== null
  );
  for (const heroId of frontHeroes) {
    const heroDef = getHeroById(heroId);
    if (heroDef?.class === 'tank') {
      bonus += 0.05; // +5% for tank in front
      break; // Only count once
    }
  }

  // Check for healer in back row
  const backHeroes = [party.backLeft, party.backRight].filter(
    (id): id is string => id !== null
  );
  for (const heroId of backHeroes) {
    const heroDef = getHeroById(heroId);
    if (heroDef?.class === 'healer') {
      bonus += 0.05; // +5% for healer in back
      break; // Only count once
    }
  }

  // Check for full party
  const partySize = [...frontHeroes, ...backHeroes].length;
  if (partySize === 4) {
    bonus += 0.1; // +10% for full party
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
  return Math.floor(Math.sqrt(ratio.toNumber()));
}

/**
 * Calculate base Rennet multiplier (+1% per Rennet)
 */
export function calculateRennetMultiplier(rennet: number): number {
  return 1 + rennet * 0.01;
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
  multiplier *= 1 + prestige.vintageWheels * 0.05;

  // Legacy bonus (future): sum of province bonuses
  const legacyBonus = Object.values(prestige.legacyBonuses).reduce((a, b) => a + b, 0);
  multiplier *= 1 + legacyBonus * 0.01;

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
  return Math.min(reduction, 0.9);
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

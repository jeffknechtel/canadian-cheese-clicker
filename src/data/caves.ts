import type { AffinageCave } from '../types/game';

/**
 * Affinage Caves Data for The Great Canadian Cheese Quest
 *
 * Caves are where cheese ages to perfection.
 * Players unlock caves progressively through the prestige system.
 *
 * | Cave            | Capacity | Quality Bonus | Rennet Cost |
 * |-----------------|----------|---------------|-------------|
 * | Basic Cellar    | 5        | 0%            | 0 (start)   |
 * | Temperature Cave| 10       | +10%          | 100         |
 * | Humidity Cave   | 15       | +20%          | 500         |
 * | Alpine Cave     | 25       | +35%          | 1000 (1 VW) |
 * | Master's Vault  | 50       | +50%          | 5000 (5 VW) |
 *
 * VW = Vintage Wheels required
 */

export const CAVES: AffinageCave[] = [
  {
    id: 'basic_cellar',
    name: 'Basic Cellar',
    description: 'A humble underground room. Cool and dark, perfect for a beginner fromager.',
    capacity: 5,
    qualityBonus: 0,
    cost: 0,
    unlockRequirement: { type: 'none' },
    icon: '🏠',
  },
  {
    id: 'temperature_cave',
    name: 'Temperature-Controlled Cave',
    description: 'Modern refrigeration meets ancient tradition. Precise temperature control for consistent aging.',
    capacity: 10,
    qualityBonus: 10,
    cost: 100,
    unlockRequirement: { type: 'prestige_rennet', amount: 100 },
    icon: '🌡️',
  },
  {
    id: 'humidity_cave',
    name: 'Humidity Cave',
    description: 'Natural limestone walls maintain perfect moisture. Essential for bloomy rinds.',
    capacity: 15,
    qualityBonus: 20,
    cost: 500,
    unlockRequirement: { type: 'cave_unlocked', caveId: 'temperature_cave' },
    icon: '💧',
  },
  {
    id: 'alpine_cave',
    name: 'Alpine Cave',
    description: 'High altitude cave carved into Canadian Rockies. Thin air creates extraordinary flavor profiles.',
    capacity: 25,
    qualityBonus: 35,
    cost: 1000,
    unlockRequirement: { type: 'prestige_vintage', amount: 1 },
    icon: '🏔️',
  },
  {
    id: 'masters_vault',
    name: 'Master\'s Vault',
    description: 'The legendary cave of the Grand Fromager. Whispered to exist beneath Parliament Hill. Only the most dedicated cheese masters gain access.',
    capacity: 50,
    qualityBonus: 50,
    cost: 5000,
    unlockRequirement: { type: 'prestige_vintage', amount: 5 },
    icon: '🏛️',
  },
];

/**
 * Get a cave by its ID
 */
export function getCaveById(id: string): AffinageCave | undefined {
  return CAVES.find((c) => c.id === id);
}

/**
 * Get all caves sorted by cost (ascending)
 */
export function getCavesByCost(): AffinageCave[] {
  return [...CAVES].sort((a, b) => a.cost - b.cost);
}

/**
 * Get all caves sorted by quality bonus (descending)
 */
export function getCavesByQualityBonus(): AffinageCave[] {
  return [...CAVES].sort((a, b) => b.qualityBonus - a.qualityBonus);
}

/**
 * Get total capacity of all caves
 */
export function getTotalCaveCapacity(unlockedCaveIds: string[]): number {
  return CAVES
    .filter((cave) => unlockedCaveIds.includes(cave.id))
    .reduce((total, cave) => total + cave.capacity, 0);
}

/**
 * Get the next cave to unlock based on currently unlocked caves
 */
export function getNextCaveToUnlock(unlockedCaveIds: string[]): AffinageCave | undefined {
  return CAVES.find((cave) => !unlockedCaveIds.includes(cave.id));
}

/**
 * Check if a cave can be unlocked given current state
 * Note: This is a simple check - full logic will be in craftingEngine
 */
export function canUnlockCave(
  cave: AffinageCave,
  unlockedCaveIds: string[],
  rennet: number,
  vintageWheels: number
): boolean {
  // Already unlocked
  if (unlockedCaveIds.includes(cave.id)) return false;

  // Check cost (rennet)
  if (rennet < cave.cost) return false;

  // Check unlock requirement
  const req = cave.unlockRequirement;
  if (!req || req.type === 'none') return true;

  switch (req.type) {
    case 'prestige_rennet':
      return rennet >= req.amount;
    case 'prestige_vintage':
      return vintageWheels >= req.amount;
    case 'cave_unlocked':
      return unlockedCaveIds.includes(req.caveId);
    default:
      return false;
  }
}

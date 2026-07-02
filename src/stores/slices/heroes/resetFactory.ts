import type { PartyFormation } from '../../../types/game';

/**
 * Creates initial hero state for:
 * 1. Initial store state
 * 2. Prestige resets
 */
export function createInitialHeroState(): {
  heroes: Record<string, never>;
  party: PartyFormation;
  equipmentInventory: string[];
} {
  return {
    heroes: {},
    party: {
      frontLeft: null,
      frontRight: null,
      backLeft: null,
      backRight: null,
    },
    equipmentInventory: [],
  };
}

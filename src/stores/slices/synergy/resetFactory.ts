import type { SynergyState } from '../../../types/game';

export function createInitialSynergyState(): SynergyState {
  return {
    purchased: [],
    zoneGeneratorBonuses: {},
  };
}

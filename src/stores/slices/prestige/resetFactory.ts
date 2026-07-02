import type { PrestigeState } from '../../../types/game';

export function createInitialPrestigeState(): PrestigeState {
  return {
    rennet: 0,
    totalRennet: 0,
    agingResetCount: 0,
    agingUpgrades: [],
    vintageWheels: 0,
    totalVintageWheels: 0,
    vintageResetCount: 0,
    vintageUnlocks: [],
    legacy: 0,
    legacyBonuses: {
      ontario: 0,
      quebec: 0,
      alberta: 0,
      manitoba: 0,
      saskatchewan: 0,
      yukon: 0,
      bc: 0,
      nova_scotia: 0,
      new_brunswick: 0,
      pei: 0,
      newfoundland: 0,
      nwt: 0,
      nunavut: 0,
    },
    legacyResetCount: 0,
  };
}

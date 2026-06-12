import type { SynergyId, SynergyState } from '../../../types/game';

export type { SynergyState };

export interface SynergySliceActions {
  purchaseSynergy: (id: SynergyId) => boolean;
  canPurchaseSynergy: (id: SynergyId) => boolean;
  hasSynergy: (id: SynergyId) => boolean;
  getSynergyEhBonus: () => number;
  getSynergyZoneGeneratorMultipliers: () => Record<string, number>;
  getSynergyBuffCombatDamageBonus: () => number;
  getSynergyCraftingSpeedMultiplier: () => number;
  getSynergyFormationBonus: () => number | null;
  assignZoneGeneratorBonus: (zoneId: string) => void;
  getPrestigeSynergyReset: () => Partial<{ synergy: SynergyState }>;
}

export type SynergySlice = { synergy: SynergyState } & SynergySliceActions;

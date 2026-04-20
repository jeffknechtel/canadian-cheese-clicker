import type {
  CombatState,
  ZoneProgress,
  CombatRewards,
} from '../../../types/game';

export interface CombatSliceState {
  combat: CombatState;
  zoneProgress: Record<string, ZoneProgress>;
}

export interface CombatSliceActions {
  startCombat: (zoneId: string, stageNumber: number) => boolean;
  tickCombat: (deltaMs: number) => void;
  endCombat: (result: 'victory' | 'defeat' | 'flee') => void;
  setCombatSpeed: (speed: 1 | 2 | 4) => void;
  useHeroSkill: (heroId: string, skillId: string, targetId?: string) => boolean;
  useLimitBreak: (heroId: string) => boolean;
  canUseHeroSkill: (heroId: string) => { canUse: boolean; reason?: string };
  canUseLimitBreakAction: (heroId: string) => { canUse: boolean; reason?: string };
  claimCombatRewards: () => CombatRewards | null;
  getZoneProgress: (zoneId: string) => ZoneProgress | undefined;
  getPrestigeCombatReset: () => CombatState;
}

export type CombatSlice = CombatSliceState & CombatSliceActions;

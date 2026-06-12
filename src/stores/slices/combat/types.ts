import type {
  CombatState,
  CombatFeedbackState,
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
  useHeroAbility: (heroId: string, abilityId: string, targetId?: string) => boolean;
  useLimitBreak: (heroId: string) => boolean;
  canUseHeroAbility: (heroId: string) => { canUse: boolean; reason?: string };
  canUseLimitBreakAction: (heroId: string) => { canUse: boolean; reason?: string };
  claimCombatRewards: () => CombatRewards | null;
  getZoneProgress: (zoneId: string) => ZoneProgress | undefined;
  getPrestigeCombatReset: () => CombatSliceState;
  // Feedback actions
  addDamageNumber: (damage: CombatFeedbackState['damageNumbers'][0]) => void;
  removeDamageNumber: (id: string) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  triggerFlash: (color: 'red' | 'gold' | 'green') => void;
  triggerShake: (intensity: 'light' | 'medium' | 'heavy') => void;
  resetFeedback: () => void;
}

export type CombatSlice = CombatSliceState & CombatSliceActions;

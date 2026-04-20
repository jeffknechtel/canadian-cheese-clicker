import type { CombatState } from '../../../types/game';

/**
 * Creates empty combat state for:
 * 1. Initial store state
 * 2. After combat ends
 * 3. Prestige resets (called by prestige slice, not hardcoded)
 */
export function createEmptyCombatState(): CombatState {
  return {
    isInCombat: false,
    currentZone: null,
    currentStage: 0,
    enemies: [],
    heroStates: {},
    combatLog: [],
    combatSpeed: 1,
    limitBreakGauge: 0,
    battleResult: null,
  };
}

/**
 * Creates reset state for prestige tier.
 * Combat fully resets on any prestige.
 */
export function createPrestigeCombatState(): CombatState {
  return createEmptyCombatState();
}

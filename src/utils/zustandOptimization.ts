/**
 * Zustand Optimization Utilities
 *
 * Provides optimized selector patterns and utilities for better performance.
 * Uses shallow equality for object/array state subscriptions to prevent
 * unnecessary re-renders when objects are recreated but values haven't changed.
 */

import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../stores';

// ===== Optimized Selectors =====

/**
 * Hook to select multiple values from game store with shallow equality.
 * Use this when you need multiple primitive values from the store.
 */
export function useGameStoreShallow<T>(selector: (state: ReturnType<typeof useGameStore.getState>) => T): T {
  return useGameStore(useShallow(selector));
}

/**
 * Optimized selector for combat state scalars.
 * Shallow equality prevents re-renders from the per-tick combat object
 * recreation — subscribers only re-render when one of these values changes.
 */
export function useCombatState() {
  return useGameStoreShallow((state) => ({
    isInCombat: state.combat.isInCombat,
    currentZone: state.combat.currentZone,
    currentStage: state.combat.currentStage,
    battleResult: state.combat.battleResult,
    combatSpeed: state.combat.combatSpeed,
    limitBreakGauge: state.combat.limitBreakGauge,
  }));
}

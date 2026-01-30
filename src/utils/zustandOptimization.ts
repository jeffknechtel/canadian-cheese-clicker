/**
 * Zustand Optimization Utilities
 *
 * Provides optimized selector patterns and utilities for better performance.
 * Uses shallow equality for object/array state subscriptions to prevent
 * unnecessary re-renders when objects are recreated but values haven't changed.
 */

import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../stores/gameStore';

// ===== Optimized Selectors =====

/**
 * Hook to select multiple values from game store with shallow equality.
 * Use this when you need multiple primitive values from the store.
 */
export function useGameStoreShallow<T>(selector: (state: ReturnType<typeof useGameStore.getState>) => T): T {
  return useGameStore(useShallow(selector));
}

// ===== Common Selector Patterns =====

/**
 * Optimized selector for currency display values.
 * Only triggers re-render when these specific values change.
 */
export function useCurrencyState() {
  return useGameStoreShallow((state) => ({
    curds: state.curds,
    curdPerSecond: state.curdPerSecond,
    prestige: state.prestige,
  }));
}

/**
 * Optimized selector for combat state.
 * Shallow equality prevents re-renders from combat object recreation.
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

/**
 * Optimized selector for party state.
 * Only updates when party composition changes.
 */
export function usePartyState() {
  return useGameStoreShallow((state) => ({
    frontLeft: state.party.frontLeft,
    frontRight: state.party.frontRight,
    backLeft: state.party.backLeft,
    backRight: state.party.backRight,
  }));
}

/**
 * Optimized selector for prestige state.
 */
export function usePrestigeState() {
  return useGameStoreShallow((state) => ({
    rennet: state.prestige.rennet,
    totalRennet: state.prestige.totalRennet,
    agingResetCount: state.prestige.agingResetCount,
    vintageWheels: state.prestige.vintageWheels,
    vintageResetCount: state.prestige.vintageResetCount,
    legacy: state.prestige.legacy,
  }));
}

/**
 * Optimized selector for crafting state counts.
 */
export function useCraftingCounts() {
  return useGameStoreShallow((state) => ({
    activeJobsCount: state.crafting.activeJobs.length,
    inventoryCount: state.crafting.cheeseInventory.length,
    activeBuffsCount: state.crafting.activeBuffs.length,
  }));
}

// ===== Selector Creation Utilities =====

/**
 * Create a memoized selector that only updates when specific fields change.
 * Use this for complex objects where you only need a subset of fields.
 *
 * @example
 * const selectGeneratorInfo = createSelector(
 *   (state, id: string) => ({
 *     count: state.generators[id] ?? 0,
 *     cost: state.getGeneratorCost(id, 1),
 *   })
 * );
 */
export function createGameSelector<Args extends unknown[], Result>(
  selector: (state: ReturnType<typeof useGameStore.getState>, ...args: Args) => Result
) {
  return (...args: Args) => useGameStore(useShallow((state) => selector(state, ...args)));
}

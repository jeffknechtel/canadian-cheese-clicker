/**
 * Creates initial event state for:
 * 1. Initial store state
 * 2. Prestige resets
 */
export function createInitialEventState(): {
  activeEvents: string[];
} {
  return {
    activeEvents: [],
  };
}

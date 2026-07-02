/**
 * Creates initial achievement state for:
 * 1. Initial store state
 * 2. Prestige resets
 */
export function createInitialAchievementState(): {
  achievements: string[];
} {
  return {
    achievements: [],
  };
}

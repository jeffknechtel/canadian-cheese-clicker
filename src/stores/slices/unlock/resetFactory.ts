import type { FeatureId, HintId } from '../../../types/game';

/**
 * Creates initial unlock state for:
 * 1. Initial store state
 * 2. Prestige resets
 */
export function createInitialUnlockState(): {
  unlockedFeatures: Set<FeatureId>;
  shownHints: Set<HintId>;
} {
  return {
    unlockedFeatures: new Set<FeatureId>(['upgrades', 'achievements']),
    shownHints: new Set<HintId>(),
  };
}

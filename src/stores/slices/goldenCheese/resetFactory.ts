import type { GoldenCheeseState } from '../../../types/game';

export function createInitialGoldenCheeseState(): GoldenCheeseState {
  return {
    nextSpawnAt: 0,
    isVisible: false,
    expiresAt: 0,
    currentReward: null,
    totalCollected: 0,
  };
}

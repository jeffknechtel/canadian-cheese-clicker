import type { ChallengeState } from '../../../types/game';

export function createInitialChallengeState(): ChallengeState {
  return {
    activeChallengeId: null,
    weekStartTimestamp: 0,
    progress: 0,
    completed: false,
    claimed: false,
  };
}

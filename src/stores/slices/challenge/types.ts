import type { ChallengeState, ChallengeGoalType } from '../../../types/game';

export interface ChallengeSlice {
  challenge: ChallengeState;
  initializeChallenge: () => void;
  incrementChallengeProgress: (goalType: ChallengeGoalType, amount?: number) => void;
  claimChallengeReward: () => boolean;
  checkWeekRollover: () => void;
}

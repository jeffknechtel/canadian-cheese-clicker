import type { GoldenCheeseState, GoldenCheeseRewardType } from '../../../types/game';

export interface GoldenCheeseSliceState {
  goldenCheese: GoldenCheeseState;
}

export interface GoldenCheeseSliceActions {
  tickGoldenCheese: (deltaMs: number) => void;
  collectGoldenCheese: () => GoldenCheeseRewardType | null;
  scheduleNextGoldenCheese: (forceDelayMs?: number) => void;
  resetGoldenCheeseOnPrestige: () => void;
}

export type GoldenCheeseSlice = GoldenCheeseSliceState & GoldenCheeseSliceActions;

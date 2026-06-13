import type { FeatureId, HintId } from '../../../types/game';

export interface UnlockSliceState {
  unlockedFeatures: Set<FeatureId>;
  shownHints: Set<HintId>;
}

export interface UnlockSliceActions {
  isFeatureUnlocked: (feature: FeatureId) => boolean;
  checkUnlocks: () => FeatureId[];
  isHintShown: (hint: HintId) => boolean;
  markHintShown: (hint: HintId) => void;
}

export type UnlockSlice = UnlockSliceState & UnlockSliceActions;

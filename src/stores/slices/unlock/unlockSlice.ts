import type { SliceCreator } from '../../types';
import type { UnlockSlice } from './types';
import type { FeatureId, HintId } from '../../../types/game';
import { UNLOCK_THRESHOLDS } from '../../../data/constants';
import { publish } from '../../../domain/events';

const DEFAULT_UNLOCKED: FeatureId[] = ['upgrades', 'achievements'];

export const createUnlockSlice: SliceCreator<UnlockSlice> = (set, get) => ({
  // State
  unlockedFeatures: new Set<FeatureId>(DEFAULT_UNLOCKED),
  shownHints: new Set<HintId>(),

  // Actions
  isFeatureUnlocked: (feature: FeatureId) => {
    return get().unlockedFeatures.has(feature);
  },

  checkUnlocks: () => {
    const state = get();
    const totalCurds = state.totalCurdsEarned;
    const newlyUnlocked: FeatureId[] = [];

    const checks: [FeatureId, number][] = [
      ['combat', UNLOCK_THRESHOLDS.combat],
      ['heroes', UNLOCK_THRESHOLDS.heroes],
      ['crafting', UNLOCK_THRESHOLDS.crafting],
      ['prestige', UNLOCK_THRESHOLDS.prestige],
    ];

    for (const [feature, threshold] of checks) {
      if (!state.unlockedFeatures.has(feature) && totalCurds.gte(threshold)) {
        newlyUnlocked.push(feature);
      }
    }

    if (newlyUnlocked.length > 0) {
      set((s) => ({
        unlockedFeatures: new Set([...s.unlockedFeatures, ...newlyUnlocked]),
      }));

      for (const feature of newlyUnlocked) {
        publish({ type: 'FeatureUnlocked', featureId: feature });
      }
    }

    return newlyUnlocked;
  },

  isHintShown: (hint: HintId) => {
    return get().shownHints.has(hint);
  },

  markHintShown: (hint: HintId) => {
    set((s) => ({
      shownHints: new Set([...s.shownHints, hint]),
    }));
  },
});

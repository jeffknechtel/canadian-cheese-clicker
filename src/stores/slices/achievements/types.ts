import type { Achievement } from '../../../types/game';

export interface AchievementSliceState {
  achievements: string[];
}

export interface AchievementSliceActions {
  checkAchievements: () => void;
  isAchievementUnlocked: (id: string) => boolean;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementGlobalMultiplier: () => number;
  getAchievementClickMultiplier: () => number;
}

export type AchievementSlice = AchievementSliceState & AchievementSliceActions;

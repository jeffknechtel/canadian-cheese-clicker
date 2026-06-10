import { useEffect } from 'react';
import { subscribe } from '../domain/events';
import type { Achievement } from '../types/game';

export function useAchievementEvents(
  onUnlock: (achievement: Achievement) => void
): void {
  useEffect(() => {
    return subscribe('AchievementUnlocked', (event) => {
      onUnlock(event.achievement);
    });
  }, [onUnlock]);
}

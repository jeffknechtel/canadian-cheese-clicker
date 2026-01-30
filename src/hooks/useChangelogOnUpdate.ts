import { useCallback } from 'react';
import { GAME_VERSION } from '../config/version';

const LAST_SEEN_VERSION_KEY = 'canadian_cheese_quest_last_seen_version';

/**
 * Hook to manage changelog visibility based on version updates.
 * Tracks whether the user has seen the changelog for the current version.
 */
export function useChangelogOnUpdate() {
  const checkForUpdate = useCallback((): boolean => {
    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    return lastSeen !== GAME_VERSION;
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, GAME_VERSION);
  }, []);

  return { checkForUpdate, markAsSeen };
}

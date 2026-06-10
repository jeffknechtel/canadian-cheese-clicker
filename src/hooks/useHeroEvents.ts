import { useEffect } from 'react';
import { subscribe } from '../domain/events';
import type { HeroDefinition } from '../types/game';

export function useHeroLevelUpEvents(
  onLevelUp: (hero: HeroDefinition, newLevel: number) => void
): void {
  useEffect(() => {
    return subscribe('HeroLeveledUp', (event) => {
      onLevelUp(event.hero, event.newLevel);
    });
  }, [onLevelUp]);
}

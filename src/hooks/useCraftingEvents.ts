import { useEffect } from 'react';
import { subscribe, type DomainEvent } from '../domain/events';

type CraftingEventType =
  | 'CheeseCollected'
  | 'RecipeUnlocked'
  | 'CaveUnlocked'
  | 'BuffActivated'
  | 'BuffExpired';

export function useCraftingEvents(
  onEvent: (event: Extract<DomainEvent, { type: CraftingEventType }>) => void
): void {
  useEffect(() => {
    const unsubs = [
      subscribe('CheeseCollected', onEvent),
      subscribe('RecipeUnlocked', onEvent),
      subscribe('CaveUnlocked', onEvent),
      subscribe('BuffActivated', onEvent),
      subscribe('BuffExpired', onEvent),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [onEvent]);
}

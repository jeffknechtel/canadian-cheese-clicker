import Decimal from 'decimal.js';
import type {
  CombatRewards,
  Achievement,
  CheeseRecipe,
  CraftedCheese,
  CheeseActiveBuff,
  HeroDefinition,
  AffinageCave,
  FeatureId,
} from '../../types/game';

/**
 * Domain events — discriminated union of all cross-context events.
 * Extends the CraftingEvent pattern from craftingSlice.ts.
 */
export type DomainEvent =
  // Combat events
  | { type: 'BattleWon'; zoneId: string; stageIndex: number; rewards: CombatRewards }
  | { type: 'BattleLost'; zoneId: string; stageIndex: number }
  // Hero events
  | { type: 'HeroLeveledUp'; heroId: string; hero: HeroDefinition; newLevel: number }
  | { type: 'HeroRecruited'; heroId: string }
  // Production events
  | { type: 'CpsInputsChanged' }
  | { type: 'CurdsEarned'; amount: Decimal; source: 'click' | 'production' | 'combat' | 'crafting' }
  // Prestige events
  | { type: 'PrestigePerformed'; tier: 'aging' | 'vintage' | 'legacy'; currencyGained: number }
  // Crafting events (consolidates existing CraftingEvent)
  | { type: 'CheeseCollected'; cheese: CraftedCheese; recipe: CheeseRecipe }
  | { type: 'RecipeUnlocked'; recipe: CheeseRecipe }
  | { type: 'CaveUnlocked'; cave: AffinageCave }
  | { type: 'BuffActivated'; buff: CheeseActiveBuff; recipe: CheeseRecipe }
  | { type: 'BuffExpired'; buff: CheeseActiveBuff }
  // Achievement events
  | { type: 'AchievementUnlocked'; achievement: Achievement }
  // Event system events
  | { type: 'SeasonalEventActivated'; eventId: string }
  | { type: 'SeasonalEventDeactivated'; eventId: string }
  // Synergy events
  | { type: 'SynergyPurchased'; synergyId: string }
  // Progressive unlock events
  | { type: 'FeatureUnlocked'; featureId: FeatureId };

type EventHandler<T extends DomainEvent['type']> = (
  event: Extract<DomainEvent, { type: T }>
) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEventHandler = (event: any) => void;

// Module-level registry (follows existing callback pattern)
const handlers: Map<DomainEvent['type'], Set<AnyEventHandler>> = new Map();

/**
 * Subscribe to a domain event type.
 * Returns unsubscribe function for useEffect cleanup.
 */
export function subscribe<T extends DomainEvent['type']>(
  eventType: T,
  handler: EventHandler<T>
): () => void {
  if (!handlers.has(eventType)) {
    handlers.set(eventType, new Set());
  }
  handlers.get(eventType)!.add(handler as AnyEventHandler);

  return () => {
    handlers.get(eventType)?.delete(handler as AnyEventHandler);
  };
}

/**
 * Publish a domain event synchronously.
 * All subscribers are invoked immediately.
 */
export function publish(event: DomainEvent): void {
  const eventHandlers = handlers.get(event.type);
  if (eventHandlers) {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }
}

/**
 * Clear all handlers (for testing).
 */
export function clearAllHandlers(): void {
  handlers.clear();
}

# Phase 6: Strategic Design — Enforced Boundaries & Domain Events

## Overview

Phase 6 completes the DDD refactoring roadmap by establishing strategic design patterns: typed slice boundaries that prevent unauthorized cross-context writes, a synchronous domain event system for loose coupling, and a persistence anti-corruption layer (ACL) where each slice owns its own serialization. This phase transforms organizational boundaries into enforced boundaries, making the architecture self-documenting and violation-resistant.

## Current State Analysis

**Completed in Phases 1–5:**
- Phase 1: Dead code reconciled, two-models problem resolved
- Phase 2: Single source of truth for CPS/click pipelines
- Phase 3: Crafting context rebuilt with single logic source
- Phase 4: Value objects for Quality, Stats, Multiplier/Bonus
- Phase 5: Battle and Party aggregates with invariant ownership

**Current boundary violations (identified via codebase research):**

| Violation | Location | Description |
|-----------|----------|-------------|
| Crafting writes prestige | `craftingSlice.ts:131-135` | `unlockCave` mutates `prestige.rennet` |
| Crafting writes production | `craftingSlice.ts:206-207, 398-413` | `startCrafting`/`sellCheese` mutate `curds` |
| Combat writes production | `combatSlice.ts:236-238` | `claimCombatRewards` mutates `whey`, `totalCurdsEarned` |
| Combat writes heroes | `combatSlice.ts:242-244` | `claimCombatRewards` calls `grantXp()` |
| Achievements write production | `achievementSlice.ts:138-139` | `checkAchievements` calls CPS/click recalculation |
| Prestige resets production inline | `prestigeSlice.ts:77-86` | Hardcoded initial values instead of factory |
| Persistence duplicates literals | `persistenceSlice.ts:46-116` | Full initial state for all slices, only combat/crafting use factories |

**Current event patterns (to generalize):**
- Module-level single-subscriber callbacks (`heroSlice.ts:16-21`, `craftingSlice.ts:36-48`, `achievementSlice.ts:12-17`)
- CraftingEvent discriminated union (`craftingSlice.ts:36-41`) — most evolved pattern
- 14 manual `recalculateCps()` call sites across 5 slices

**Good pattern to generalize:**
- `resetFactory` pattern in `combat/resetFactory.ts` and `crafting/resetFactory.ts`
- Owner defines reset shape; orchestrator (prestige) delegates via `getPrestigeXxxReset()`

## Desired End State

After Phase 6:

1. **Typed slice boundaries** — Each slice's `set()` is typed to its own keys only; cross-context effects require explicit published actions
2. **Domain events** — A synchronous pub/sub dispatcher replaces direct cross-context writes and manual CPS recalculation
3. **Persistence ACL** — Each slice owns serialize/deserialize/migrate for its keys; `saveSystem.ts` is a thin compositor with a versioned migration ladder
4. **Event lifecycle fixed** — Seasonal events activate for fresh games and auto-deactivate when date range ends

### Verification Commands:
```bash
# Type checking enforces boundaries
npm run typecheck

# No direct cross-context state writes (only published actions)
grep -rn "set({" src/stores/slices/ | grep -v "$(dirname $0)/" 

# Domain events are the only cross-context communication
grep -rn "publish(" src/stores/slices/

# Each slice has persistence module
ls src/stores/slices/*/persistence.ts
```

## What We're NOT Doing

- **Not changing the Zustand store composition** — Slices still compose into one `GameStore`; we're narrowing `set()` types, not restructuring the store
- **Not adding async event handling** — The synchronous dispatcher is sufficient for the 100ms tick cadence
- **Not implementing batched events** — Per-operation dispatch is fine; batching adds complexity without benefit
- **Not touching aggregates** — Phase 5's Battle/Party aggregates are complete; this phase is pure boundaries
- **Not adding full Currency value objects** — The Phase 4 minimal scope (Quality, Stats, Multiplier/Bonus) remains the stopping point

---

## Phase 6.1: Domain Event Dispatcher

### Overview

Create a minimal synchronous domain event system that generalizes the existing module-level callback pattern. Multi-subscriber support, typed events via discriminated union, React-friendly unsubscribe pattern.

### Changes Required:

#### 1. Create Event Dispatcher

**File**: `src/domain/events/dispatcher.ts` (new)

```typescript
import type { CombatRewards, Achievement, CheeseRecipe, CraftedCheese, CheeseActiveBuff, HeroDefinition, AffinageCave } from '../../types/game';

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
  | { type: 'SeasonalEventDeactivated'; eventId: string };

type EventHandler<T extends DomainEvent['type']> = (
  event: Extract<DomainEvent, { type: T }>
) => void;

// Module-level registry (follows existing callback pattern)
const handlers: Map<DomainEvent['type'], Set<EventHandler<any>>> = new Map();

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
  handlers.get(eventType)!.add(handler);

  return () => {
    handlers.get(eventType)?.delete(handler);
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
```

#### 2. Create Event Index

**File**: `src/domain/events/index.ts` (new)

```typescript
export { publish, subscribe, clearAllHandlers } from './dispatcher';
export type { DomainEvent } from './dispatcher';
```

#### 3. Export from Domain Index

**File**: `src/domain/index.ts`
**Changes**: Add events export

```typescript
// Add to existing exports
export * from './events';
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes with new event types
- [x] `npm run lint` passes
- [x] File exists: `src/domain/events/dispatcher.ts`
- [x] File exists: `src/domain/events/index.ts`

#### Manual Verification:
- [x] Event type discriminated union compiles correctly
- [ ] Subscribe/publish pattern works in isolation test

---

## Phase 6.2: Wire Combat Events (Replace Direct Cross-Context Writes)

### Overview

Replace `combatSlice.claimCombatRewards()` direct writes with `BattleWon` event publication. Production slice subscribes and handles reward distribution. This eliminates the "Cross-slice" comment at `combatSlice.ts:224-259`.

### Changes Required:

#### 1. Modify combatSlice to Publish Event

**File**: `src/stores/slices/combat/combatSlice.ts`
**Changes**: Replace direct cross-context writes with event

```typescript
// Add import at top
import { publish } from '../../../domain/events';

// In claimCombatRewards action (around line 224-259)
// BEFORE:
claimCombatRewards: () => {
  const state = get();
  const { combat } = state;
  // ... calculate rewards ...
  
  // Cross-slice: add curds and whey
  state.addCurds(rewards.curds);
  set((s) => ({
    whey: s.whey.plus(rewards.whey),
    totalCurdsEarned: s.totalCurdsEarned.plus(rewards.curds),
  }));
  
  // Cross-slice: grant XP to heroes
  for (const [heroId, xpAmount] of Object.entries(rewards.xp)) {
    get().grantXp(heroId, xpAmount);
  }
  // ...
}

// AFTER:
claimCombatRewards: () => {
  const state = get();
  const { combat } = state;
  // ... calculate rewards (unchanged) ...
  
  // Publish event instead of direct cross-context writes
  publish({
    type: 'BattleWon',
    zoneId: combat.currentZone!,
    stageIndex: combat.currentStage,
    rewards,
  });
  
  // Only update combat-owned state
  set({
    combat: {
      ...combat,
      battleResult: null,
      isInCombat: false,
    },
  });
}
```

#### 2. Create Production Event Subscriber

**File**: `src/stores/slices/production/eventSubscriber.ts` (new)

```typescript
import { subscribe } from '../../../domain/events';
import { useGameStore } from '../../index';

/**
 * Initialize production slice event subscriptions.
 * Called once during store initialization.
 */
export function initProductionEventSubscriber(): () => void {
  const unsubBattleWon = subscribe('BattleWon', (event) => {
    const store = useGameStore.getState();
    
    // Add rewards (production-owned state)
    store.addCurds(event.rewards.curds);
    useGameStore.setState((s) => ({
      whey: s.whey.plus(event.rewards.whey),
      totalCurdsEarned: s.totalCurdsEarned.plus(event.rewards.curds),
    }));
  });

  return () => {
    unsubBattleWon();
  };
}
```

#### 3. Create Hero Event Subscriber

**File**: `src/stores/slices/heroes/eventSubscriber.ts` (new)

```typescript
import { subscribe } from '../../../domain/events';
import { useGameStore } from '../../index';

/**
 * Initialize hero slice event subscriptions.
 * Called once during store initialization.
 */
export function initHeroEventSubscriber(): () => void {
  const unsubBattleWon = subscribe('BattleWon', (event) => {
    const store = useGameStore.getState();
    
    // Grant XP to heroes (hero-owned action)
    for (const [heroId, xpAmount] of Object.entries(event.rewards.xp)) {
      store.grantXp(heroId, xpAmount);
    }
  });

  return () => {
    unsubBattleWon();
  };
}
```

#### 4. Initialize Subscribers at Store Creation

**File**: `src/stores/index.ts`
**Changes**: Initialize event subscribers after store creation

```typescript
// Add imports
import { initProductionEventSubscriber } from './slices/production/eventSubscriber';
import { initHeroEventSubscriber } from './slices/heroes/eventSubscriber';

// After store creation (around line 23)
export const useGameStore = create<GameStore>()((...a) => ({
  ...createProductionSlice(...a),
  ...createHeroSlice(...a),
  // ... other slices
}));

// Initialize event subscribers
initProductionEventSubscriber();
initHeroEventSubscriber();
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [x] `grep -n "Cross-slice" src/stores/slices/combat/combatSlice.ts` returns empty

#### Manual Verification:
- [ ] Win a battle, verify curds/whey/XP are awarded correctly
- [ ] Combat log shows victory message
- [ ] Hero XP increases after battle victory

---

## Phase 6.3: Wire Achievement Events (Replace Callback Pattern)

### Overview

Replace the module-level `achievementUnlockCallback` with domain events. Achievements publish `AchievementUnlocked` events; UI subscribes via React hook.

### Changes Required:

#### 1. Modify achievementSlice to Publish Events

**File**: `src/stores/slices/achievements/achievementSlice.ts`
**Changes**: Replace callback with event publication

```typescript
// Add import
import { publish } from '../../../domain/events';

// Remove module-level callback (lines 12-17)
// DELETE:
// type AchievementUnlockCallback = (achievement: Achievement) => void;
// let achievementUnlockCallback: AchievementUnlockCallback | null = null;
// export function setAchievementUnlockCallback(callback: AchievementUnlockCallback | null): void {
//   achievementUnlockCallback = callback;
// }

// In checkAchievements action (around line 144-146)
// BEFORE:
if (achievementUnlockCallback) {
  achievementUnlockCallback(achievement);
}

// AFTER:
publish({ type: 'AchievementUnlocked', achievement });
```

#### 2. Create Achievement Event Hook for UI

**File**: `src/hooks/useAchievementEvents.ts` (new)

```typescript
import { useEffect } from 'react';
import { subscribe } from '../domain/events';

export function useAchievementEvents(
  onUnlock: (achievement: Achievement) => void
): void {
  useEffect(() => {
    return subscribe('AchievementUnlocked', (event) => {
      onUnlock(event.achievement);
    });
  }, [onUnlock]);
}
```

#### 3. Update App.tsx to Use Hook

**File**: `src/App.tsx`
**Changes**: Replace callback registration with hook

```typescript
// Add import
import { useAchievementEvents } from './hooks/useAchievementEvents';

// BEFORE (around line 265-270):
// useEffect(() => {
//   setAchievementUnlockCallback((achievement) => {
//     // show toast
//   });
//   return () => setAchievementUnlockCallback(null);
// }, []);

// AFTER:
useAchievementEvents(useCallback((achievement) => {
  // show toast (existing logic)
  showAchievementToast(achievement);
}, []));
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `grep -n "achievementUnlockCallback" src/` returns only import/export lines (no usage)

#### Manual Verification:
- [ ] Unlock an achievement, verify toast appears
- [ ] Multiple achievements in sequence show correct toasts

---

## Phase 6.4: Wire Hero and Crafting Events (Replace Remaining Callbacks)

### Overview

Replace `heroLevelUpCallback` and `craftingEventCallback` with domain events using the same pattern as Phase 6.3.

### Changes Required:

#### 1. Modify heroSlice to Publish Events

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Changes**: Replace callback with event publication

```typescript
// Add import
import { publish } from '../../../domain/events';

// Remove module-level callback (lines 16-21)
// DELETE the heroLevelUpCallback pattern

// In grantXp action (around line 268-276)
// BEFORE:
if (heroLevelUpCallback) {
  heroLevelUpCallback(heroDef, newLevel);
}

// AFTER:
publish({ type: 'HeroLeveledUp', heroId, hero: heroDef, newLevel });
```

#### 2. Modify craftingSlice to Publish Events

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Replace callback with event publications

```typescript
// Add import
import { publish } from '../../../domain/events';

// Remove module-level callback (lines 36-48)
// DELETE the CraftingEvent type and craftingEventCallback pattern

// Replace each callback invocation:

// Line ~113-115 (recipe unlock):
// BEFORE: if (craftingEventCallback) { craftingEventCallback({ type: 'recipe_unlocked', recipe }); }
// AFTER:
publish({ type: 'RecipeUnlocked', recipe });

// Line ~141-143 (cave unlock):
publish({ type: 'CaveUnlocked', cave });

// Line ~268-284 (cheese complete):
publish({ type: 'CheeseCollected', cheese, recipe });

// Line ~333-335 (buff activated):
publish({ type: 'BuffActivated', buff, recipe });

// Line ~380-382 (buff expired):
publish({ type: 'BuffExpired', buff });
```

#### 3. Create Event Hooks for UI

**File**: `src/hooks/useHeroEvents.ts` (new)

```typescript
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
```

**File**: `src/hooks/useCraftingEvents.ts` (new)

```typescript
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
    return () => unsubs.forEach(fn => fn());
  }, [onEvent]);
}
```

#### 4. Update App.tsx to Use New Hooks

**File**: `src/App.tsx`
**Changes**: Replace all callback registrations with hooks

```typescript
// Add imports
import { useHeroLevelUpEvents } from './hooks/useHeroEvents';
import { useCraftingEvents } from './hooks/useCraftingEvents';

// Replace callback registrations with hooks
useHeroLevelUpEvents(useCallback((hero, level) => {
  showHeroLevelUpDialogue(hero, level);
  playMilestoneChime();
}, []));

useCraftingEvents(useCallback((event) => {
  switch (event.type) {
    case 'CheeseCollected':
      showCheeseCompleteToast(event.cheese, event.recipe);
      break;
    case 'RecipeUnlocked':
      showRecipeUnlockedToast(event.recipe);
      break;
    // ... other cases
  }
}, []));
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `grep -rn "Callback = null" src/stores/slices/` returns empty
- [x] `grep -rn "setHeroLevelUpCallback\|setCraftingEventCallback\|setAchievementUnlockCallback" src/` returns empty

#### Manual Verification:
- [ ] Hero levels up, dialogue appears
- [ ] Cheese completes, toast appears
- [ ] Recipe unlocks, notification appears

---

## Phase 6.5: CpsInputsChanged Event (Replace Manual Recalculation Sites)

### Overview

Replace the 14 manual `recalculateCps()` call sites with a `CpsInputsChanged` event. Production slice subscribes and handles recalculation automatically.

### Changes Required:

#### 1. Add CpsInputsChanged Subscriber

**File**: `src/stores/slices/production/eventSubscriber.ts`
**Changes**: Add CPS recalculation subscription

```typescript
// Add to initProductionEventSubscriber
const unsubCpsChanged = subscribe('CpsInputsChanged', () => {
  const store = useGameStore.getState();
  store.recalculateCps();
  store.recalculateClickValue();
});

// Add to cleanup
return () => {
  unsubBattleWon();
  unsubCpsChanged();
};
```

#### 2. Replace Manual Recalculation Calls

Replace each `get().recalculateCps()` call with `publish({ type: 'CpsInputsChanged' })`:

| File | Line | Action | Change |
|------|------|--------|--------|
| `productionSlice.ts` | 109 | `buyGenerator` | Replace with event |
| `productionSlice.ts` | 158 | `buyUpgrade` | Replace with event |
| `productionSlice.ts` | 218 | `incrementEh` | Replace with event |
| `heroSlice.ts` | 57 | `recruitHero` | Replace with event |
| `heroSlice.ts` | 103 | `assignToParty` | Replace with event |
| `heroSlice.ts` | 115 | `removeFromParty` | Replace with event |
| `heroSlice.ts` | 125 | `swapPartyPositions` | Replace with event |
| `heroSlice.ts` | 189 | `equipItem` | Replace with event |
| `heroSlice.ts` | 213 | `unequipItem` | Replace with event |
| `heroSlice.ts` | 266 | `grantXp` | Replace with event |
| `achievementSlice.ts` | 139 | `checkAchievements` | Replace with event |
| `prestigeSlice.ts` | 105 | `performAging` | Replace with event |
| `prestigeSlice.ts` | 126 | `purchaseAgingUpgrade` | Replace with event |
| `persistenceSlice.ts` | 37 | `load` | Replace with event |

**Example change pattern:**

```typescript
// BEFORE:
buyGenerator: (id: string) => {
  // ... buy logic ...
  get().recalculateCps();
}

// AFTER:
import { publish } from '../../../domain/events';

buyGenerator: (id: string) => {
  // ... buy logic ...
  publish({ type: 'CpsInputsChanged' });
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `grep -rn "recalculateCps()" src/stores/slices/` returns only the definition in productionSlice.ts
- [x] `grep -rn "CpsInputsChanged" src/stores/slices/` shows all 14 publish sites (15 found)

#### Manual Verification:
- [ ] Buy a generator, CPS updates correctly
- [ ] Equip hero item, CPS updates
- [ ] Perform prestige, CPS resets correctly
- [ ] Load game, CPS is correct

---

## Phase 6.6: Fix Seasonal Event Lifecycle

### Overview

Fix the two event lifecycle bugs: (1) fresh games never activate events, (2) events never auto-deactivate. Add `checkEventActivation` to game loop at a sensible frequency.

### Changes Required:

#### 1. Fix Union-Only Merge Bug

**File**: `src/stores/slices/events/eventSlice.ts`
**Changes**: Replace union merge with proper activation/deactivation

```typescript
// BEFORE (lines 61-72):
checkEventActivation: () => {
  const autoActiveIds = getAutoActiveEventIds();
  const currentIds = get().activeEvents;
  
  // BUG: Union-only merge - never removes expired events
  const newIds = [...new Set([...currentIds, ...autoActiveIds])];
  
  if (newIds.length !== currentIds.length || !newIds.every((id) => currentIds.includes(id))) {
    set({ activeEvents: newIds });
  }
}

// AFTER:
checkEventActivation: () => {
  const autoActiveIds = getAutoActiveEventIds();
  const currentIds = get().activeEvents;
  
  // Proper activation: set to exactly what should be active now
  const newIds = autoActiveIds;
  
  // Check if anything changed
  const added = newIds.filter(id => !currentIds.includes(id));
  const removed = currentIds.filter(id => !newIds.includes(id));
  
  if (added.length > 0 || removed.length > 0) {
    // Publish events for UI notifications
    for (const id of added) {
      publish({ type: 'SeasonalEventActivated', eventId: id });
    }
    for (const id of removed) {
      publish({ type: 'SeasonalEventDeactivated', eventId: id });
    }
    
    set({ activeEvents: newIds });
  }
}
```

#### 2. Call checkEventActivation for Fresh Games

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Changes**: Call event check regardless of save existence

```typescript
// BEFORE (lines 20-44):
load: () => {
  const savedState = loadGame();
  if (!savedState) return null;  // Early return skips event check
  
  // ... restore state ...
  
  get().checkEventActivation();  // Only reached if save exists
  return offlineProgress;
}

// AFTER:
load: () => {
  const savedState = loadGame();
  
  // Always check event activation, even for fresh games
  get().checkEventActivation();
  
  if (!savedState) return null;
  
  // ... restore state ...
  return offlineProgress;
}
```

#### 3. Add Periodic Event Check to Game Loop

**File**: `src/systems/gameLoop.ts`
**Changes**: Add daily event check (not per-tick, just periodic)

```typescript
// Add at module level
let lastEventCheckTime = 0;
const EVENT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check hourly

// In tick function (around line 56-59)
function tick(currentTime: number) {
  // ... existing tick logic ...
  
  // Periodic event lifecycle check (hourly, not per-tick)
  if (currentTime - lastEventCheckTime > EVENT_CHECK_INTERVAL_MS) {
    store.checkEventActivation();
    lastEventCheckTime = currentTime;
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds

#### Manual Verification:
- [ ] Start fresh game during seasonal event date range, event is active
- [ ] Change system date past event end date, reload game, event is no longer active
- [ ] Event activation/deactivation publishes domain events

---

## Phase 6.7: Typed Slice Boundaries

### Overview

Narrow `SliceCreator` so each slice's `set()` is typed to its own keys. Cross-context effects must go through published actions (the "sanctioned doors").

### Changes Required:

#### 1. Create Per-Slice State Types

**File**: `src/stores/slices/production/types.ts`
**Changes**: Export state-only type

```typescript
// Add state-only type for boundary enforcement
export type ProductionState = {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
  generators: Record<string, number>;
  upgrades: string[];
  ehCount: number;
  lastMilestone: number;
};

// Existing ProductionSlice stays as is (state + actions)
```

Repeat for each slice: `CombatState`, `HeroState`, `CraftingState`, etc.

#### 2. Create Bounded SliceCreator Types

**File**: `src/stores/types.ts`
**Changes**: Add bounded slice creator

```typescript
import type { StateCreator } from 'zustand';

// Full store type (unchanged)
export type GameStore = ProductionSlice & HeroSlice & /* ... */;

// Bounded creator for type-safe set()
export type BoundedSliceCreator<
  TState,
  TActions
> = StateCreator<
  GameStore,
  [],
  [],
  TState & TActions,
  // Narrow set() to only TState keys
  { set: (partial: Partial<TState>) => void; get: () => GameStore }
>;

// Published actions interface (the sanctioned doors)
export interface PublishedActions {
  // Production
  addCurds: (amount: Decimal) => void;
  recalculateCps: () => void;
  recalculateClickValue: () => void;
  
  // Heroes
  grantXp: (heroId: string, amount: number) => void;
  
  // Prestige
  spendRennet: (amount: number) => boolean;
  
  // Combat
  getPrestigeCombatReset: () => CombatState;
  
  // Crafting
  getPrestigeCraftingReset: (tier: 'aging' | 'vintage' | 'legacy') => CraftingState;
}
```

#### 3. Migrate Slices to Bounded Creator

**Example**: `src/stores/slices/crafting/craftingSlice.ts`

```typescript
// BEFORE:
import type { SliceCreator } from '../../types';

export const createCraftingSlice: SliceCreator<CraftingSlice> = (set, get) => ({
  // ...
  unlockCave: (caveId: string) => {
    // BUG: Direct write to prestige
    set({
      prestige: {
        ...state.prestige,
        rennet: state.prestige.rennet - cave.cost,
      },
    });
  },
});

// AFTER:
import type { BoundedSliceCreator } from '../../types';

export const createCraftingSlice: BoundedSliceCreator<CraftingState, CraftingActions> = (set, get) => ({
  // ...
  unlockCave: (caveId: string) => {
    // Use published action instead of direct write
    const success = get().spendRennet(cave.cost);
    if (!success) return false;
    
    // Only write crafting-owned state
    set({
      crafting: {
        ...get().crafting,
        unlockedCaves: [...get().crafting.unlockedCaves, caveId],
      },
    });
  },
});
```

#### 4. Add spendRennet Published Action

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Changes**: Add published action for rennet spending

```typescript
// Add to PrestigeSlice actions
spendRennet: (amount: number) => {
  const state = get();
  if (state.prestige.rennet < amount) return false;
  
  set({
    prestige: {
      ...state.prestige,
      rennet: state.prestige.rennet - amount,
    },
  });
  return true;
},
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes with bounded types
- [x] Attempting to `set({ prestige: ... })` from craftingSlice causes type error (uses spendRennet action instead)

#### Manual Verification:
- [ ] Unlock cave, rennet is deducted correctly
- [ ] Sell cheese, curds are added correctly
- [ ] All cross-context operations work via published actions

---

## Phase 6.8: Persistence ACL — Slice-Owned Serialization

### Overview

Each slice owns serialize/deserialize/migrate for its keys. `saveSystem.ts` becomes a thin compositor with a versioned migration ladder.

### Changes Required:

#### 1. Create Per-Slice Persistence Modules

**File**: `src/stores/slices/production/persistence.ts` (new)

```typescript
import Decimal from 'decimal.js';
import type { ProductionState } from './types';

export interface SerializedProductionState {
  curds: string;
  whey: string;
  totalCurdsEarned: string;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  ehCount: number;
  lastMilestone: number;
  // NOTE: curdPerClick/curdPerSecond not serialized — recalculated on load
}

export function serializeProduction(state: ProductionState): SerializedProductionState {
  return {
    curds: state.curds.toString(),
    whey: state.whey.toString(),
    totalCurdsEarned: state.totalCurdsEarned.toString(),
    totalClicks: state.totalClicks,
    generators: state.generators,
    upgrades: state.upgrades,
    ehCount: state.ehCount,
    lastMilestone: state.lastMilestone,
  };
}

export function deserializeProduction(
  serialized: SerializedProductionState | undefined,
  _version: number
): Partial<ProductionState> {
  if (!serialized) {
    return {}; // Use slice defaults
  }
  
  return {
    curds: new Decimal(serialized.curds),
    whey: new Decimal(serialized.whey),
    totalCurdsEarned: new Decimal(serialized.totalCurdsEarned),
    totalClicks: serialized.totalClicks,
    generators: serialized.generators,
    upgrades: serialized.upgrades,
    ehCount: serialized.ehCount ?? 0,
    lastMilestone: serialized.lastMilestone ?? 0,
    // curdPerClick/curdPerSecond set by recalculateCps after load
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),
  };
}
```

Repeat pattern for each slice:
- `src/stores/slices/heroes/persistence.ts`
- `src/stores/slices/combat/persistence.ts`
- `src/stores/slices/crafting/persistence.ts`
- `src/stores/slices/prestige/persistence.ts`
- `src/stores/slices/achievements/persistence.ts`
- `src/stores/slices/events/persistence.ts`

#### 2. Create Versioned Migration Ladder

**File**: `src/systems/migrations.ts` (new)

```typescript
import type { SerializedGameState } from './saveSystem';

export const CURRENT_VERSION = 8; // Bump from 7

interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: SerializedGameState) => SerializedGameState;
}

const migrations: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (data) => ({
      ...data,
      achievements: data.achievements ?? [],
      ehCount: data.ehCount ?? 0,
      lastMilestone: data.lastMilestone ?? 0,
    }),
  },
  {
    fromVersion: 2,
    toVersion: 3,
    migrate: (data) => ({
      ...data,
      heroes: data.heroes ?? {},
      party: data.party ?? {
        frontLeft: null,
        frontRight: null,
        backLeft: null,
        backRight: null,
      },
      equipmentInventory: data.equipmentInventory ?? [],
    }),
  },
  // ... add remaining migrations
  {
    fromVersion: 7,
    toVersion: 8,
    migrate: (data) => {
      // Phase 6 migration: no data changes, just version bump
      return data;
    },
  },
];

export function runMigrations(
  data: SerializedGameState,
  fromVersion: number
): SerializedGameState {
  let current = data;
  
  for (const migration of migrations) {
    if (fromVersion < migration.toVersion && fromVersion >= migration.fromVersion) {
      console.log(`Running migration v${migration.fromVersion} → v${migration.toVersion}`);
      current = migration.migrate(current);
    }
  }
  
  return current;
}
```

#### 3. Refactor saveSystem to Compositor

**File**: `src/systems/saveSystem.ts`
**Changes**: Compose from slice persistence modules

```typescript
import { CURRENT_VERSION, runMigrations } from './migrations';
import { serializeProduction, deserializeProduction } from '../stores/slices/production/persistence';
import { serializeHeroes, deserializeHeroes } from '../stores/slices/heroes/persistence';
// ... other slice imports

export function serializeState(state: GameState): SerializedGameState {
  return {
    version: CURRENT_VERSION,
    production: serializeProduction(state),
    heroes: serializeHeroes(state),
    combat: {}, // Combat resets on load
    crafting: serializeCrafting(state),
    prestige: serializePrestige(state),
    achievements: serializeAchievements(state),
    events: serializeEvents(state),
    lastSaved: state.lastSaved,
    gameStarted: state.gameStarted,
  };
}

export function deserializeState(
  serialized: SerializedGameState
): GameState {
  // Run migrations first
  const migrated = runMigrations(serialized, serialized.version);
  
  return {
    ...deserializeProduction(migrated.production, migrated.version),
    ...deserializeHeroes(migrated.heroes, migrated.version),
    ...deserializeCombat(migrated.combat, migrated.version),
    ...deserializeCrafting(migrated.crafting, migrated.version),
    ...deserializePrestige(migrated.prestige, migrated.version),
    ...deserializeAchievements(migrated.achievements, migrated.version),
    ...deserializeEvents(migrated.events, migrated.version),
    lastSaved: migrated.lastSaved,
    gameStarted: migrated.gameStarted,
  };
}
```

#### 4. Fix persistenceSlice.reset() Duplication

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Changes**: Use slice factories instead of inline literals

```typescript
import { createInitialProductionState } from '../production/initialState';
import { createEmptyCombatState } from '../combat/resetFactory';
import { createInitialCraftingState } from '../crafting/resetFactory';
import { createInitialHeroState } from '../heroes/initialState';
import { createInitialPrestigeState } from '../prestige/initialState';
import { createInitialAchievementState } from '../achievements/initialState';
import { createInitialEventState } from '../events/initialState';

// BEFORE (lines 46-116): ~70 lines of hardcoded initial state

// AFTER:
reset: () => {
  set({
    ...createInitialProductionState(),
    ...createInitialHeroState(),
    combat: createEmptyCombatState(),
    crafting: createInitialCraftingState(),
    prestige: createInitialPrestigeState(),
    achievements: createInitialAchievementState(),
    activeEvents: createInitialEventState(),
    lastSaved: Date.now(),
    gameStarted: Date.now(),
  });
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` succeeds
- [ ] Each slice has `persistence.ts`: `ls src/stores/slices/*/persistence.ts` (minimal implementation - migration ladder only)
- [x] Migration ladder exists: `test -f src/systems/migrations.ts`

#### Manual Verification:
- [ ] Save game, reload, all state restored correctly
- [ ] Load old save (version 7), migration runs successfully
- [ ] Reset game, all state initialized correctly

---

## Phase 6.9: Generalize resetFactory Pattern

### Overview

Extend the `resetFactory` pattern from combat/crafting to all slices. Production and prestige currently use inline reset logic in `prestigeSlice.ts:77-86`; migrate to delegated factories.

### Changes Required:

#### 1. Create Production Reset Factory

**File**: `src/stores/slices/production/resetFactory.ts` (new)

```typescript
import Decimal from 'decimal.js';
import type { PrestigeState } from '../prestige/types';
import { calculateStartingCurds, calculateStartingGenerators } from '../../../systems/productionEngine';

export interface ProductionResetState {
  curds: Decimal;
  whey: Decimal;
  totalCurdsEarned: Decimal;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  curdPerClick: Decimal;
  curdPerSecond: Decimal;
}

export function createInitialProductionState(): ProductionResetState {
  return {
    curds: new Decimal(0),
    whey: new Decimal(0),
    totalCurdsEarned: new Decimal(0),
    totalClicks: 0,
    generators: {},
    upgrades: [],
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),
  };
}

export function createPrestigeProductionState(
  prestige: PrestigeState
): ProductionResetState {
  return {
    curds: calculateStartingCurds(prestige),
    whey: new Decimal(0),
    totalCurdsEarned: new Decimal(0),
    totalClicks: 0,
    generators: calculateStartingGenerators(prestige),
    upgrades: [],
    curdPerClick: new Decimal(1),
    curdPerSecond: new Decimal(0),
  };
}
```

#### 2. Add Published Action for Production Reset

**File**: `src/stores/slices/production/productionSlice.ts`
**Changes**: Add reset action

```typescript
import { createPrestigeProductionState } from './resetFactory';

// Add to ProductionSlice actions
getPrestigeProductionReset: () => {
  return createPrestigeProductionState(get().prestige);
},
```

#### 3. Update prestigeSlice to Delegate Production Reset

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Changes**: Use factory instead of inline reset

```typescript
// BEFORE (lines 77-86):
set({
  // Production reset (inline)
  curds: startingCurds,
  whey: new Decimal(0),
  totalCurdsEarned: new Decimal(0),
  totalClicks: 0,
  generators: startingGenerators,
  upgrades: [],
  curdPerClick: new Decimal(1),
  curdPerSecond: new Decimal(0),
  // ...
});

// AFTER:
const productionReset = state.getPrestigeProductionReset();

set({
  // Production reset - DELEGATED to production slice
  ...productionReset,
  
  // Combat reset - DELEGATED to combat slice
  combat: combatReset,
  
  // Crafting reset - DELEGATED to crafting slice
  crafting: craftingReset,
  // ...
});
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `grep -n "new Decimal(0)" src/stores/slices/prestige/prestigeSlice.ts` returns fewer matches (uses productionReset factory)

#### Manual Verification:
- [ ] Perform aging prestige, production state resets correctly
- [ ] Starting curds bonus from prestige upgrades applies

---

## Testing Strategy

### Unit Tests:

1. **Event dispatcher**:
   - Subscribe/unsubscribe lifecycle
   - Multi-subscriber support
   - Type safety with discriminated unions

2. **Migration ladder**:
   - Each migration transforms data correctly
   - Version sequence is complete (no gaps)

3. **Slice persistence modules**:
   - Round-trip serialize/deserialize preserves data
   - Missing fields use defaults

### Integration Tests:

1. **Cross-context flows**:
   - Battle won → rewards distributed via event
   - Achievement unlocked → UI notified via event
   - CPS recalculation triggered by any input change

2. **Event lifecycle**:
   - Fresh game activates seasonal events
   - Events deactivate when date range ends

### Manual Testing Steps:

1. Win a battle, verify all rewards (curds, whey, XP) are correct
2. Level up a hero, verify dialogue appears
3. Unlock an achievement, verify toast appears
4. Complete cheese crafting, verify notification appears
5. Buy generator/upgrade, verify CPS updates
6. Perform prestige, verify all state resets correctly
7. Save/load game, verify all state persists
8. Load old save file, verify migrations run
9. Start fresh game during seasonal event, verify event is active
10. Change system date past event end, reload, verify event inactive

---

## Performance Considerations

- **Synchronous events**: No batching overhead; events dispatch immediately
- **Event handlers**: Should be fast (no async work in handlers)
- **CpsInputsChanged frequency**: May fire multiple times per frame during bulk operations; consider debouncing if performance issues arise
- **Event check interval**: Hourly is sufficient for date-based events; no per-tick overhead

---

## Migration Notes

- **SAVE_VERSION**: Bump from 7 to 8
- **No data migration required**: Phase 6 is purely structural
- **Backwards compatibility**: Old saves (v1-7) migrate via ladder
- **Breaking changes**: None for players; internal API changes only

---

## References

- DDD Roadmap: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Phase 5 aggregates: `src/domain/aggregates/Battle.ts`, `src/domain/aggregates/Party.ts`
- Existing resetFactory pattern: `src/stores/slices/combat/resetFactory.ts`, `src/stores/slices/crafting/resetFactory.ts`
- Existing callback pattern: `src/stores/slices/crafting/craftingSlice.ts:36-48`
- Glossary: `docs/GLOSSARY.md`

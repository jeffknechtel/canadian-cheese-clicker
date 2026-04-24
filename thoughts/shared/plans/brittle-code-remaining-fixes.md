# Brittle Code Remaining Fixes - Implementation Plan

## Overview

This plan addresses the remaining issues identified in the DDD brittle code analysis (`thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`) that have not yet been implemented. After the god-object store refactor, anemic domain model refactor, and ubiquitous language standardization, four issues remain.

## Current State Analysis

**Already Fixed (no action needed):**
- Eh Multiplier bug - now wired into CPS via `cpsCalculator.ts:25`
- Boss Reward Multipliers - all 16 bosses now have entries at `combatEngine.ts:947-967`
- CPS recalculation duplication - centralized in `computeCps()` at `cpsCalculator.ts`
- Magic numbers for generators - `GENERATOR_COST_MULTIPLIER` used throughout

**Still Broken:**

| Issue | Severity | Effort | Description |
|-------|----------|--------|-------------|
| Taunt Mechanic | Medium | Medium | Status effect applied but enemy targeting ignores it |
| tickCrafting No-Op | Low | Low | Function called every tick but does nothing |
| Events Auto-Activation | Medium | Medium | All 4 seasonal events `isActive: false` with no date logic |
| Combat Constants Not Centralized | Low | Low | ATB_MAX etc. exported from combatEngine, not constants.ts |

### Key Discoveries:

- Taunt applies status effect at `combatEngine.ts:1278` but `selectHeroTarget()` at lines 144-159 only supports `random`, `lowest_hp`, `highest_hp` - no taunt logic
- `tickCrafting` at `craftingSlice.ts:291-295` contains only comments
- Events at `events.ts:8-75` all have `isActive: false` with no date fields in the type
- Combat constants like `ATB_MAX` are exported from `combatEngine.ts:26` rather than centralized in `constants.ts`

## Desired End State

After implementing this plan:

1. **Taunt works**: Heroes with taunt abilities (Maple Knight, Covered Bridge Guardian, Vimy Guardian) successfully draw enemy attacks
2. **tickCrafting functional**: Crafting jobs can have time-based modifiers applied during their progress
3. **Events auto-activate**: Seasonal events (Canada Day, Poutine Week, etc.) activate based on calendar dates
4. **All constants centralized**: Combat constants moved to `src/data/constants.ts`

### Verification:
- `npm run typecheck` passes
- `npm run build` passes  
- Manual testing confirms taunt redirects enemy attacks
- Manual testing confirms events activate on appropriate dates

## What We're NOT Doing

- Adding new taunt abilities beyond fixing existing ones
- Adding new seasonal events
- Implementing Vintage/Legacy prestige tiers (separate scope)
- Performance optimization
- Adding tests (separate scope)

---

## Phase 1: Fix Taunt Mechanic

### Overview

Implement taunt priority in enemy target selection so heroes with taunt status effects are targeted preferentially.

### Changes Required:

#### 1. Add Taunt Marker to StatusEffect Type

**File**: `src/types/game.ts`
**Location**: StatusEffect interface (~line 303-310)

```typescript
// BEFORE:
export interface StatusEffect {
  id: string;
  type: 'buff' | 'debuff';
  stat: keyof HeroStats | 'damageOverTime' | 'healOverTime';
  value: number;
  duration: number;
  source: string;
}

// AFTER:
export interface StatusEffect {
  id: string;
  type: 'buff' | 'debuff';
  stat: keyof HeroStats | 'damageOverTime' | 'healOverTime' | 'taunt';
  value: number;
  duration: number;
  source: string;
}
```

#### 2. Update Taunt Effect Application

**File**: `src/systems/combatEngine.ts`
**Location**: ~line 1266-1289 (case 'taunt')

```typescript
// BEFORE:
case 'taunt': {
  const self = targetHeroStates[source.heroId];
  if (self) {
    const statusEffect: StatusEffect = {
      id: `taunt_${Date.now()}`,
      type: 'buff',
      stat: 'defense', // Taunt uses defense stat as placeholder
      value: 0,
      duration: effect.duration,
      source: source.heroId,
    };
    self.statusEffects.push(statusEffect);
    // ...
  }
}

// AFTER:
case 'taunt': {
  const self = targetHeroStates[source.heroId];
  if (self) {
    const statusEffect: StatusEffect = {
      id: `taunt_${Date.now()}`,
      type: 'buff',
      stat: 'taunt', // Proper taunt marker
      value: 1, // Indicates active taunt
      duration: effect.duration,
      source: source.heroId,
    };
    self.statusEffects.push(statusEffect);
    // ...
  }
}
```

#### 3. Update selectHeroTarget to Respect Taunt

**File**: `src/systems/combatEngine.ts`
**Location**: ~line 144-159

```typescript
// BEFORE:
export function selectHeroTarget(
  heroStates: Record<string, HeroCombatState>,
  targetType: 'random' | 'lowest_hp' | 'highest_hp' = 'random'
): HeroCombatState | null {
  const aliveHeroes = Object.values(heroStates).filter((h) => h.isAlive);
  if (aliveHeroes.length === 0) return null;

  switch (targetType) {
    case 'lowest_hp':
      return aliveHeroes.reduce((min, h) => (h.currentHp < min.currentHp ? h : min));
    case 'highest_hp':
      return aliveHeroes.reduce((max, h) => (h.currentHp > max.currentHp ? h : max));
    case 'random':
    default:
      return aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
  }
}

// AFTER:
export function selectHeroTarget(
  heroStates: Record<string, HeroCombatState>,
  targetType: 'random' | 'lowest_hp' | 'highest_hp' = 'random'
): HeroCombatState | null {
  const aliveHeroes = Object.values(heroStates).filter((h) => h.isAlive);
  if (aliveHeroes.length === 0) return null;

  // Check for heroes with active taunt - they take priority
  const tauntingHeroes = aliveHeroes.filter((h) =>
    h.statusEffects.some((e) => e.stat === 'taunt' && e.value > 0)
  );
  
  if (tauntingHeroes.length > 0) {
    // If multiple heroes have taunt, pick randomly among them
    return tauntingHeroes[Math.floor(Math.random() * tauntingHeroes.length)];
  }

  // Fall back to normal targeting
  switch (targetType) {
    case 'lowest_hp':
      return aliveHeroes.reduce((min, h) => (h.currentHp < min.currentHp ? h : min));
    case 'highest_hp':
      return aliveHeroes.reduce((max, h) => (h.currentHp > max.currentHp ? h : max));
    case 'random':
    default:
      return aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] Grep for `stat: 'defense'` in taunt case returns 0: `grep -A5 "case 'taunt'" src/systems/combatEngine.ts`

#### Manual Verification:
- [ ] Maple Knight's "Sorry Shield" redirects enemy attacks for 5 seconds
- [ ] Covered Bridge Guardian's "Haunted Bulwark" redirects attacks for 5 seconds
- [ ] Vimy Guardian's "Ridge of Sacrifice" redirects attacks for 4 seconds
- [ ] Multiple taunt effects pick randomly between taunting heroes

---

## Phase 2: Implement tickCrafting Functionality

### Overview

Make `tickCrafting` functional so crafting jobs can be monitored for completion notifications and future time-based modifiers.

### Changes Required:

#### 1. Add Notification Tracking to CraftingJob

**File**: `src/types/game.ts`
**Location**: CraftingJob interface

```typescript
// BEFORE (if exists, otherwise add to CraftingJob):
export interface CraftingJob {
  id: string;
  recipeId: string;
  startTime: number;
  endTime: number;
  caveId: string;
  interactions: CraftingInteraction[];
}

// AFTER:
export interface CraftingJob {
  id: string;
  recipeId: string;
  startTime: number;
  endTime: number;
  caveId: string;
  interactions: CraftingInteraction[];
  notificationSent: boolean; // Track if completion notification was sent
}
```

#### 2. Update startCrafting to Initialize Notification Flag

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Location**: startCrafting action

Add `notificationSent: false` to new CraftingJob creation.

#### 3. Implement tickCrafting Logic

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Location**: ~line 291-295

```typescript
// BEFORE:
tickCrafting: (_deltaMs: number) => {
  // Jobs stay in activeJobs until collected
  // This could be used for progress notifications in the future
},

// AFTER:
tickCrafting: (_deltaMs: number) => {
  const state = get();
  const now = Date.now();
  
  // Find jobs that just completed but haven't been notified
  const newlyCompleted = state.crafting.activeJobs.filter(
    (job) => now >= job.endTime && !job.notificationSent
  );

  if (newlyCompleted.length === 0) return;

  // Mark jobs as notified
  set((s) => ({
    crafting: {
      ...s.crafting,
      activeJobs: s.crafting.activeJobs.map((job) =>
        newlyCompleted.some((c) => c.id === job.id)
          ? { ...job, notificationSent: true }
          : job
      ),
    },
  }));

  // Trigger notifications for completed jobs
  for (const job of newlyCompleted) {
    const recipe = recipeRegistry.get(job.recipeId);
    if (recipe && state.craftingCompletionCallback) {
      state.craftingCompletionCallback(recipe.name, job.id);
    }
  }
},
```

#### 4. Add Callback Registration

**File**: `src/stores/slices/crafting/types.ts`

Add to CraftingSlice type:
```typescript
craftingCompletionCallback: ((cheeseName: string, jobId: string) => void) | null;
setCraftingCompletionCallback: (callback: ((cheeseName: string, jobId: string) => void) | null) => void;
```

**File**: `src/stores/slices/crafting/craftingSlice.ts`

Add state and action:
```typescript
craftingCompletionCallback: null,

setCraftingCompletionCallback: (callback) => {
  set({ craftingCompletionCallback: callback });
},
```

#### 5. Add Save Migration

**File**: `src/systems/saveSystem.ts`

In the migration logic, add `notificationSent: true` to existing jobs so they don't spam notifications on load.

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

#### Manual Verification:
- [ ] When crafting job completes, a notification appears (if callback registered)
- [ ] Loading old save doesn't trigger notifications for already-complete jobs

---

## Phase 3: Implement Seasonal Events Auto-Activation

### Overview

Add date-based auto-activation for the 4 seasonal events based on calendar dates.

### Changes Required:

#### 1. Add Date Fields to GameEvent Type

**File**: `src/types/game.ts`
**Location**: GameEvent interface

```typescript
// BEFORE:
export interface GameEvent {
  id: string;
  name: string;
  description: string;
  bonuses: EventBonus[];
  isActive: boolean;
  icon: string;
}

// AFTER:
export interface GameEvent {
  id: string;
  name: string;
  description: string;
  bonuses: EventBonus[];
  isActive: boolean;
  icon: string;
  // Date range for auto-activation (month/day)
  startMonth?: number; // 1-12
  startDay?: number;   // 1-31
  endMonth?: number;   // 1-12
  endDay?: number;     // 1-31
}
```

#### 2. Update Event Definitions with Date Ranges

**File**: `src/data/events.ts`

```typescript
// Update each event with appropriate dates:

export const EVENTS: GameEvent[] = [
  {
    id: 'canada-day',
    name: 'Canada Day Celebration',
    // ... existing fields ...
    isActive: false,
    startMonth: 6, startDay: 25,  // June 25
    endMonth: 7, endDay: 7,       // July 7 (week around Canada Day)
  },
  {
    id: 'poutine-week',
    name: 'La Semaine de la Poutine',
    // ... existing fields ...
    isActive: false,
    startMonth: 2, startDay: 1,   // February 1
    endMonth: 2, endDay: 7,       // February 7
  },
  {
    id: 'hockey-season',
    name: 'Hockey Season Opener',
    // ... existing fields ...
    isActive: false,
    startMonth: 10, startDay: 1,  // October 1
    endMonth: 10, endDay: 15,     // October 15
  },
  {
    id: 'winterlude',
    name: 'Winterlude Festival',
    // ... existing fields ...
    isActive: false,
    startMonth: 2, startDay: 1,   // February 1
    endMonth: 2, endDay: 21,      // February 21 (3 weeks in February)
  },
];
```

#### 3. Add isEventInDateRange Helper

**File**: `src/data/events.ts`

```typescript
/**
 * Check if an event should be active based on current date.
 */
export function isEventInDateRange(event: GameEvent, currentDate: Date = new Date()): boolean {
  if (!event.startMonth || !event.startDay || !event.endMonth || !event.endDay) {
    return false; // No date range defined
  }

  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();        // 1-31

  // Handle year-wrapping (e.g., Dec 25 - Jan 5)
  const startDayOfYear = event.startMonth * 100 + event.startDay;
  const endDayOfYear = event.endMonth * 100 + event.endDay;
  const currentDayOfYear = currentMonth * 100 + currentDay;

  if (startDayOfYear <= endDayOfYear) {
    // Normal range (doesn't wrap year)
    return currentDayOfYear >= startDayOfYear && currentDayOfYear <= endDayOfYear;
  } else {
    // Year-wrapping range (e.g., Dec 25 - Jan 5)
    return currentDayOfYear >= startDayOfYear || currentDayOfYear <= endDayOfYear;
  }
}

/**
 * Get all events that should be active based on current date.
 */
export function getAutoActiveEventIds(currentDate: Date = new Date()): string[] {
  return EVENTS
    .filter((event) => isEventInDateRange(event, currentDate))
    .map((event) => event.id);
}
```

#### 4. Update Events Slice to Check Auto-Activation

**File**: `src/stores/slices/events/eventSlice.ts`

Add a `checkEventActivation` action that can be called on game load and periodically:

```typescript
checkEventActivation: () => {
  const autoActiveIds = getAutoActiveEventIds();
  const currentIds = get().activeEventIds;
  
  // Only update if different to avoid unnecessary re-renders
  const newIds = [...new Set([...currentIds, ...autoActiveIds])];
  if (newIds.length !== currentIds.length || !newIds.every((id) => currentIds.includes(id))) {
    set({ activeEventIds: newIds });
  }
},
```

#### 5. Call checkEventActivation on Game Load

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

After loading game state, call `get().checkEventActivation()`.

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` passes

#### Manual Verification:
- [ ] Set system date to July 1 - Canada Day event activates
- [ ] Set system date to February 5 - Poutine Week and Winterlude events activate
- [ ] Set system date to October 10 - Hockey Season event activates
- [ ] Event bonuses apply when event is auto-activated

---

## Phase 4: Centralize Combat Constants

### Overview

Move combat constants from `combatEngine.ts` to `src/data/constants.ts` for consistency with other game constants.

### Changes Required:

#### 1. Move Constants to constants.ts

**File**: `src/data/constants.ts`

Add at the end of the file:

```typescript
// ===== Combat Balance =====

/** Maximum ATB gauge value */
export const ATB_MAX = 100;

/** Base ATB fill rate per tick */
export const BASE_ATB_RATE = 10;

/** Maximum limit break gauge value */
export const LIMIT_BREAK_MAX = 100;

/** Limit break gain from dealing damage (% of damage) */
export const LIMIT_BREAK_GAIN_FROM_DEALT = 0.01;

/** Limit break gain from taking damage (% of damage) */
export const LIMIT_BREAK_GAIN_FROM_TAKEN = 0.05;

/** HP percentage threshold for "low health" (red) */
export const HP_LOW_THRESHOLD = 25;

/** HP percentage threshold for "medium health" (yellow) */
export const HP_MEDIUM_THRESHOLD = 50;

/** Defense formula divisor: damage = attack * (1 - defense / (defense + DEFENSE_DIVISOR)) */
export const DEFENSE_DIVISOR = 100;

/** Minimum damage variance multiplier */
export const DAMAGE_VARIANCE_MIN = 0.9;

/** Maximum damage variance multiplier */
export const DAMAGE_VARIANCE_MAX = 1.1;

/** Random ATB start variance for enemies (0 to this value) */
export const INITIAL_ATB_VARIANCE = 20;

/** Boss HP recovery on phase transition (% of max HP) */
export const BOSS_PHASE_HEAL_PERCENT = 0.10;
```

#### 2. Update combatEngine.ts Imports

**File**: `src/systems/combatEngine.ts`

Replace local constant definitions with imports:

```typescript
// BEFORE:
export const ATB_MAX = 100;
export const BASE_ATB_RATE = 10;
export const LIMIT_BREAK_MAX = 100;
// ... etc

// AFTER:
import {
  ATB_MAX,
  BASE_ATB_RATE,
  LIMIT_BREAK_MAX,
  LIMIT_BREAK_GAIN_FROM_DEALT,
  LIMIT_BREAK_GAIN_FROM_TAKEN,
  DEFENSE_DIVISOR,
  DAMAGE_VARIANCE_MIN,
  DAMAGE_VARIANCE_MAX,
  INITIAL_ATB_VARIANCE,
  BOSS_PHASE_HEAL_PERCENT,
} from '../data/constants';

// Re-export for backwards compatibility with UI components
export {
  ATB_MAX,
  BASE_ATB_RATE,
  LIMIT_BREAK_MAX,
  LIMIT_BREAK_GAIN_FROM_DEALT,
  LIMIT_BREAK_GAIN_FROM_TAKEN,
};
```

#### 3. Update UI Components to Import from constants.ts

**Files to update** (optional - can keep importing from combatEngine.ts via re-exports):
- `src/components/ui/CombatPanel.tsx`
- `src/components/ui/EnemyDisplay.tsx`
- `src/components/ui/HeroAbilityButton.tsx`
- `src/components/ui/CombatATBBar.tsx`
- `src/hooks/useKeyboardShortcuts.ts`

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] `grep "^const ATB_MAX" src/systems/combatEngine.ts` returns 0 matches
- [x] `grep "ATB_MAX" src/data/constants.ts` returns 1+ matches

#### Manual Verification:
- [ ] Combat functions identically to before
- [ ] ATB bars fill and trigger at correct threshold

---

## Testing Strategy

### Unit Tests:
- Test `selectHeroTarget` with taunt status effects
- Test `isEventInDateRange` with various date combinations including year-wrapping
- Test `tickCrafting` notification logic

### Integration Tests:
- Full combat flow with taunt hero in party
- Game load with auto-activation of in-range events
- Crafting flow with completion notifications

### Manual Testing Steps:
1. **Taunt**: Put Maple Knight in party, enter combat, use Sorry Shield, verify enemies attack Maple Knight
2. **tickCrafting**: Start a short crafting job, wait for completion, verify notification appears
3. **Events**: Change system date to July 1, start game, verify Canada Day event is active and bonuses apply
4. **Constants**: Run full combat, verify no behavioral changes

---

## Performance Considerations

- **Taunt check**: O(n) filter on status effects, negligible for 4 heroes
- **tickCrafting**: Only processes when jobs complete, not every tick
- **Event check**: Only runs on game load, not every tick

---

## Migration Notes

- **Save file migration** for tickCrafting: Add `notificationSent: true` to existing jobs
- **No migration needed** for events (new feature, additive)
- **No migration needed** for taunt (status effect format change is backwards compatible)
- **No migration needed** for constants (code refactor only)

---

## References

- Research document: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Taunt code: `src/systems/combatEngine.ts:1266-1289`
- tickCrafting: `src/stores/slices/crafting/craftingSlice.ts:291-295`
- Events data: `src/data/events.ts:8-75`
- Constants file: `src/data/constants.ts`

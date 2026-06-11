# Tier 1: Golden Cheese Events Implementation Plan

## Overview

Implement a "Golden Cheese Wheel" random reward system inspired by Cookie Clicker's Golden Cookies. A golden cheese wheel randomly appears in the 3D scene every 3-10 minutes, lingers for 15 seconds with a pulsing golden glow and audio cue, then fades away. Clicking it grants one of six randomly weighted bonuses (production frenzy, instant curds, click storm, free ingredient, hero XP boost, or a rare mega-multiplier).

This is the **single highest-impact engagement feature** — the game currently has **zero stochastic reward events**, making sessions entirely predictable. Variable ratio reinforcement (the slot machine principle) is the #1 engagement driver in successful clicker games.

## Current State Analysis

**Last verified**: 2026-06-10 against commit d94fafa

**Existing infrastructure in the slice architecture:**

| System | Location | Status |
|--------|----------|--------|
| Buff system | `src/stores/slices/crafting/craftingSlice.ts:458` (`tickBuffs`) | Ready to use |
| Active buffs state | `crafting.activeBuffs: CheeseActiveBuff[]` | Ready to use |
| Buff multiplier consumption | `getActiveBuffMultipliers()` in craftingSlice | Ready to use |
| Game loop | `src/systems/gameLoop.ts:55-63` | Add `tickGoldenCheese` call |
| Store slices | `src/stores/slices/` (8 slices) | Add new `goldenCheese` slice |
| Particle system | `src/systems/particleSystem.ts:101` (`goldenSparkles` preset) | Ready to use |
| Audio system | `src/systems/audioSystem.ts` (Web Audio API) | Add new sounds |
| 3D scene | `src/components/game/GameScene.tsx` | Add `GoldenCheeseWheel` mesh |
| Click handling | `src/components/game/CheeseWheel.tsx` | Pattern to follow |

**What's missing:**
- No golden cheese state/slice
- No golden cheese 3D mesh component
- No golden cheese audio cues
- No `tickGoldenCheese()` in the game loop
- No reward type definitions or weighted random selection

## Desired End State

A golden cheese wheel appears randomly in the 3D scene, visible with a pulsing gold glow and accompanied by a distinct audio shimmer. Players who click it within 15 seconds receive one of six weighted random rewards:

| Event | Weight | Effect |
|-------|--------|--------|
| Cheese Frenzy | 40% | 7x CPS for 77 seconds |
| Lucky Curds | 25% | Instant 15 min CPS grant |
| Click Storm | 15% | 77x click value for 13 seconds |
| Rare Ingredient | 10% | Free specialty crafting ingredient |
| Hero Rally | 7% | 5x XP for 60 seconds |
| Curd Tsunami | 3% | 777x CPS for 7 seconds |

Timed rewards appear in the existing `ActiveBuffsBar`. A lifetime counter tracks total golden cheeses collected (for future achievements). The system gracefully handles tab visibility changes and prestige resets.

### Verification Checklist:

1. Golden cheese appears within 3-10 minutes of gameplay
2. It disappears after 15 seconds if not clicked
3. Clicking triggers collection fanfare, particle burst, and applies the reward
4. Timed buffs (Cheese Frenzy, Click Storm, Hero Rally, Curd Tsunami) appear in `ActiveBuffsBar`
5. Instant rewards (Lucky Curds, Rare Ingredient) apply immediately
6. A new golden cheese timer starts after collection or expiry
7. System survives prestige reset, save/load, and tab hide/show

### Key Discoveries:

- `CheeseActiveBuff.sourceCheeseId` (game.ts:595) supports a sentinel value `"golden_cheese"` for non-crafted buffs
- `CheeseEffect` type (game.ts:523-527) covers `production_boost`, `click_boost`, `xp_boost` — three reward types use these directly
- Buff multipliers already consumed in `computeCps()` and `computeClickValue()` via `getActiveBuffMultipliers()` — no production engine changes needed
- Game loop caps delta at 100ms (gameLoop.ts:46), preventing wild timer jumps
- `resumeGameLoop()` resets `accumulatedGameLogicTime` (gameLoop.ts:128), so golden cheese timer must be timestamp-based

## What We're NOT Doing

- No golden cheese achievements (future work)
- No golden cheese interaction with synergy upgrades (deferred)
- No golden cheese during combat (would be distracting)
- No offline golden cheese accumulation (requires active presence)
- No golden cheese settings/toggle (keep it simple)
- No Canadian-themed flavor text (nice-to-have, can be added later)

## Implementation Approach

Four phases, each independently testable:

1. **Types & Slice** — Define data model, create `goldenCheese` slice
2. **Core Logic** — Timer, spawn, reward calculation, game loop integration
3. **Visuals & Audio** — 3D mesh, particles, sound effects
4. **UI Polish** — Reward notifications, buff labels, expiry warning

---

## Phase 1: Types and Slice Foundation

### Overview

Define TypeScript types for golden cheese rewards, create a new `goldenCheese` slice following the established slice pattern, and integrate it into the store composition.

### Changes Required:

#### 1. Golden Cheese Types

**File**: `src/types/game.ts`
**Changes**: Add golden cheese types after `CheeseActiveBuff` interface (~line 596).

```typescript
// ===== Golden Cheese Event Types =====

export type GoldenCheeseRewardType =
  | 'cheeseFrenzy'      // 7x CPS for 77 seconds
  | 'luckyCurds'        // Instant 15 min CPS grant
  | 'clickStorm'        // 77x click for 13 seconds
  | 'rareIngredient'    // Free crafting ingredient
  | 'heroRally'         // 5x XP for 60 seconds
  | 'curdTsunami';      // 777x CPS for 7 seconds

export interface GoldenCheeseReward {
  type: GoldenCheeseRewardType;
  weight: number;
}

export interface GoldenCheeseState {
  nextSpawnAt: number;       // Timestamp when next golden cheese appears (0 = not scheduled)
  isVisible: boolean;        // Whether golden cheese is currently showing
  expiresAt: number;         // Timestamp when visible golden cheese disappears (0 = N/A)
  currentReward: GoldenCheeseRewardType | null; // Pre-rolled reward for current visible cheese
  totalCollected: number;    // Lifetime counter (persists across prestige)
}
```

#### 2. Golden Cheese Slice Types

**File**: `src/stores/slices/goldenCheese/types.ts` (new file)

```typescript
import type { GoldenCheeseState, GoldenCheeseRewardType } from '../../../types/game';

export interface GoldenCheeseSliceState {
  goldenCheese: GoldenCheeseState;
}

export interface GoldenCheeseSliceActions {
  tickGoldenCheese: (deltaMs: number) => void;
  collectGoldenCheese: () => GoldenCheeseRewardType | null;
  scheduleNextGoldenCheese: () => void;
  resetGoldenCheeseOnPrestige: () => void;
}

export type GoldenCheeseSlice = GoldenCheeseSliceState & GoldenCheeseSliceActions;
```

#### 3. Golden Cheese Slice Implementation

**File**: `src/stores/slices/goldenCheese/goldenCheeseSlice.ts` (new file)

```typescript
import type { SliceCreator } from '../../types';
import type { GoldenCheeseSlice } from './types';
import {
  getRandomSpawnDelay,
  rollReward,
  applyReward,
  VISIBLE_DURATION_MS,
} from '../../../systems/goldenCheeseSystem';

const createInitialGoldenCheeseState = () => ({
  nextSpawnAt: 0,
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: 0,
});

export const createGoldenCheeseSlice: SliceCreator<GoldenCheeseSlice> = (set, get) => ({
  goldenCheese: createInitialGoldenCheeseState(),

  scheduleNextGoldenCheese: () => {
    set({
      goldenCheese: {
        ...get().goldenCheese,
        nextSpawnAt: Date.now() + getRandomSpawnDelay(),
      },
    });
  },

  tickGoldenCheese: (_deltaMs: number) => {
    const now = Date.now();
    const gc = get().goldenCheese;

    // First tick: schedule if not yet scheduled
    if (gc.nextSpawnAt === 0 && !gc.isVisible) {
      get().scheduleNextGoldenCheese();
      return;
    }

    // Check if it's time to spawn
    if (!gc.isVisible && gc.nextSpawnAt > 0 && now >= gc.nextSpawnAt) {
      const reward = rollReward();
      set({
        goldenCheese: {
          ...gc,
          isVisible: true,
          expiresAt: now + VISIBLE_DURATION_MS,
          currentReward: reward,
          nextSpawnAt: 0,
        },
      });
      return;
    }

    // Check if visible golden cheese has expired
    if (gc.isVisible && now >= gc.expiresAt) {
      set({
        goldenCheese: {
          ...gc,
          isVisible: false,
          expiresAt: 0,
          currentReward: null,
        },
      });
      get().scheduleNextGoldenCheese();
    }
  },

  collectGoldenCheese: () => {
    const gc = get().goldenCheese;
    if (!gc.isVisible || !gc.currentReward) return null;

    const rewardType = gc.currentReward;
    applyReward(rewardType, get);

    set({
      goldenCheese: {
        ...gc,
        isVisible: false,
        expiresAt: 0,
        currentReward: null,
        totalCollected: gc.totalCollected + 1,
      },
    });

    get().scheduleNextGoldenCheese();
    return rewardType;
  },

  resetGoldenCheeseOnPrestige: () => {
    const totalCollected = get().goldenCheese.totalCollected;
    set({
      goldenCheese: {
        ...createInitialGoldenCheeseState(),
        totalCollected, // Preserve lifetime count
      },
    });
  },
});
```

#### 4. Slice Index Export

**File**: `src/stores/slices/goldenCheese/index.ts` (new file)

```typescript
export { createGoldenCheeseSlice } from './goldenCheeseSlice';
export type { GoldenCheeseSlice, GoldenCheeseSliceState, GoldenCheeseSliceActions } from './types';
```

#### 5. Store Composition

**File**: `src/stores/index.ts`
**Changes**: Import and compose the new slice.

Add import:
```typescript
import { createGoldenCheeseSlice } from './slices/goldenCheese';
```

Add to store creation (in the `create()` call, alongside other slices):
```typescript
...createGoldenCheeseSlice(set, get, api),
```

#### 6. Store Types

**File**: `src/stores/types.ts`
**Changes**: Add `GoldenCheeseSlice` to the store type composition.

Add import:
```typescript
import type { GoldenCheeseSlice } from './slices/goldenCheese';
```

Add to `GameStore` type:
```typescript
export type GameStore = ProductionSlice &
  HeroSlice &
  CombatSlice &
  CraftingSlice &
  PrestigeSlice &
  AchievementSlice &
  EventSlice &
  PersistenceSlice &
  GoldenCheeseSlice;  // NEW
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [x] No runtime errors on game load
- [x] `useGameStore.getState().goldenCheese` returns valid initial state in console

---

## Phase 2: Core Logic — Timer, Spawning, Rewards

### Overview

Implement the golden cheese system module with spawn timing, reward selection, and reward application. Integrate with the game loop. After this phase, golden cheese events function but are invisible (testable via console).

### Changes Required:

#### 1. Golden Cheese System Module

**File**: `src/systems/goldenCheeseSystem.ts` (new file)

```typescript
import Decimal from 'decimal.js';
import type { GoldenCheeseReward, GoldenCheeseRewardType, CheeseActiveBuff } from '../types/game';
import type { GameStore } from '../stores/types';
import { SPECIALTY_INGREDIENTS } from '../data/ingredients';

// ===== Constants =====
export const MIN_SPAWN_DELAY_MS = 3 * 60 * 1000;  // 3 minutes
export const MAX_SPAWN_DELAY_MS = 10 * 60 * 1000; // 10 minutes
export const VISIBLE_DURATION_MS = 15 * 1000;      // 15 seconds

// Reward durations
const CHEESE_FRENZY_DURATION_MS = 77 * 1000;
const CLICK_STORM_DURATION_MS = 13 * 1000;
const HERO_RALLY_DURATION_MS = 60 * 1000;
const CURD_TSUNAMI_DURATION_MS = 7 * 1000;

// Reward multipliers
const CHEESE_FRENZY_MULTIPLIER = 7;
const CLICK_STORM_MULTIPLIER = 77;
const HERO_RALLY_MULTIPLIER = 5;
const CURD_TSUNAMI_MULTIPLIER = 777;
const LUCKY_CURDS_MINUTES = 15;

// Reward weights (sum = 100 for easy probability reading)
const REWARD_TABLE: GoldenCheeseReward[] = [
  { type: 'cheeseFrenzy', weight: 40 },
  { type: 'luckyCurds', weight: 25 },
  { type: 'clickStorm', weight: 15 },
  { type: 'rareIngredient', weight: 10 },
  { type: 'heroRally', weight: 7 },
  { type: 'curdTsunami', weight: 3 },
];

const TOTAL_WEIGHT = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);

/** Returns a random delay between MIN and MAX spawn delay */
export function getRandomSpawnDelay(): number {
  return MIN_SPAWN_DELAY_MS + Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS);
}

/** Weighted random selection from REWARD_TABLE */
export function rollReward(): GoldenCheeseRewardType {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const reward of REWARD_TABLE) {
    roll -= reward.weight;
    if (roll <= 0) return reward.type;
  }
  return REWARD_TABLE[0].type; // Fallback
}

/** Create a golden cheese buff */
function createGoldenBuff(
  effect: 'production_boost' | 'click_boost' | 'xp_boost',
  multiplier: number,
  durationMs: number
): CheeseActiveBuff {
  const now = Date.now();
  return {
    id: `golden_${effect}_${now}`,
    effect: { type: effect, multiplier },
    startTime: now,
    endTime: now + durationMs,
    sourceCheeseId: 'golden_cheese',
  };
}

/** Apply the reward to the game state. Returns a description for notifications. */
export function applyReward(
  rewardType: GoldenCheeseRewardType,
  getState: () => GameStore
): { description: string; amount?: Decimal } {
  const state = getState();

  switch (rewardType) {
    case 'cheeseFrenzy': {
      const buff = createGoldenBuff('production_boost', CHEESE_FRENZY_MULTIPLIER, CHEESE_FRENZY_DURATION_MS);
      state.addBuff(buff);
      return { description: `Cheese Frenzy! ${CHEESE_FRENZY_MULTIPLIER}x CPS for 77s` };
    }

    case 'luckyCurds': {
      const amount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
      state.addCurds(amount);
      return { description: `Lucky Curds! +${amount.toFixed(0)} curds`, amount };
    }

    case 'clickStorm': {
      const buff = createGoldenBuff('click_boost', CLICK_STORM_MULTIPLIER, CLICK_STORM_DURATION_MS);
      state.addBuff(buff);
      return { description: `Click Storm! ${CLICK_STORM_MULTIPLIER}x clicks for 13s` };
    }

    case 'rareIngredient': {
      // Grant a random specialty ingredient
      const unlockedIds = state.crafting.unlockedIngredients;
      const available = SPECIALTY_INGREDIENTS.filter((i) => !unlockedIds.includes(i.id));
      
      if (available.length > 0) {
        const ingredient = available[Math.floor(Math.random() * available.length)];
        state.unlockIngredient(ingredient.id);
        return { description: `Rare Find! Unlocked ${ingredient.name}` };
      }
      
      // Fallback: all ingredients unlocked, give curds instead
      const fallbackAmount = state.curdPerSecond.mul(LUCKY_CURDS_MINUTES * 60);
      state.addCurds(fallbackAmount);
      return { description: `Lucky Curds! +${fallbackAmount.toFixed(0)} curds`, amount: fallbackAmount };
    }

    case 'heroRally': {
      const buff = createGoldenBuff('xp_boost', HERO_RALLY_MULTIPLIER, HERO_RALLY_DURATION_MS);
      state.addBuff(buff);
      return { description: `Hero Rally! ${HERO_RALLY_MULTIPLIER}x XP for 60s` };
    }

    case 'curdTsunami': {
      const buff = createGoldenBuff('production_boost', CURD_TSUNAMI_MULTIPLIER, CURD_TSUNAMI_DURATION_MS);
      state.addBuff(buff);
      return { description: `CURD TSUNAMI! ${CURD_TSUNAMI_MULTIPLIER}x CPS for 7s` };
    }
  }
}

/** Get human-readable reward description for notifications */
export function getRewardDescription(rewardType: GoldenCheeseRewardType): string {
  const descriptions: Record<GoldenCheeseRewardType, string> = {
    cheeseFrenzy: 'Cheese Frenzy! 7x CPS for 77s',
    luckyCurds: 'Lucky Curds!',
    clickStorm: 'Click Storm! 77x clicks for 13s',
    rareIngredient: 'Rare Find!',
    heroRally: 'Hero Rally! 5x XP for 60s',
    curdTsunami: 'CURD TSUNAMI! 777x CPS for 7s',
  };
  return descriptions[rewardType];
}
```

#### 2. Add Buff Helper to Crafting Slice

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Add `addBuff` action for golden cheese (and future use).

Add to the slice actions:

```typescript
addBuff: (buff: CheeseActiveBuff) => {
  set((s) => ({
    crafting: {
      ...s.crafting,
      activeBuffs: [...s.crafting.activeBuffs, buff],
    },
  }));
},
```

Add to types file (`src/stores/slices/crafting/types.ts`):

```typescript
addBuff: (buff: CheeseActiveBuff) => void;
```

#### 3. Game Loop Integration

**File**: `src/systems/gameLoop.ts`
**Changes**: Add `tickGoldenCheese` call after `tickBuffs`.

```typescript
// After line 61 (store.tickBuffs):
store.tickGoldenCheese(gameLogicInterval);
```

#### 4. Save/Load Compatibility

**File**: `src/systems/saveSystem.ts`
**Changes**: Add golden cheese state to save/load with migration for old saves.

In the serialization logic, add `goldenCheese` to the saved fields.

In the deserialization logic, add default for missing field:

```typescript
goldenCheese: savedState.goldenCheese ?? {
  nextSpawnAt: 0,
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: 0,
},
```

#### 5. Prestige Integration

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Changes**: Call `resetGoldenCheeseOnPrestige()` in prestige reset handlers.

In the aging/vintage/legacy reset handlers, add:

```typescript
get().resetGoldenCheeseOnPrestige();
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [x] In console: `useGameStore.getState().goldenCheese` shows valid state
- [x] Manually set `nextSpawnAt` to `Date.now()` via devtools, observe `isVisible` becomes `true`
- [x] Call `useGameStore.getState().collectGoldenCheese()` returns a reward type
- [x] `crafting.activeBuffs` contains a golden cheese buff after collecting a buff-type reward
- [x] After 15 seconds without collection, `isVisible` returns to `false`
- [x] Save, reload page, verify `goldenCheese` state loads correctly
- [x] Prestige reset: `totalCollected` preserved, timer resets

---

## Phase 3: Visuals and Audio

### Overview

Create the golden cheese 3D mesh component with pulsing animation, add audio cues for appearance and collection, and trigger particle effects. After this phase, the feature is fully playable.

### Changes Required:

#### 1. Golden Cheese 3D Component

**File**: `src/components/game/GoldenCheeseWheel.tsx` (new file)

Key behavior:
- **Geometry**: `cylinderGeometry` at ~60% scale of main cheese
- **Material**: `meshStandardMaterial` with `color="#ffd700"`, high metalness, emissive pulsing
- **Position**: `[2.5, 1.5, 0]` — right of and above main cheese wheel
- **Animation** (`useFrame`):
  - Y-axis rotation: faster than main wheel
  - Vertical bob: `Math.sin(time * 2) * 0.15`
  - Pulsing emissive: `0.3 + Math.sin(time * 3) * 0.2`
  - Scale-in on appear (~300ms)
  - Scale-out/fade on expiry (last 3 seconds)
- **Click handler**: Calls `collectGoldenCheese()`, plays sound, emits particles
- **Hover**: Scale to 1.15, cursor pointer
- **Reduced motion**: Static display without animation

#### 2. Integrate into GameScene

**File**: `src/components/game/GameScene.tsx`
**Changes**: Render `GoldenCheeseWheel` when visible.

```tsx
const goldenCheeseVisible = useGameStore((s) => s.goldenCheese.isVisible);

// In render, after CheeseWheel:
{goldenCheeseVisible && <GoldenCheeseWheel />}
```

Trigger appear sound via `useEffect` on visibility change.

#### 3. Audio — Appear Chime

**File**: `src/systems/audioSystem.ts`
**Changes**: Add `playGoldenCheeseAppear()`.

Pattern: Sparkly ascending shimmer
- 4 sine oscillators: C5, E5, G5, C6 staggered by 80ms
- Quick attack/sustain/decay (~450ms total)
- Low volume (0.06 per oscillator)

#### 4. Audio — Collection Fanfare

**File**: `src/systems/audioSystem.ts`
**Changes**: Add `playGoldenCheeseCollect()`.

Pattern: Celebratory ascending arpeggio
- 5 oscillators: C5→E5→G5→C6→E6 quick arpeggio
- Sustained major chord finish
- ~700ms total, slightly louder

#### 5. Particle Effects

**File**: `src/components/game/GoldenCheeseWheel.tsx`
**Changes**: On collection, emit `goldenSparkles` + `confetti`.

```typescript
emitParticles(screenX, screenY, 'goldenSparkles');
setTimeout(() => emitParticles(screenX, screenY, 'confetti'), 100);
```

Also emit ambient sparkles while visible (~800ms interval).

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:

- [x] Golden cheese wheel appears at correct position in 3D scene
- [x] It pulses with golden glow and bobs up/down
- [x] Shimmer sound plays on appear
- [x] Hover changes cursor and scales mesh
- [x] Click plays fanfare, triggers particles, mesh disappears
- [x] Fade-out animation in last 3 seconds before expiry
- [x] Reduced motion: static display works

---

## Phase 4: UI Polish and Notification

### Overview

Add reward notification toast, differentiate golden cheese buffs in the ActiveBuffsBar, and add visual urgency in the last 3 seconds.

### Changes Required:

#### 1. Reward Notification

**File**: `src/components/game/GoldenCheeseWheel.tsx` (or new overlay component)
**Changes**: Show floating text notification on collection.

Display reward-specific text that fades over ~2 seconds:
- "Cheese Frenzy! 7x CPS for 77s"
- "Lucky Curds! +{amount} curds"
- etc.

#### 2. Buff Label Differentiation

**File**: `src/components/ui/crafting/ActiveBuffsBar.tsx`
**Changes**: Check `buff.sourceCheeseId === 'golden_cheese'` and show distinct styling.

- Icon: Star/golden indicator
- Label: Prefix "Golden:" (e.g., "Golden: 7x Prod")

#### 3. Expiry Warning Visual

**File**: `src/components/game/GoldenCheeseWheel.tsx`
**Changes**: In last 3 seconds:
- Increase pulse speed: `Math.sin(time * 8)`
- Fade opacity from 1.0 to 0.3

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `pnpm typecheck`
- [x] Linting passes: `pnpm lint`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:

- [x] Notification appears with correct reward text
- [x] Notification fades after ~2 seconds
- [x] Golden cheese buffs show distinct icon/label in ActiveBuffsBar
- [x] Golden cheese pulses faster and fades in last 3 seconds
- [x] Full end-to-end: spawn → appear animation/sound → click → notification/particles/sound → buff in bar → buff expires
- [x] No regressions to existing cheese crafting buffs

---

## Testing Strategy

### Manual Testing Workflow:

1. **Fast iteration**: Temporarily set spawn delays to 5-10 seconds during development
2. **Reward testing**: Call `collectGoldenCheese()` from console, or hardcode `rollReward()` return value
3. **Edge cases**:
   - Combat active while golden cheese visible (should still be clickable)
   - Prestige while visible (should disappear, timer resets)
   - Save/reload while visible (should restore or schedule new)
   - Tab hidden then shown (game loop paused, no wild jumps)

### Key Invariants:

- Exactly one golden cheese can be active at a time
- `totalCollected` only increments on collection (not expiry)
- Golden cheese buffs stack with regular buffs (same `activeBuffs` pipeline)
- `nextSpawnAt` is future timestamp when set, or 0 when cheese is visible

---

## Performance Considerations

- Golden cheese mesh is simple geometry with basic material — no performance concern
- Particle emissions are brief bursts, not continuous — acceptable
- Audio synthesis uses Web Audio API patterns already established — no concern
- Timer checks in game loop are O(1) timestamp comparisons — negligible

---

## Migration Notes

- New `goldenCheese` field in saved state with default fallback for old saves
- No data migration needed — fresh state is appropriate for existing players
- `totalCollected` starts at 0 for everyone

---

## References

- Original research: `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md`
- State of the art analysis: `thoughts/shared/research/2026-06-10_23-22-43_making-the-game-more-fun-state-of-the-art-analysis.md`
- Existing buff system: `src/stores/slices/crafting/craftingSlice.ts:458` (`tickBuffs`)
- Particle presets: `src/systems/particleSystem.ts:101` (`goldenSparkles`)
- Audio patterns: `src/systems/audioSystem.ts`
- 3D mesh pattern: `src/components/game/CheeseWheel.tsx`
- Game loop: `src/systems/gameLoop.ts:55-63`
- Store composition: `src/stores/index.ts`

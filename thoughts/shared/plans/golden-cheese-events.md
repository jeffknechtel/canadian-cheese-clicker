# Golden Cheese Events Implementation Plan

## Overview

Implement a "Golden Cheese Wheel" random reward system inspired by Cookie Clicker's Golden Cookies. A golden cheese wheel randomly appears in the 3D scene every 3-10 minutes, lingers for 15 seconds with a pulsing golden glow and audio cue, then fades away. Clicking it grants one of six randomly weighted bonuses (production frenzy, instant curds, click storm, free ingredient, hero XP boost, or a rare mega-multiplier).

This is the single highest-impact engagement feature identified in the research — the game currently has **zero stochastic reward events**, making sessions entirely predictable.

## Current State Analysis

**Existing infrastructure we will reuse:**

- **Buff system** (`crafting.activeBuffs` in gameStore): Already supports timed `production_boost`, `click_boost`, and `xp_boost` effects with automatic countdown and expiry via `tickBuffs()`. The `ActiveBuffsBar` component automatically renders any active buff. Golden cheese timed rewards will flow through this exact pipeline.
- **Particle system** (`particleSystem.ts`): `goldenSparkles` preset already defined (line 101) — 20 gold star particles that float upward. `confetti` preset (line 73) also available.
- **Audio system** (`audioSystem.ts`): All sounds are Web Audio API synthesized. Existing SFX functions like `playRennetGainSound()` (line 1668) and `playAchievementFanfare()` (line 1007) provide patterns for new golden chime sounds.
- **Game loop** (`gameLoop.ts`): 100ms game logic ticks at line 50-58. Four `store.tick*()` calls already exist — golden cheese timer is a fifth.
- **3D scene** (`GameScene.tsx`): React Three Fiber `<Canvas>` with `CheeseWheel` mesh component. Golden cheese will be a sibling `<mesh>` using the same `useFrame` + `onClick` pattern.
- **Click handling**: `CheeseWheel.tsx` uses `ThreeEvent<MouseEvent>` with `event.stopPropagation()` — golden cheese click handler follows same pattern.
- **`addCurds()`** (gameStore.ts:384): Direct method for instant curd rewards.

**What's missing:**

- No golden cheese state, timer, or spawn logic
- No golden cheese 3D mesh component
- No golden cheese audio cues
- No `tickGoldenCheese()` in the game loop
- No reward type definitions or weighted random selection

## Desired End State

A golden cheese wheel appears randomly in the 3D scene, visible with a pulsing gold glow and accompanied by a distinct audio shimmer. Players who click it within 15 seconds receive one of six weighted random rewards. Timed rewards appear in the existing `ActiveBuffsBar`. A lifetime counter tracks total golden cheeses collected (for future achievements). The system gracefully handles tab visibility changes and prestige resets.

### Verification:

1. Golden cheese appears within 3-10 minutes of gameplay
2. It disappears after 15 seconds if not clicked
3. Clicking it triggers a collection fanfare, particle burst, and applies the reward
4. Timed buffs (Cheese Frenzy, Click Storm, Hero Rally, Curd Tsunami) appear in the `ActiveBuffsBar`
5. Instant rewards (Lucky Curds, Rare Ingredient) apply immediately
6. A new golden cheese timer starts after collection or expiry
7. The system doesn't break on prestige reset, save/load, or tab hide/show

### Key Discoveries:

- `CheeseActiveBuff.sourceCheeseId` (game.ts:592) will use a sentinel value `"golden_cheese"` since these buffs don't come from crafted cheese
- The `CheeseEffect` union type (game.ts:523-527) already covers `production_boost`, `click_boost`, and `xp_boost` — three of our six reward types use these directly
- `getActiveBuffMultipliers()` (gameStore.ts:2100-2126) and the consumption points in `click()` (line 354) and `tick()` (line 373) already multiply by buff multipliers — no production engine changes needed
- The game loop caps delta at 100ms (gameLoop.ts:41), so the golden cheese timer won't jump wildly after tab switch
- `resumeGameLoop()` resets `accumulatedGameLogicTime` (gameLoop.ts:117), so golden cheese timer state must be timestamp-based (not delta-accumulator-based) to survive pause/resume

## Assumptions Made

1. **Golden cheese does NOT persist across prestige resets** — timer and active state reset on aging/vintage/legacy. The `totalCollected` counter persists.
2. **Golden cheese does NOT appear while tab is hidden** — the game loop pauses on `document.hidden`, so the timer naturally pauses too. No special handling needed.
3. **"Rare Ingredient" reward** grants a random crafting ingredient from the player's unlocked tier — we'll add the first unlocked legendary ingredient if they have one, otherwise a random specialty item.
4. **Golden cheese position** is offset from the main cheese wheel — positioned to the right and slightly above, floating with a gentle bob animation.
5. **No golden cheese interactions with synergy upgrades** for now (per research "defer for now" answer).
6. **Statistics field `totalCollected`** is added to state for future achievements but no achievement is wired up in this plan.
7. **The reward table weights match the research exactly**: Cheese Frenzy 40%, Lucky Curds 25%, Click Storm 15%, Rare Ingredient 10%, Hero Rally 7%, Curd Tsunami 3%.

## What We're NOT Doing

- No golden cheese achievements (future work)
- No golden cheese interaction with synergy upgrades (deferred)
- No golden cheese during combat (would be distracting)
- No offline golden cheese accumulation (requires active presence — that's the point)
- No golden cheese settings/toggle (keep it simple for now)
- No CPS duplication cleanup (separate plan, should be done first per research recommendation but is not a blocker for this feature)
- No Canadian-themed flavor text on rewards (nice-to-have, can be added later)

## Implementation Approach

The implementation is divided into 4 phases:

1. **Types & State** — Define the data model and store state
2. **Core Logic** — Timer, spawn, reward calculation, and game loop integration
3. **Visuals & Audio** — 3D mesh, particles, sound effects
4. **UI Integration** — Buff display integration and notification

Each phase is independently testable. Phase 1-2 can be verified via console/devtools. Phase 3 adds visual confirmation. Phase 4 polishes the UX.

---

## Phase 1: Types and State Foundation

### Overview

Define TypeScript types for golden cheese rewards, add golden cheese state to `GameState`, and add store methods to the `GameStore` interface. No logic yet — just the data model.

### Changes Required:

#### 1. Golden Cheese Types

**File**: `src/types/game.ts`
**Changes**: Add golden cheese reward type, golden cheese state interface, and extend `GameState`.

Add after the `CheeseActiveBuff` interface (~line 593):

```typescript
// ===== Golden Cheese Event Types =====

export type GoldenCheeseRewardType =
  | 'cheese_frenzy'      // 7x CPS for 77 seconds
  | 'lucky_curds'        // Instant 15 min CPS grant
  | 'click_storm'        // 77x click for 13 seconds
  | 'rare_ingredient'    // Free crafting ingredient
  | 'hero_rally'         // 5x XP for 60 seconds
  | 'curd_tsunami';      // 777x CPS for 7 seconds

export interface GoldenCheeseReward {
  type: GoldenCheeseRewardType;
  weight: number;         // Relative probability weight
}

export interface GoldenCheeseState {
  nextSpawnAt: number;       // Timestamp when next golden cheese appears (0 = not scheduled)
  isVisible: boolean;        // Whether golden cheese is currently showing
  expiresAt: number;         // Timestamp when visible golden cheese disappears (0 = N/A)
  currentReward: GoldenCheeseRewardType | null; // Pre-rolled reward for current visible cheese
  totalCollected: number;    // Lifetime counter
}
```

Extend `GameState` (line 72-104) with:

```typescript
// Golden cheese events
goldenCheese: GoldenCheeseState;
```

#### 2. GameStore Interface

**File**: `src/stores/gameStore.ts`
**Changes**: Add golden cheese methods to `GameStore` interface (~line 264, before the closing `}`).

```typescript
// Golden cheese actions
tickGoldenCheese: (deltaMs: number) => void;
collectGoldenCheese: () => GoldenCheeseRewardType | null;
scheduleNextGoldenCheese: () => void;
```

#### 3. Initial State

**File**: `src/stores/gameStore.ts`
**Changes**: Add golden cheese initial state to `initialState` (~line 342, after `activeEvents`).

```typescript
// Golden cheese events
goldenCheese: {
  nextSpawnAt: 0,      // Will be set on first tick
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: 0,
},
```

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] No runtime errors on game load (state initializes correctly)

---

## Phase 2: Core Logic — Timer, Spawning, Rewards, Collection

### Overview

Implement the golden cheese timer tick, spawn/despawn logic, weighted random reward selection, and reward application. Integrate with the game loop. After this phase, golden cheese events function but are invisible (no 3D mesh yet — testable via console).

### Changes Required:

#### 1. Golden Cheese System Module

**File**: `src/systems/goldenCheeseSystem.ts` (new file)
**Changes**: Pure logic functions for spawn timing, reward selection, and reward application.

Key functions:

```typescript
// Constants
const MIN_SPAWN_DELAY_MS = 3 * 60 * 1000;  // 3 minutes
const MAX_SPAWN_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const VISIBLE_DURATION_MS = 15 * 1000;      // 15 seconds

// Reward table with weights (must sum conceptually, but we normalize)
const REWARD_TABLE: GoldenCheeseReward[] = [
  { type: 'cheese_frenzy', weight: 40 },
  { type: 'lucky_curds', weight: 25 },
  { type: 'click_storm', weight: 15 },
  { type: 'rare_ingredient', weight: 10 },
  { type: 'hero_rally', weight: 7 },
  { type: 'curd_tsunami', weight: 3 },
];

/** Returns a random delay between MIN and MAX spawn delay */
export function getRandomSpawnDelay(): number

/** Weighted random selection from REWARD_TABLE */
export function rollReward(): GoldenCheeseRewardType

/** Apply the reward to the game state. Returns a description string for notifications. */
export function applyReward(
  rewardType: GoldenCheeseRewardType,
  store: GameStoreApi
): string
```

`applyReward` implementation per reward type:

| Reward | Implementation |
|--------|---------------|
| `cheese_frenzy` | Push `CheeseActiveBuff` with `{ type: 'production_boost', multiplier: 7, duration: 77000 }` to `crafting.activeBuffs` |
| `lucky_curds` | Calculate `curdPerSecond * 15 * 60` (15 min CPS), call `addCurds()` |
| `click_storm` | Push `CheeseActiveBuff` with `{ type: 'click_boost', multiplier: 77, duration: 13000 }` to `crafting.activeBuffs` |
| `rare_ingredient` | Pick a random specialty ingredient ID, add to `crafting.unlockedIngredients` if not already unlocked. If all unlocked, fall back to `lucky_curds`. |
| `hero_rally` | Push `CheeseActiveBuff` with `{ type: 'xp_boost', multiplier: 5, duration: 60000 }` to `crafting.activeBuffs` |
| `curd_tsunami` | Push `CheeseActiveBuff` with `{ type: 'production_boost', multiplier: 777, duration: 7000 }` to `crafting.activeBuffs` |

For buff-type rewards, use `sourceCheeseId: 'golden_cheese'` and set `startTime`/`endTime` based on `Date.now()`.

#### 2. Store Methods

**File**: `src/stores/gameStore.ts`
**Changes**: Implement the three golden cheese store methods.

**`scheduleNextGoldenCheese()`**: Sets `goldenCheese.nextSpawnAt = Date.now() + getRandomSpawnDelay()`.

**`tickGoldenCheese(deltaMs)`**:
```
const now = Date.now();
const gc = state.goldenCheese;

// First tick: schedule if not yet scheduled
if (gc.nextSpawnAt === 0 && !gc.isVisible) {
  scheduleNextGoldenCheese();
  return;
}

// Check if it's time to spawn
if (!gc.isVisible && gc.nextSpawnAt > 0 && now >= gc.nextSpawnAt) {
  const reward = rollReward();
  set goldenCheese to: {
    isVisible: true,
    expiresAt: now + VISIBLE_DURATION_MS,
    currentReward: reward,
    nextSpawnAt: 0,
  }
  // Trigger appear sound (called from component via subscription)
  return;
}

// Check if visible golden cheese has expired
if (gc.isVisible && now >= gc.expiresAt) {
  set goldenCheese to: {
    isVisible: false,
    expiresAt: 0,
    currentReward: null,
  }
  scheduleNextGoldenCheese();
  return;
}
```

**`collectGoldenCheese()`**:
```
const gc = state.goldenCheese;
if (!gc.isVisible || !gc.currentReward) return null;

const rewardType = gc.currentReward;
applyReward(rewardType, storeApi);

set goldenCheese to: {
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: gc.totalCollected + 1,
}
scheduleNextGoldenCheese();
return rewardType;
```

#### 3. Game Loop Integration

**File**: `src/systems/gameLoop.ts`
**Changes**: Add `store.tickGoldenCheese(gameLogicInterval)` call after `store.tickBuffs(gameLogicInterval)` at line 56.

```typescript
store.tick(gameLogicInterval);
store.tickHeroXp(gameLogicInterval);
store.tickCrafting(gameLogicInterval);
store.tickBuffs(gameLogicInterval);
store.tickGoldenCheese(gameLogicInterval);  // NEW
```

#### 4. Save/Load Compatibility

**File**: `src/stores/gameStore.ts`
**Changes**: In the `load()` method, add default golden cheese state for saves that predate this feature. Follow the existing pattern where missing state fields get default values during deserialization.

```typescript
goldenCheese: savedState.goldenCheese ?? {
  nextSpawnAt: 0,
  isVisible: false,
  expiresAt: 0,
  currentReward: null,
  totalCollected: 0,
},
```

Also in the `reset()` method (prestige), reset golden cheese timer but preserve `totalCollected`:

```typescript
goldenCheese: {
  ...initialState.goldenCheese,
  totalCollected: state.goldenCheese.totalCollected,
},
```

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] In browser console: `useGameStore.getState().goldenCheese` shows valid state
- [ ] After waiting 3+ minutes (or manually setting `nextSpawnAt` to `Date.now()` via devtools), `isVisible` becomes `true`
- [ ] Calling `useGameStore.getState().collectGoldenCheese()` returns a reward type and applies the effect
- [ ] `crafting.activeBuffs` contains a golden cheese buff after collection of a buff-type reward
- [ ] `addCurds` is called for `lucky_curds` reward
- [ ] After collection, `nextSpawnAt` is set to a future timestamp
- [ ] After 15 seconds without collection, `isVisible` returns to `false`
- [ ] Save, reload page, verify `goldenCheese` state loads correctly
- [ ] Prestige reset: `totalCollected` preserved, timer resets

---

## Phase 3: Visuals and Audio

### Overview

Create the golden cheese 3D mesh component with pulsing animation, add audio cues for appearance and collection, and trigger particle effects. After this phase, the feature is fully playable.

### Changes Required:

#### 1. Golden Cheese 3D Component

**File**: `src/components/game/GoldenCheeseWheel.tsx` (new file)
**Changes**: A React Three Fiber mesh component following the `CheeseWheel.tsx` pattern.

Key behavior:
- **Geometry**: `cylinderGeometry` (same shape as main cheese wheel but ~60% scale: `args={[0.7, 0.7, 0.25, segments]}`).
- **Material**: `meshStandardMaterial` with `color="#ffd700"`, `metalness={0.8}`, `roughness={0.2}`, `emissive="#ffd700"`, `emissiveIntensity` oscillating between 0.2 and 0.6 via `useFrame` for pulsing glow.
- **Position**: `position={[2.5, 1.5, 0]}` — to the right of and above the main cheese wheel.
- **Animation** (`useFrame`):
  - Gentle Y-axis rotation: `rotation.y += delta * 1.5` (faster than main wheel to draw attention).
  - Vertical bob: `position.y = 1.5 + Math.sin(time * 2) * 0.15`.
  - Pulsing emissive: `emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.2`.
  - Scale-in on appear: lerp from 0 to 1 over ~300ms.
  - Scale-out on expiry: lerp from 1 to 0 over ~500ms when < 3 seconds remaining.
- **Click handler**: `onClick` calls `collectGoldenCheese()` from store, plays collection sound, triggers particle burst.
- **Conditional rendering**: Only rendered when `goldenCheese.isVisible` is `true`. The parent component gates this.
- **Hover**: Scale to 1.15 on hover, cursor pointer.
- **Reduced motion**: Skip bob and pulsing if `reducedMotion` is true; still show the mesh statically.

#### 2. Integrate into GameScene

**File**: `src/components/game/GameScene.tsx`
**Changes**: Import and render `GoldenCheeseWheel` inside the `<Canvas>`, gated on `goldenCheese.isVisible`.

After `<CheeseWheel>` (line 268):

```tsx
{goldenCheese.isVisible && <GoldenCheeseWheel />}
```

Subscribe to `goldenCheese.isVisible` from the store:

```tsx
const goldenCheeseVisible = useGameStore((state) => state.goldenCheese.isVisible);
```

Also trigger appear sound when `isVisible` transitions from false to true (use a `useEffect` with dependency on `goldenCheeseVisible`).

#### 3. Audio — Appear Chime

**File**: `src/systems/audioSystem.ts`
**Changes**: Add `playGoldenCheeseAppear()` function.

Pattern: Follow `playRennetGainSound()` (line 1668-1701). A sparkly ascending shimmer:
- 4 sine oscillators at C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1047Hz)
- Staggered start at 0, 80ms, 160ms, 240ms
- Each note: quick attack (10ms), sustain 150ms, decay 200ms
- Low volume (0.06 per oscillator) so it's noticeable but not jarring
- Total duration: ~450ms

Export the function.

#### 4. Audio — Collection Fanfare

**File**: `src/systems/audioSystem.ts`
**Changes**: Add `playGoldenCheeseCollect()` function.

Pattern: Follow `playAchievementFanfare()` (line 1007-1070). A celebratory ascending arpeggio:
- 5 sine oscillators: C5, E5, G5, C6, E6 — quick arpeggio (40ms gaps)
- Followed by a sustained major chord (C5+E5+G5) for 400ms
- Slightly higher volume (0.08 per oscillator) for "reward" feeling
- Total duration: ~700ms

Export the function.

#### 5. Particle Effects on Collection

**File**: `src/components/game/GoldenCheeseWheel.tsx` (inside click handler)
**Changes**: After calling `collectGoldenCheese()`, emit particles at the click position.

```typescript
emitParticles(screenX, screenY, 'goldenSparkles');
// Double burst for extra celebration
setTimeout(() => emitParticles(screenX, screenY, 'confetti'), 100);
```

Use `event.point` from the Three.js click event, project to screen coordinates via `useThree().camera` and `useThree().size`, then call the global `emitParticles()`.

#### 6. Appear Particle Trail (ambient sparkles)

**File**: `src/components/game/GoldenCheeseWheel.tsx`
**Changes**: While the golden cheese is visible, periodically emit small `goldenSparkles` bursts at its screen position (every ~800ms). Use a `useFrame` timer to throttle.

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`

#### Manual Verification:

- [ ] Golden cheese wheel appears in the 3D scene at the correct position
- [ ] It pulses with a golden glow and gently bobs up and down
- [ ] A shimmer sound plays when it appears
- [ ] Hovering changes cursor and scales the mesh up
- [ ] Clicking plays a fanfare and triggers golden sparkle + confetti particles
- [ ] The golden cheese disappears after click
- [ ] The golden cheese fades out after 15 seconds if not clicked
- [ ] With reduced motion enabled, the mesh appears without bobbing/pulsing

---

## Phase 4: UI Polish and Notification

### Overview

Add a brief notification toast when a golden cheese reward is granted (so the player knows what they got), ensure the ActiveBuffsBar correctly labels golden cheese buffs, and add a visual indicator showing when the golden cheese is fading (last 3 seconds).

### Changes Required:

#### 1. Reward Notification

**File**: `src/components/game/GoldenCheeseWheel.tsx` (in collection handler)
**Changes**: After collecting, show a floating text notification above the cheese position with the reward description.

Use the existing `ClickEffects` floating number system if it supports text, or create a simple ephemeral notification. The notification should show reward-specific text:

| Reward | Notification Text |
|--------|------------------|
| `cheese_frenzy` | "Cheese Frenzy! 7x CPS for 77s" |
| `lucky_curds` | "Lucky Curds! +{amount} curds" |
| `click_storm` | "Click Storm! 77x clicks for 13s" |
| `rare_ingredient` | "Rare Find! Unlocked {ingredient}" |
| `hero_rally` | "Hero Rally! 5x XP for 60s" |
| `curd_tsunami` | "CURD TSUNAMI! 777x CPS for 7s" |

Implementation: A state-driven overlay `<div>` positioned near the golden cheese location that fades in/out over ~2 seconds. Rendered in the `GameScene` component (outside the Canvas, in the HTML overlay layer alongside `ClickEffects`).

#### 2. Buff Label Differentiation

**File**: `src/components/ui/crafting/ActiveBuffsBar.tsx`
**Changes**: In `getBuffIcon()` and `getBuffLabel()`, check if `buff.sourceCheeseId === 'golden_cheese'` and use a distinct icon/label prefix to differentiate from regular cheese buffs.

- Icon: Use a golden/star indicator (e.g., a star character or golden circle) instead of the default buff icon
- Label: Prefix with "Golden:" (e.g., "Golden: 7x Prod" instead of "+600% Prod")

#### 3. Expiry Warning Visual

**File**: `src/components/game/GoldenCheeseWheel.tsx`
**Changes**: When `expiresAt - now < 3000` (last 3 seconds), increase the pulsing speed and start fading opacity. This creates urgency without being disruptive.

- Pulsing speed: `Math.sin(time * 8)` instead of `Math.sin(time * 3)`
- Opacity: lerp from 1.0 to 0.3 over the final 3 seconds via `material.opacity` + `transparent={true}`

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`

#### Manual Verification:

- [ ] Clicking golden cheese shows a notification with the correct reward text
- [ ] Notification fades away after ~2 seconds
- [ ] Golden cheese buffs in ActiveBuffsBar show distinct golden icon/label
- [ ] Golden cheese pulses faster and fades in the last 3 seconds before expiry
- [ ] Full end-to-end: wait for spawn → see appear animation + sound → click → see reward notification + particles + sound → see buff in bar → buff expires naturally
- [ ] No regressions to existing cheese crafting buffs

---

## Testing Strategy

### Manual Testing Workflow:

1. **Fast iteration**: Temporarily set `MIN_SPAWN_DELAY_MS = 5000` and `MAX_SPAWN_DELAY_MS = 10000` during development to avoid waiting 3-10 minutes between spawns.
2. **Reward testing**: Call `useGameStore.getState().collectGoldenCheese()` from console to test each reward type. Or temporarily hardcode `rollReward()` to return a specific type.
3. **Edge cases**:
   - Start combat while golden cheese is visible → should still be clickable (cheese is in background)
   - Prestige while golden cheese is visible → golden cheese should disappear, timer resets
   - Save and reload while golden cheese is visible → should restore correctly (or schedule a new one)
   - Tab away for 5 minutes, come back → golden cheese should NOT have appeared while away (game loop was paused)
4. **Performance**: Verify no FPS drops when golden cheese is animating (check frame budget warnings in dev console).

### Key Invariants:

- Exactly one golden cheese can be active at a time
- `totalCollected` only increments on successful collection (not on expiry)
- Golden cheese buffs stack with regular cheese buffs (multiplicative, same pipeline)
- `nextSpawnAt` is always in the future when set, or 0 when a cheese is visible

## References

- Source document: `thoughts/shared/research/2026-02-28_3-ways-to-make-the-game-more-fun.md` — Enhancement 1
- Existing buff system: `src/stores/gameStore.ts:2068-2126` (tickBuffs, getActiveBuffMultipliers)
- Particle presets: `src/systems/particleSystem.ts:101` (goldenSparkles)
- Audio pattern: `src/systems/audioSystem.ts:1668-1701` (playRennetGainSound)
- 3D mesh pattern: `src/components/game/CheeseWheel.tsx:19-100`
- Game loop: `src/systems/gameLoop.ts:50-58`
- Game state types: `src/types/game.ts:72-104`
- Store interface: `src/stores/gameStore.ts:136-264`

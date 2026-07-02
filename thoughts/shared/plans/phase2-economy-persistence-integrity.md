# Phase 2: Economy & Persistence Integrity Implementation Plan

## Overview

This plan addresses critical economy and persistence bugs that cause inconsistent game state, data loss, and incorrect calculations. The goal is to ensure one effective rate per event (online/offline/display), save import works correctly, no data-loss paths exist, and there's a single source for each slice's default state.

## Current State Analysis

The economy and persistence systems have several interrelated bugs:

1. **Event multipliers are applied twice** - Once in `computeCps` (baked into `curdPerSecond`) and again in `tick()`/`click()`. A 2x event yields 4x actual production online.

2. **No CPS recalc at event boundaries** - `SeasonalEventActivated`/`SeasonalEventDeactivated` events are published but have zero subscribers. CPS stays stale when events start/end.

3. **Save import is broken** - The `beforeunload` handler fires during `window.location.reload()` and overwrites the just-imported save with in-memory state.

4. **Offline progress lost on hidden-close** - Game loop pauses on hidden but autosave advances `lastSaved`. Hiding 2h → closing → reopening computes ~0 offline progress.

5. **Missing CPS recalcs** - `spendRennet` and `claimChallengeReward` modify production-affecting state without publishing `CpsInputsChanged`.

6. **Combat curds double-counted** - `BattleWon` subscriber calls `addCurds` (which adds to `totalCurdsEarned`), then also directly adds to `totalCurdsEarned` again.

7. **No periodic achievement checks** - Pure-idle players crossing thresholds get neither achievements nor their multipliers until their next click/purchase.

8. **Duplicated default state** - Migration ladder, `deserializeState`, and reset factories all define defaults independently, creating maintenance burden and divergence risk.

### Key Discoveries:

- Event multipliers in CPS: [cpsCalculator.ts:52](src/stores/slices/production/cpsCalculator.ts#L52)
- Re-applied in tick: [productionSlice.ts:95](src/stores/slices/production/productionSlice.ts#L95)
- Re-applied in click: [productionSlice.ts:67](src/stores/slices/production/productionSlice.ts#L67)
- Event activation publishes with no subscribers: [eventSlice.ts:76,97](src/stores/slices/events/eventSlice.ts#L76)
- Import clobbered by beforeunload: [SettingsPanel.tsx:57-60](src/components/ui/SettingsPanel.tsx#L57-L60) + [App.tsx:317-319](src/App.tsx#L317-L319)
- `spendRennet` missing recalc: [prestigeSlice.ts:278-293](src/stores/slices/prestige/prestigeSlice.ts#L278-L293)
- `claimChallengeReward` raw-writes: [challengeSlice.ts:73-103](src/stores/slices/challenge/challengeSlice.ts#L73-L103)
- Combat curds double-count: [eventSubscriber.ts:14-17](src/stores/slices/production/eventSubscriber.ts#L14-L17)
- Game loop delta cap: [gameLoop.ts:49](src/systems/gameLoop.ts#L49)

## Desired End State

After this plan is complete:

1. Event multipliers apply exactly once (in `computeCps`, matching the breakdown UI)
2. CPS recalculates immediately when seasonal events activate/deactivate
3. Save import works - importing and reloading restores the imported state
4. Offline progress is computed from the last simulated timestamp, not `lastSaved`
5. All production-affecting state changes publish `CpsInputsChanged`
6. `totalCurdsEarned` is accurate (no double-counting)
7. Achievements check periodically for pure-idle progression
8. Each slice has exactly one default-state source (reset factories), consumed everywhere

### Verification:

- Import a save, reload, verify the imported state loaded
- Activate a 2x event, verify CPS display matches actual tick earnings (not 4x)
- Hide tab 2h, close, reopen → verify offline progress is ~2h worth
- Gain rennet from cave unlock → verify CPS updates if held-rennet bonus applies
- Idle for 5 minutes without clicking → verify achievement unlocks on threshold crossing

## What We're NOT Doing

- **Combat system fixes** - Phase 1 addresses those (softlock, turn semantics, ATB)
- **Dead content reconnection** - Phase 3 reconnects achievements, crafting unlocks, etc.
- **DDD consolidation** - Phase 4 handles single-model architecture
- **New features** - No fun/gameplay additions in this phase
- **Migration version bump** - No new slice state requires migration; just consolidating defaults

---

## Phase 1: Fix Event Multiplier Double-Application

### Overview

Remove event multiplier application from `tick()` and `click()` since `computeCps`/`computeClickValue` already include them. This makes online production match the CPS display.

### Changes Required:

#### 1. Remove event multiplier from tick()

**File**: `src/stores/slices/production/productionSlice.ts`
**Lines**: 88-103

```typescript
tick: (deltaMs: number) => {
  const state = get();
  const { curdPerSecond } = state;
  if (curdPerSecond.isZero()) return;

  const buffMultipliers = state.getActiveBuffMultipliers();
  // REMOVED: const eventMultipliers = state.getEventMultipliers();
  // Event multipliers already baked into curdPerSecond via computeCps
  const effectiveCps = curdPerSecond.mul(buffMultipliers.production);

  const secondsElapsed = deltaMs / 1000;
  const curdsEarned = effectiveCps.mul(secondsElapsed);

  set({
    curds: state.curds.plus(curdsEarned),
    totalCurdsEarned: state.totalCurdsEarned.plus(curdsEarned),
  });
},
```

#### 2. Remove event multiplier from click()

**File**: `src/stores/slices/production/productionSlice.ts`
**Lines**: 62-86

```typescript
click: () => {
  const state = get();
  const baseClickValue = state.getClickValue();
  const buffMultipliers = state.getActiveBuffMultipliers();
  // REMOVED: const eventMultipliers = state.getEventMultipliers();
  // Event multipliers already baked into curdPerClick via computeClickValue
  let clickValue = baseClickValue.mul(buffMultipliers.click);

  // Roll for critical hit
  const isCrit = Math.random() < CLICK_CRIT_BASE_CHANCE;
  if (isCrit) {
    clickValue = clickValue.mul(CLICK_CRIT_BASE_MULTIPLIER);
    playCriticalSound();
    vibrateCrit();
  }

  set({
    curds: state.curds.plus(clickValue),
    totalCurdsEarned: state.totalCurdsEarned.plus(clickValue),
    totalClicks: state.totalClicks + 1,
    currencyAnimationTrigger: state.currencyAnimationTrigger + 1,
    lastClickWasCrit: isCrit,
  });
  get().incrementChallengeProgress('collectClicks', 1);
  get().checkAchievements();
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Start game, note CPS display value
- [ ] Wait 10 seconds, verify curds earned ≈ CPS × 10 (not 2× that)
- [ ] Activate a seasonal event (set system date if needed)
- [ ] Verify CPS display increases by event multiplier
- [ ] Verify actual earnings match new CPS (not double)

---

## Phase 2: Subscribe Seasonal Events to CPS Recalc

### Overview

Add subscriber for `SeasonalEventActivated`/`SeasonalEventDeactivated` events to trigger CPS recalculation. Also fix the load order so `checkEventActivation` runs before offline progress uses the CPS.

### Changes Required:

#### 1. Add event subscriber for seasonal events

**File**: `src/stores/slices/production/eventSubscriber.ts`
**Changes**: Add subscriptions for seasonal event changes

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
      // REMOVED: totalCurdsEarned duplicate - addCurds already handles it
      currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
    }));
  });

  const unsubCpsChanged = subscribe('CpsInputsChanged', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  // NEW: Recalc CPS when seasonal events change
  const unsubEventActivated = subscribe('SeasonalEventActivated', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  const unsubEventDeactivated = subscribe('SeasonalEventDeactivated', () => {
    const store = useGameStore.getState();
    store.recalculateCps();
    store.recalculateClickValue();
  });

  return () => {
    unsubBattleWon();
    unsubCpsChanged();
    unsubEventActivated();
    unsubEventDeactivated();
  };
}
```

#### 2. Fix load order in persistenceSlice

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Lines**: 22-59

The current order is:
1. Merge saved state
2. recalculateCps() - uses saved activeEvents
3. checkEventActivation() - may change activeEvents
4. Calculate offline progress - uses CPS from step 2

Fix by moving checkEventActivation before recalculateCps:

```typescript
load: () => {
  const savedState = loadGame();

  if (!savedState) {
    // No save exists - check events and initialize challenge for fresh game
    get().checkEventActivation();
    get().initializeChallenge();
    return null;
  }

  // Merge saved state first
  set({
    ...savedState,
    lastSaved: Date.now(),
  });

  // Check events FIRST - this may add/remove activeEvents based on current date
  // The subscriber will recalc CPS when events change
  get().checkEventActivation();
  
  // Initialize or rollover weekly challenge
  get().initializeChallenge();

  // Recalculate CPS with correct event state
  // (also handles case where checkEventActivation didn't change anything)
  get().recalculateCps();
  get().recalculateClickValue();

  // Now calculate offline progress with the correct CPS
  const { curdPerSecond } = get();
  const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;
  const offlineProgress = calculateOfflineProgress(curdPerSecond, savedState.lastSaved, offlineProgressCapHours);

  // Apply offline earnings
  set((s) => ({
    curds: s.curds.plus(offlineProgress.curdsEarned),
    totalCurdsEarned: s.totalCurdsEarned.plus(offlineProgress.curdsEarned),
  }));

  return offlineProgress;
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Set system date to Canada Day (July 1), load game
- [ ] Verify Canada Day event activates AND CPS reflects the bonus
- [ ] Change system date to non-event day, reload
- [ ] Verify event deactivates AND CPS returns to normal
- [ ] Verify offline progress uses correct event-adjusted CPS

---

## Phase 3: Fix Save Import

### Overview

Prevent the `beforeunload` handler from overwriting imported saves. Export `SAVE_KEY` for consistent usage.

### Changes Required:

#### 1. Export SAVE_KEY constant

**File**: `src/systems/saveSystem.ts`
**Line**: 12

```typescript
export const SAVE_KEY = 'canadian_cheese_quest_save';
```

#### 2. Add import flag to prevent autosave clobbering

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

Add a module-level flag (outside the slice, since it's ephemeral):

```typescript
// Module-level flag to prevent save during import
let isImportingFlag = false;

export function setImportingFlag(value: boolean) {
  isImportingFlag = value;
}

export function isImporting() {
  return isImportingFlag;
}
```

Modify the save action to check the flag:

```typescript
save: () => {
  // Don't save during import - the imported file would be overwritten
  if (isImporting()) return;
  
  const state = get();
  saveGame(state);
  set({ lastSaved: Date.now() });
},
```

#### 3. Update SettingsPanel import to use flag and exported key

**File**: `src/components/ui/SettingsPanel.tsx`

```typescript
import { deleteSave, saveGame as saveGameToStorage, SAVE_KEY } from '../../systems/saveSystem';
import { setImportingFlag } from '../../stores/slices/persistence/persistenceSlice';

// In handleExportSave:
const handleExportSave = useCallback(() => {
  try {
    const saveData = localStorage.getItem(SAVE_KEY);
    // ... rest unchanged
  } catch (error) {
    console.error('Export failed:', error);
  }
}, []);

// In handleImportSave:
const handleImportSave = useCallback(() => {
  try {
    if (!importValue.trim()) {
      setImportError('Please paste a save file');
      return;
    }
    const parsed = JSON.parse(importValue);
    if (parsed.version && parsed.state) {
      // Set flag BEFORE reload to prevent beforeunload save
      setImportingFlag(true);
      localStorage.setItem(SAVE_KEY, importValue);
      setImportError('');
      setImportValue('');
      window.location.reload();
    } else {
      setImportError('Invalid save file format');
    }
  } catch {
    setImportError('Invalid JSON format');
  }
}, [importValue]);
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] No duplicate string literals for save key: `grep -r "canadian_cheese_quest_save" src/`

#### Manual Verification:
- [ ] Export a save file
- [ ] Progress the game (buy generators, earn curds)
- [ ] Import the previously exported save
- [ ] After reload, verify the old (exported) state is restored, not the progressed state
- [ ] Verify the game continues to save normally after import

---

## Phase 4: Fix Offline Progress Loss on Hidden-Close

### Overview

Track a "last simulated" timestamp separately from `lastSaved`. Offline progress is calculated from when game simulation last ran, not when the last autosave occurred.

### Changes Required:

#### 1. Add lastSimulated timestamp to state

**File**: `src/stores/slices/persistence/types.ts`

```typescript
export interface PersistenceSlice {
  lastSaved: number;
  lastSimulated: number;  // NEW: When game logic last ticked
  gameStarted: number;
  // ... rest unchanged
}
```

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

Add to initial state:
```typescript
lastSimulated: Date.now(),
```

#### 2. Update lastSimulated in game loop tick

**File**: `src/systems/gameLoop.ts`

After game logic tick completes (inside the `if (accumulatedGameLogicTime >= gameLogicInterval)` block):

```typescript
// After processing game logic, update lastSimulated
useGameStore.setState({ lastSimulated: Date.now() });
```

#### 3. Use lastSimulated for offline progress calculation

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

In `load()`:
```typescript
// Use lastSimulated (when game actually ran) not lastSaved (when autosave ran)
const lastActiveTime = savedState.lastSimulated ?? savedState.lastSaved;
const offlineProgress = calculateOfflineProgress(curdPerSecond, lastActiveTime, offlineProgressCapHours);
```

In `applyOfflineProgress()` - this is called on visibility resume, so use the stored `lastSimulated`:
```typescript
applyOfflineProgress: (hiddenDurationMs: number) => {
  // The hiddenDurationMs is accurate from gameLoop's hiddenTimestamp
  // But we should also update lastSimulated after applying
  const state = get();
  const { curdPerSecond } = state;
  const offlineProgressCapHours = useSettingsStore.getState().game.offlineProgressCap;

  const hiddenSeconds = hiddenDurationMs / 1000;
  const capSeconds = offlineProgressCapHours * 60 * 60;
  const elapsedSeconds = Math.min(hiddenSeconds, capSeconds);

  if (elapsedSeconds < 60) return null;

  const curdsEarned = curdPerSecond.mul(elapsedSeconds);
  if (curdsEarned.isZero()) return null;

  set((s) => ({
    curds: s.curds.plus(curdsEarned),
    totalCurdsEarned: s.totalCurdsEarned.plus(curdsEarned),
    currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
    lastSimulated: Date.now(),  // Update after applying offline progress
  }));

  return { curdsEarned, secondsAway: elapsedSeconds };
},
```

#### 4. Serialize lastSimulated in save

**File**: `src/systems/saveSystem.ts`

Add to `SerializedGameState`:
```typescript
lastSimulated?: number;
```

Add to `serializeState`:
```typescript
lastSimulated: state.lastSimulated,
```

Add to `deserializeState` with fallback:
```typescript
// lastSimulated - fallback to lastSaved for migration
const lastSimulated = serialized.lastSimulated ?? serialized.lastSaved;
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`

#### Manual Verification:
- [ ] Play for 1 minute with CPS > 0
- [ ] Hide tab, wait 5 minutes
- [ ] Close browser (force quit, don't use close button if possible)
- [ ] Reopen game, verify ~5 minutes of offline progress is awarded
- [ ] Previous scenario: hide 2h → close → reopen should award ~2h progress

---

## Phase 5: Fix Missing CPS Recalcs

### Overview

Ensure `spendRennet` and `claimChallengeReward` publish `CpsInputsChanged` when they modify production-affecting state. Fix `totalCurdsEarned` double-counting in combat rewards.

### Changes Required:

#### 1. Add CpsInputsChanged publish to spendRennet

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Lines**: 278-293

```typescript
spendRennet: (amount: number) => {
  let success = false;
  set((s) => {
    if (s.prestige.rennet < amount) {
      return s;
    }
    success = true;
    return {
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet - amount,
      },
    };
  });
  
  // Rennet affects CPS via held-rennet bonus
  if (success) {
    publish({ type: 'CpsInputsChanged' });
  }
  
  return success;
},
```

#### 2. Route claimChallengeReward through proper actions

**File**: `src/stores/slices/challenge/challengeSlice.ts`
**Lines**: 61-113

The current implementation directly writes to other slices' state. Refactor to use actions:

```typescript
claimChallengeReward: () => {
  const state = get().challenge;
  if (!state.activeChallengeId || !state.completed || state.claimed) {
    return false;
  }

  const challenge = getChallengeById(state.activeChallengeId);
  if (!challenge) return false;

  const store = get();
  const reward = challenge.reward;

  switch (reward.type) {
    case 'curds':
      store.addCurds(new Decimal(reward.amount));
      break;
    case 'rennet':
      // Use the prestige slice's action instead of raw set
      // Note: We need to add a grantRennet action that doesn't require spending
      store.grantRennet(reward.amount);
      break;
    case 'ingredient':
      store.unlockIngredient(reward.ingredientId);
      break;
    case 'equipment':
      store.grantEquipment(reward.equipmentId);
      break;
  }

  set({
    challenge: {
      ...state,
      claimed: true,
    },
  });

  return true;
},
```

#### 3. Add grantRennet action to prestigeSlice

**File**: `src/stores/slices/prestige/prestigeSlice.ts`

```typescript
grantRennet: (amount: number) => {
  set((s) => ({
    prestige: {
      ...s.prestige,
      rennet: s.prestige.rennet + amount,
      totalRennet: s.prestige.totalRennet + amount,
    },
  }));
  publish({ type: 'CpsInputsChanged' });
},
```

#### 4. Add grantEquipment action to heroSlice

**File**: `src/stores/slices/heroes/heroSlice.ts`

```typescript
grantEquipment: (equipmentId: string) => {
  const { equipmentInventory } = get();
  if (!equipmentInventory.includes(equipmentId)) {
    set({
      equipmentInventory: [...equipmentInventory, equipmentId],
    });
  }
},
```

#### 5. Fix totalCurdsEarned double-counting in BattleWon subscriber

**File**: `src/stores/slices/production/eventSubscriber.ts`

The `addCurds` function already adds to `totalCurdsEarned`. Remove the duplicate:

```typescript
const unsubBattleWon = subscribe('BattleWon', (event) => {
  const store = useGameStore.getState();

  // Add rewards (production-owned state)
  store.addCurds(event.rewards.curds);
  useGameStore.setState((s) => ({
    whey: s.whey.plus(event.rewards.whey),
    // REMOVED: totalCurdsEarned - addCurds already handles it
    currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
  }));
});
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`
- [ ] No cross-slice raw writes: `grep -n "set({.*prestige:" src/stores/slices/challenge/`

#### Manual Verification:
- [ ] Unlock a cave (costs rennet via spendRennet), verify CPS updates
- [ ] Complete weekly challenge with rennet reward, verify CPS updates
- [ ] Win combat, verify `totalCurdsEarned` increases by exactly the reward amount (not double)

---

## Phase 6: Add Periodic Achievement Check

### Overview

Add a periodic `checkAchievements` call in the game loop so pure-idle players crossing thresholds get their achievements and multipliers.

### Changes Required:

#### 1. Add achievement check to game loop

**File**: `src/systems/gameLoop.ts`

Add interval tracking:
```typescript
let lastAchievementCheckTime = 0;
const ACHIEVEMENT_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
```

Inside the game logic tick block, after `store.checkUnlocks()`:
```typescript
// Periodic achievement check for pure-idle players
if (currentTime - lastAchievementCheckTime > ACHIEVEMENT_CHECK_INTERVAL_MS) {
  store.checkAchievements();
  lastAchievementCheckTime = currentTime;
}
```

Reset on start:
```typescript
export function startGameLoop() {
  if (isRunning) return;

  isRunning = true;
  lastTime = null;
  accumulatedGameLogicTime = 0;
  frameBudgetWarnings = 0;
  lastAchievementCheckTime = 0;  // Reset achievement check timer
  animationFrameId = requestAnimationFrame(tick);
}
```

#### 2. Fix game loop delta cap (accumulate before clamping)

**File**: `src/systems/gameLoop.ts`
**Line**: 49

Current code caps delta BEFORE accumulation, which loses time on slow devices. Fix:

```typescript
if (lastTime !== null) {
  const deltaMs = currentTime - lastTime;
  const store = useGameStore.getState();

  // Accumulate raw delta, then cap per-tick to prevent huge single updates
  accumulatedGameLogicTime += deltaMs;
  const gameLogicInterval = getGameLogicInterval();

  // Process in capped chunks to prevent game state explosions
  while (accumulatedGameLogicTime >= gameLogicInterval) {
    const tickDelta = Math.min(accumulatedGameLogicTime, gameLogicInterval);
    store.tick(tickDelta);
    store.tickHeroXp(tickDelta);
    store.tickCrafting(tickDelta);
    store.tickBuffs(tickDelta);
    store.tickGoldenCheese(tickDelta);
    accumulatedGameLogicTime -= tickDelta;
  }
  // ... rest unchanged
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Start game near a totalCurds achievement threshold
- [ ] Leave game idle (no clicks) with positive CPS
- [ ] Verify achievement unlocks automatically when threshold crossed
- [ ] Verify achievement toast appears and CPS multiplier applies

---

## Phase 7: Consolidate Default State Sources

### Overview

Make reset factories the single source of truth for slice defaults. Migrations and `deserializeState` should call the factories instead of duplicating literals.

### Changes Required:

#### 1. Create missing reset factories

**File**: `src/stores/slices/prestige/resetFactory.ts` (NEW)

```typescript
import type { PrestigeState } from '../../../types/game';

export function createInitialPrestigeState(): PrestigeState {
  return {
    rennet: 0,
    totalRennet: 0,
    agingResetCount: 0,
    agingUpgrades: [],
    vintageWheels: 0,
    totalVintageWheels: 0,
    vintageResetCount: 0,
    vintageUnlocks: [],
    legacy: 0,
    legacyBonuses: {
      ontario: 0,
      quebec: 0,
      alberta: 0,
      manitoba: 0,
      saskatchewan: 0,
      yukon: 0,
      bc: 0,
      nova_scotia: 0,
      new_brunswick: 0,
      pei: 0,
      newfoundland: 0,
      nwt: 0,
      nunavut: 0,
    },
    legacyResetCount: 0,
  };
}
```

**File**: `src/stores/slices/challenge/resetFactory.ts` (NEW)

```typescript
import type { ChallengeState } from '../../../types/game';

export function createInitialChallengeState(): ChallengeState {
  return {
    activeChallengeId: null,
    weekStartTimestamp: 0,
    progress: 0,
    completed: false,
    claimed: false,
  };
}
```

**File**: `src/stores/slices/goldenCheese/resetFactory.ts` (NEW)

```typescript
import type { GoldenCheeseState } from '../../../types/game';

export function createInitialGoldenCheeseState(): GoldenCheeseState {
  return {
    nextSpawnAt: 0,
    isVisible: false,
    expiresAt: 0,
    currentReward: null,
    totalCollected: 0,
  };
}
```

**File**: `src/stores/slices/synergy/resetFactory.ts` (NEW)

```typescript
import type { SynergyState } from '../../../types/game';

export function createInitialSynergyState(): SynergyState {
  return {
    purchased: [],
    zoneGeneratorBonuses: {},
  };
}
```

#### 2. Update deserializeState to use factories

**File**: `src/systems/saveSystem.ts`

Import all reset factories and use them for defaults:

```typescript
import { createInitialProductionState } from '../stores/slices/production/resetFactory';
import { createInitialCraftingState } from '../stores/slices/crafting/resetFactory';
import { createInitialPrestigeState } from '../stores/slices/prestige/resetFactory';
import { createInitialChallengeState } from '../stores/slices/challenge/resetFactory';
import { createInitialGoldenCheeseState } from '../stores/slices/goldenCheese/resetFactory';
import { createInitialSynergyState } from '../stores/slices/synergy/resetFactory';

function deserializeState(serialized: SerializedGameState): GameState {
  // Use factories for defaults
  const defaultPrestige = createInitialPrestigeState();
  const defaultCrafting = createInitialCraftingState();
  const defaultChallenge = createInitialChallengeState();
  const defaultGoldenCheese = createInitialGoldenCheeseState();
  const defaultSynergy = createInitialSynergyState();
  
  // ... merge with saved state, using factory defaults as fallbacks
  const prestige: PrestigeState = serialized.prestige ?? defaultPrestige;
  const crafting: CraftingState = serialized.crafting ?? defaultCrafting;
  // ... etc
}
```

#### 3. Update migrations to use factories

**File**: `src/systems/migrations.ts`

```typescript
import { createInitialPrestigeState } from '../stores/slices/prestige/resetFactory';
import { createInitialCraftingState } from '../stores/slices/crafting/resetFactory';
import { createInitialSynergyState } from '../stores/slices/synergy/resetFactory';

// In migration v3→v4:
migrate: (data) => ({
  ...data,
  prestige: data.prestige ?? createInitialPrestigeState(),
  zoneProgress: data.zoneProgress ?? {},
}),

// In migration v4→v5:
migrate: (data) => ({
  ...data,
  crafting: data.crafting ?? createInitialCraftingState(),
}),

// In migration v8→v9:
migrate: (data) => ({
  ...data,
  synergy: data.synergy ?? createInitialSynergyState(),
}),
```

#### 4. Update persistenceSlice.reset to use factories

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

Import factories and use them in `reset()`:

```typescript
import { createInitialPrestigeState } from '../prestige/resetFactory';
import { createInitialChallengeState } from '../challenge/resetFactory';

reset: () => {
  set({
    // Production state - DELEGATED to factory
    ...createInitialProductionState(),
    ehCount: 0,
    lastMilestone: 0,

    // Hero state
    heroes: {},
    party: {
      frontLeft: null,
      frontRight: null,
      backLeft: null,
      backRight: null,
    },
    equipmentInventory: [],

    // Combat state - DELEGATED to factory
    combat: createEmptyCombatState(),
    zoneProgress: {},

    // Prestige state - DELEGATED to factory
    prestige: createInitialPrestigeState(),

    // Crafting state - DELEGATED to factory
    crafting: createInitialCraftingState(),

    // Event state
    activeEvents: [],

    // Achievement state
    achievements: [],

    // Synergy state - permanent, NOT reset
    synergy: get().synergy,

    // Challenge state - DELEGATED to factory
    challenge: createInitialChallengeState(),

    // Progressive unlock state
    unlockedFeatures: new Set<FeatureId>(['upgrades', 'achievements']),
    shownHints: new Set<HintId>(),

    // Persistence state
    lastSaved: Date.now(),
    lastSimulated: Date.now(),
    gameStarted: Date.now(),
  });
  get().initializeChallenge();
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`
- [ ] Single source check: Each default value pattern appears only in its factory

#### Manual Verification:
- [ ] Delete save, start fresh game - verify all defaults are correct
- [ ] Import a v1 save - verify all migrations apply correctly
- [ ] Click "Reset All Progress" - verify game resets to correct defaults

---

## Testing Strategy

### Unit Tests:

- Test `computeCps` returns expected value with event multipliers
- Test `tick` does not re-apply event multipliers
- Test `click` does not re-apply event multipliers
- Test `BattleWon` subscriber doesn't double-count `totalCurdsEarned`
- Test `spendRennet` publishes `CpsInputsChanged`
- Test `grantRennet` publishes `CpsInputsChanged`

### Integration Tests:

- Test import/export round-trip preserves all state
- Test offline progress calculation uses `lastSimulated`
- Test event activation triggers CPS recalc

### Manual Testing Steps:

1. **Event multiplier fix**: Activate event, verify earnings match CPS display
2. **Save import**: Export, progress, import, verify old state restored
3. **Offline progress**: Hide 5min, force-close, reopen, verify ~5min progress
4. **Achievement idle**: Start near threshold, idle, verify auto-unlock
5. **Rennet recalc**: Spend rennet on cave, verify CPS updates

## Performance Considerations

- Adding `SeasonalEventActivated`/`SeasonalEventDeactivated` subscribers has negligible cost (events are rare)
- Updating `lastSimulated` every tick is a single state update per 100ms
- Periodic `checkAchievements` (every 5s) is much cheaper than per-tick
- Game loop delta cap fix may increase total ticks processed, but each tick is small

## Migration Notes

- No migration version bump required - `lastSimulated` has a fallback to `lastSaved`
- Existing saves will work correctly; first load will use `lastSaved` for offline calc
- Reset factories are backward compatible - same values, just centralized

## References

- Original research: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md`
- Event multiplier bug: P-1, P-2 in research document
- Save import bug: S-1 in research document
- Offline progress bug: S-2 in research document
- Missing recalcs: P-3, P-4, P-5 in research document
- Achievement gap: P-6 in research document
- Migration duplication: S-3 in research document

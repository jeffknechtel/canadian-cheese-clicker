# Phase 2: One Source of Truth per Calculation

## Overview

Phase 2 of the DDD refactoring roadmap ensures every game economy calculation has exactly one implementation. The CPS/click pipelines are the game's heart — players optimize around them — and currently exist in 3 (CPS) and 3 (click) copies with one divergent. This phase fixes the Eh multiplier omission on load, creates `computeClickValue`, consolidates 12 inline CPS recalc sites to one action, and sweeps residual magic numbers into `constants.ts`.

## Current State Analysis

### CPS Pipeline (3 copies, 1 divergent)

| Location | Status | Eh Included? |
|----------|--------|--------------|
| `src/stores/slices/production/cpsCalculator.ts:18-36` | Canonical | Yes |
| `src/systems/saveSystem.ts:142-151` | Dead/divergent | **No — BUG** |
| `recalculateCps` action at `productionSlice.ts:270-272` | Exists but never called | Uses canonical |

The saveSystem derivation omits `ehMultiplier` from `totalGlobalMultiplier` (compare line 149-150 vs cpsCalculator.ts:25-33), causing CPS to be wrong after load until the next recalculation fires.

### Click Pipeline (3 identical copies, no function)

| Location | Context |
|----------|---------|
| `src/stores/slices/production/productionSlice.ts:150-154` | `purchaseUpgrade` |
| `src/stores/slices/achievements/achievementSlice.ts:141-145` | `checkAchievements` |
| `src/systems/saveSystem.ts:153-157` | `deserializeState` |

All three compute: `new Decimal(1).mul(upgradeClick * achievementClick * prestigeClick)`. No `computeClickValue` function exists.

### Eh Multiplier Gap

`incrementEh` at `productionSlice.ts:216-218` only increments the counter — never triggers CPS recalculation:
```typescript
incrementEh: () => {
  set((state) => ({ ehCount: state.ehCount + 1 }));
},
```

The Eh multiplier formula at `productionSlice.ts:220-223`:
```typescript
getEhMultiplier: () => {
  const { ehCount } = get();
  return 1 + Math.floor(ehCount / 100) * 0.01;  // +1% per 100 Eh
},
```

Since the multiplier only changes at 100-Eh boundaries, we should recalc only when crossing those thresholds.

### Inline CPS Recalculation Sites (12 total)

All bypass the `recalculateCps` action and inline `set({ curdPerSecond: computeCps(get()) })`:

| File | Line | Action |
|------|------|--------|
| `productionSlice.ts` | 108 | `purchaseGenerator` |
| `productionSlice.ts` | 163 | `purchaseUpgrade` |
| `heroSlice.ts` | 58 | `levelUpHero` |
| `heroSlice.ts` | 109 | `addToParty` |
| `heroSlice.ts` | 119 | `removeFromParty` |
| `heroSlice.ts` | 131 | `swapPartyPositions` |
| `heroSlice.ts` | 195 | `equipItem` |
| `heroSlice.ts` | 219 | `unequipItem` |
| `heroSlice.ts` | 272 | `setFormationRow` / `grantXp` |
| `achievementSlice.ts` | 153 | `checkAchievements` |
| `prestigeSlice.ts` | 106 | `performAgingReset` |
| `prestigeSlice.ts` | 127 | `purchaseAgingUpgrade` |

### Missing Constants

| Constant | Current Location | Value |
|----------|------------------|-------|
| Cheese sell quality base | craftingSlice.ts:457 | 0.5 |
| Cheese sell quality scale | craftingSlice.ts:457 | 1.5 |
| Buff quality base | craftingSlice.ts:405 | 0.5 |
| Buff quality scale | craftingSlice.ts:405 | 1.0 |
| Eh divisor | productionSlice.ts:222 | 100 |
| Eh bonus per tier | productionSlice.ts:222 | 0.01 |
| Offline cap seconds | saveSystem.ts:290 | 28800 |
| Combat log cap | combatSlice.ts:73,162,192 | 100 |
| Boss reward multipliers | combatEngine.ts:990-1010 | 16-entry table |

## Desired End State

After this phase:
- `grep -r "calculateCps\|curdPerSecond:" src/` finds exactly **one** CPS pipeline definition (`computeCps`)
- `grep -r "curdPerClick\|clickMultiplier" src/` finds exactly **one** click pipeline definition (`computeClickValue`)
- `saveSystem.deserializeState` calls store actions instead of deriving CPS/click inline
- `incrementEh` triggers `recalculateCps` when crossing 100-Eh boundaries
- All 12 inline recalc sites use `get().recalculateCps()` instead
- Magic numbers for cheese/buff/Eh/offline/combat-log formulas live in `constants.ts`
- Boss reward multipliers table exported from `constants.ts`

## What We're NOT Doing

- Touching crafting logic consolidation (Phase 3)
- Creating value objects for Quality, Stats, Multiplier (Phase 4)
- Creating Battle/Party aggregates (Phase 5)
- Adding domain events or enforcing slice boundaries (Phase 6)
- Fixing the enemy ability selection bug (Phase 1)
- Fixing the StatusEffect mutation bug (Phase 1)

---

## Phase 2.1: Create computeClickValue Function

### Overview

Add `computeClickValue` beside `computeCps` in the cpsCalculator module, making click value calculation single-sourced.

### Changes Required

#### 1. Add computeClickValue to cpsCalculator.ts

**File**: `src/stores/slices/production/cpsCalculator.ts`

**Changes**: Add new function after `computeCps`

```typescript
import {
  calculateCps,
  calculateGeneratorMultipliers,
  calculateGlobalMultiplier,
  calculateAchievementGlobalMultiplier,
  calculateHeroCpsMultiplier,
  calculateFormationMultiplier,
  calculatePrestigeProductionMultiplier,
  calculateClickMultiplier,
  calculateAchievementClickMultiplier,
  calculatePrestigeClickMultiplier,
} from '../../../systems/productionEngine';

// ... existing computeCps function ...

/**
 * Single source of truth for click value calculation.
 * Replaces 3 copy-pasted blocks in productionSlice, achievementSlice, and saveSystem.
 */
export function computeClickValue(state: GameStore): Decimal {
  const upgradeClickMultiplier = calculateClickMultiplier(state.upgrades);
  const achievementClickMultiplier = calculateAchievementClickMultiplier(state.achievements);
  const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
  const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
  return new Decimal(1).mul(totalClickMultiplier);
}
```

#### 2. Add recalculateClickValue action to productionSlice

**File**: `src/stores/slices/production/productionSlice.ts`

**Changes**: Add action beside `recalculateCps`

```typescript
import { computeCps, computeClickValue } from './cpsCalculator';

// In createProductionSlice, add:
recalculateClickValue: () => {
  set({ curdPerClick: computeClickValue(get()) });
},
```

#### 3. Export from types.ts

**File**: `src/stores/slices/production/types.ts`

**Changes**: Add to ProductionSlice interface

```typescript
recalculateClickValue: () => void;
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] `computeClickValue` is exported and callable
- [x] `recalculateClickValue` action exists on store

#### Manual Verification:
- [x] N/A — pure refactor, behavior unchanged

---

## Phase 2.2: Replace Inline Click Value Calculations

### Overview

Replace the 3 inline click value calculations with calls to `computeClickValue`.

### Changes Required

#### 1. productionSlice.ts purchaseUpgrade

**File**: `src/stores/slices/production/productionSlice.ts`

**Lines**: 150-154

**Before**:
```typescript
const upgradeClickMultiplier = calculateClickMultiplier(newUpgrades);
const achievementClickMultiplier = calculateAchievementClickMultiplier(state.achievements);
const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);
```

**After**:
```typescript
// Update upgrades first, then recalculate
set({
  curds: upgrade.costCurrency === 'curds' ? state.curds.minus(upgrade.cost) : state.curds,
  whey: upgrade.costCurrency === 'whey' ? state.whey.minus(upgrade.cost) : state.whey,
  upgrades: newUpgrades,
});
get().recalculateClickValue();
get().recalculateCps();
```

Note: Must set upgrades BEFORE calling recalculate so it reads the new state.

#### 2. achievementSlice.ts checkAchievements

**File**: `src/stores/slices/achievements/achievementSlice.ts`

**Lines**: 140-150

**Before**:
```typescript
const upgradeClickMultiplier = calculateClickMultiplier(state.upgrades);
const achievementClickMultiplier = calculateAchievementClickMultiplier(newAchievements);
const prestigeClickMultiplier = calculatePrestigeClickMultiplier(state.prestige);
const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
const newCurdPerClick = new Decimal(1).mul(totalClickMultiplier);

set({
  achievements: newAchievements,
  curdPerClick: newCurdPerClick,
});
```

**After**:
```typescript
set({ achievements: newAchievements });
get().recalculateClickValue();
```

#### 3. Remove unused imports

**File**: `src/stores/slices/production/productionSlice.ts`

Remove imports no longer needed after consolidation:
- `calculateClickMultiplier`
- `calculateAchievementClickMultiplier`
- `calculatePrestigeClickMultiplier`

**File**: `src/stores/slices/achievements/achievementSlice.ts`

Remove same imports.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No unused imports: `npm run lint`
- [x] `grep -r "calculateClickMultiplier\|calculateAchievementClickMultiplier\|calculatePrestigeClickMultiplier" src/stores/slices/` returns only type imports or zero hits

#### Manual Verification:
- [ ] Purchasing an upgrade updates click value correctly
- [ ] Unlocking an achievement updates click value correctly

---

## Phase 2.3: Fix saveSystem CPS/Click Derivation

### Overview

Remove the divergent CPS/click derivations from `saveSystem.deserializeState`. After hydrating state, call the store's recalculation actions instead.

### Changes Required

#### 1. Remove inline derivations from deserializeState

**File**: `src/systems/saveSystem.ts`

**Lines**: 142-157 (delete entire block)

**Before**:
```typescript
// Recalculate derived values from saved state (including hero and prestige bonuses)
const generatorMultipliers = calculateGeneratorMultipliers(upgrades);
const upgradeGlobalMultiplier = calculateGlobalMultiplier(upgrades);
const achievementGlobalMultiplier = calculateAchievementGlobalMultiplier(achievements);
const heroMultiplier = calculateHeroCpsMultiplier(heroes, party);
const formationMultiplier = calculateFormationMultiplier(party, heroes);
const prestigeMultiplier = calculatePrestigeProductionMultiplier(prestige);
const totalGlobalMultiplier =
  upgradeGlobalMultiplier * achievementGlobalMultiplier * heroMultiplier * formationMultiplier * prestigeMultiplier;
const curdPerSecond = calculateCps(generators, generatorMultipliers, totalGlobalMultiplier);

const upgradeClickMultiplier = calculateClickMultiplier(upgrades);
const achievementClickMultiplier = calculateAchievementClickMultiplier(achievements);
const prestigeClickMultiplier = calculatePrestigeClickMultiplier(prestige);
const totalClickMultiplier = upgradeClickMultiplier * achievementClickMultiplier * prestigeClickMultiplier;
const curdPerClick = new Decimal(1).mul(totalClickMultiplier);
```

**After**:
```typescript
// CPS and click values will be recalculated after state is loaded
// via store.recalculateCps() and store.recalculateClickValue()
// This fixes the bug where Eh multiplier was omitted from load-path CPS
const curdPerSecond = new Decimal(0); // Placeholder, recalculated after load
const curdPerClick = new Decimal(1);  // Placeholder, recalculated after load
```

#### 2. Call recalculation after loading state

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

Find where `deserializeState` result is applied to store and add recalculation calls.

Look for the load action (around line 22-37) and ensure after setting state:
```typescript
get().recalculateCps();
get().recalculateClickValue();
```

#### 3. Remove unused imports from saveSystem

**File**: `src/systems/saveSystem.ts`

Remove imports that were only used for the inline derivations:
- `calculateGeneratorMultipliers`
- `calculateGlobalMultiplier`
- `calculateAchievementGlobalMultiplier`
- `calculateHeroCpsMultiplier`
- `calculateFormationMultiplier`
- `calculatePrestigeProductionMultiplier`
- `calculateCps`
- `calculateClickMultiplier`
- `calculateAchievementClickMultiplier`
- `calculatePrestigeClickMultiplier`

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No unused imports: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Load a save game with Eh count > 100 — CPS should include Eh bonus
- [ ] Load a save game — click value should be correct
- [ ] Offline progress calculation still works (uses passed-in CPS, not derived)

---

## Phase 2.4: Fix incrementEh to Trigger CPS Recalc

### Overview

Make `incrementEh` trigger CPS recalculation when crossing a 100-Eh boundary (when the multiplier actually changes).

### Changes Required

#### 1. Modify incrementEh action

**File**: `src/stores/slices/production/productionSlice.ts`

**Lines**: 216-218

**Before**:
```typescript
incrementEh: () => {
  set((state) => ({ ehCount: state.ehCount + 1 }));
},
```

**After**:
```typescript
incrementEh: () => {
  const oldEhCount = get().ehCount;
  const newEhCount = oldEhCount + 1;
  set({ ehCount: newEhCount });
  
  // Recalculate CPS when crossing a 100-Eh boundary (when multiplier changes)
  if (Math.floor(newEhCount / 100) > Math.floor(oldEhCount / 100)) {
    get().recalculateCps();
  }
},
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`

#### Manual Verification:
- [ ] Click Eh counter from 99 to 100 — CPS should increase by 1%
- [ ] Click Eh counter from 100 to 101 — CPS should NOT recalculate (no visible change in computation)
- [ ] Click Eh counter from 199 to 200 — CPS should increase again

---

## Phase 2.5: Replace Inline CPS Recalcs with Action Call

### Overview

Replace all 12 inline `set({ curdPerSecond: computeCps(get()) })` sites with `get().recalculateCps()`.

### Changes Required

#### 1. productionSlice.ts (2 sites)

**File**: `src/stores/slices/production/productionSlice.ts`

**Line 108** (purchaseGenerator):
```typescript
// Before:
set({ curdPerSecond: computeCps(get()) });
// After:
get().recalculateCps();
```

**Line 163** (purchaseUpgrade):
```typescript
// Before:
set({ curdPerSecond: computeCps(get()) });
// After:
get().recalculateCps();
```

#### 2. heroSlice.ts (7 sites)

**File**: `src/stores/slices/heroes/heroSlice.ts`

Replace at lines: 58, 109, 119, 131, 195, 219, 272

Each site changes from:
```typescript
set({ curdPerSecond: computeCps(get()) });
```
To:
```typescript
get().recalculateCps();
```

Also remove import of `computeCps` if no longer used directly.

#### 3. achievementSlice.ts (1 site)

**File**: `src/stores/slices/achievements/achievementSlice.ts`

**Line 153**:
```typescript
// Before:
set({ curdPerSecond: computeCps(get()) });
// After:
get().recalculateCps();
```

Remove `computeCps` import.

#### 4. prestigeSlice.ts (2 sites)

**File**: `src/stores/slices/prestige/prestigeSlice.ts`

**Lines 106 and 127**:
```typescript
// Before:
set({ curdPerSecond: computeCps(get()) });
// After:
get().recalculateCps();
```

Remove `computeCps` import.

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No unused imports: `npm run lint`
- [x] `grep -r "set({ curdPerSecond: computeCps" src/` returns 1 result (the action definition only)
- [x] `grep -r "recalculateCps()" src/stores/slices/` returns 14 results

#### Manual Verification:
- [ ] Purchase a generator — CPS updates
- [ ] Purchase an upgrade — CPS updates
- [ ] Level up a hero — CPS updates
- [ ] Add/remove hero from party — CPS updates
- [ ] Equip/unequip item — CPS updates
- [ ] Unlock achievement — CPS updates
- [ ] Perform aging reset — CPS updates
- [ ] Purchase aging upgrade — CPS updates

---

## Phase 2.6: Centralize Magic Numbers in constants.ts

### Overview

Move remaining scattered magic numbers to `constants.ts` for single-source balance tuning.

### Changes Required

#### 1. Add new constants to constants.ts

**File**: `src/data/constants.ts`

**Add after existing constants**:

```typescript
// ===== Cheese Crafting Quality/Value =====

/** Base multiplier for cheese sell value at quality 1 */
export const CHEESE_SELL_QUALITY_BASE = 0.5;

/** Additional multiplier per quality point for cheese sell value */
export const CHEESE_SELL_QUALITY_SCALE = 1.5;

/** Base multiplier for buff effect at quality 1 */
export const BUFF_QUALITY_BASE = 0.5;

/** Additional multiplier per quality point for buff effect */
export const BUFF_QUALITY_SCALE = 1.0;

// ===== Eh Multiplier =====

/** Number of Eh clicks per multiplier tier */
export const EH_DIVISOR = 100;

/** Bonus multiplier per Eh tier (1% = 0.01) */
export const EH_BONUS_PER_TIER = 0.01;

// ===== Offline Progress =====

/** Maximum offline progress in seconds (8 hours) */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

// ===== Combat Log =====

/** Maximum number of combat log entries to keep */
export const COMBAT_LOG_MAX_ENTRIES = 100;

// ===== Boss Reward Multipliers =====

/** Default boss reward multiplier for unlisted bosses */
export const DEFAULT_BOSS_REWARD_MULTIPLIER = { curds: 1.0, xp: 1.0, wheyPercent: 0.1 };

/** Boss-specific reward multipliers by boss ID */
export const BOSS_REWARD_MULTIPLIERS: Record<string, { curds: number; xp: number; wheyPercent: number }> = {
  'quebec-boss': { curds: 2.0, xp: 1.5, wheyPercent: 0.15 },
  'ontario-boss': { curds: 2.5, xp: 1.75, wheyPercent: 0.18 },
  'alberta-boss': { curds: 3.0, xp: 2.0, wheyPercent: 0.20 },
  'manitoba-boss': { curds: 3.5, xp: 2.25, wheyPercent: 0.22 },
  'saskatchewan-boss': { curds: 4.0, xp: 2.5, wheyPercent: 0.25 },
  'yukon-boss': { curds: 4.5, xp: 2.75, wheyPercent: 0.28 },
  'bc-boss': { curds: 5.0, xp: 3.0, wheyPercent: 0.30 },
  'nova-scotia-boss': { curds: 5.5, xp: 3.25, wheyPercent: 0.32 },
  'new-brunswick-boss': { curds: 6.0, xp: 3.5, wheyPercent: 0.35 },
  'pei-boss': { curds: 6.5, xp: 3.75, wheyPercent: 0.38 },
  'newfoundland-boss': { curds: 7.0, xp: 4.0, wheyPercent: 0.40 },
  'nwt-boss': { curds: 7.5, xp: 4.25, wheyPercent: 0.42 },
  'nunavut-boss': { curds: 8.0, xp: 4.5, wheyPercent: 0.45 },
  'windigo-boss': { curds: 10.0, xp: 5.0, wheyPercent: 0.50 },
  'nanabozho-boss': { curds: 12.0, xp: 6.0, wheyPercent: 0.55 },
  'sedna-boss': { curds: 15.0, xp: 7.0, wheyPercent: 0.60 },
};
```

Note: The exact values for `BOSS_REWARD_MULTIPLIERS` should be verified against `combatEngine.ts:990-1010` — the above are placeholders.

#### 2. Update craftingSlice.ts to use constants

**File**: `src/stores/slices/crafting/craftingSlice.ts`

**Line 457** (cheese sell value):
```typescript
// Before:
const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.5;
// After:
import { CHEESE_SELL_QUALITY_BASE, CHEESE_SELL_QUALITY_SCALE } from '../../../data/constants';
const qualityMultiplier = CHEESE_SELL_QUALITY_BASE + (cheese.quality / 100) * CHEESE_SELL_QUALITY_SCALE;
```

**Line 405** (buff scaling):
```typescript
// Before:
const qualityMultiplier = 0.5 + (cheese.quality / 100) * 1.0;
// After:
import { BUFF_QUALITY_BASE, BUFF_QUALITY_SCALE } from '../../../data/constants';
const qualityMultiplier = BUFF_QUALITY_BASE + (cheese.quality / 100) * BUFF_QUALITY_SCALE;
```

#### 3. Update productionSlice.ts to use Eh constants

**File**: `src/stores/slices/production/productionSlice.ts`

**Lines 220-223** (getEhMultiplier):
```typescript
// Before:
getEhMultiplier: () => {
  const { ehCount } = get();
  return 1 + Math.floor(ehCount / 100) * 0.01;
},
// After:
import { EH_DIVISOR, EH_BONUS_PER_TIER } from '../../../data/constants';
getEhMultiplier: () => {
  const { ehCount } = get();
  return 1 + Math.floor(ehCount / EH_DIVISOR) * EH_BONUS_PER_TIER;
},
```

Also update `incrementEh` threshold check:
```typescript
if (Math.floor(newEhCount / EH_DIVISOR) > Math.floor(oldEhCount / EH_DIVISOR)) {
```

#### 4. Update saveSystem.ts to use offline constant

**File**: `src/systems/saveSystem.ts`

**Line 290**:
```typescript
// Before:
const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
// After:
import { MAX_OFFLINE_SECONDS } from '../data/constants';
// (delete the local const declaration)
```

#### 5. Update combatSlice.ts to use combat log constant

**File**: `src/stores/slices/combat/combatSlice.ts`

**Lines 73, 162, 192** (combat log slicing):
```typescript
// Before:
combatLog: [...state.combat.combatLog, ...result.newLogEntries].slice(-100),
// After:
import { COMBAT_LOG_MAX_ENTRIES } from '../../../data/constants';
combatLog: [...state.combat.combatLog, ...result.newLogEntries].slice(-COMBAT_LOG_MAX_ENTRIES),
```

#### 6. Update combatEngine.ts to use boss reward constants

**File**: `src/systems/combatEngine.ts`

**Lines 990-1013** (BOSS_REWARD_MULTIPLIERS):
```typescript
// Before:
const BOSS_REWARD_MULTIPLIERS: Record<string, ...> = { ... };
export const DEFAULT_BOSS_REWARD_MULTIPLIER = { ... };
// After:
import { BOSS_REWARD_MULTIPLIERS, DEFAULT_BOSS_REWARD_MULTIPLIER } from '../data/constants';
// (delete local declarations)
```

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No unused imports: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] `grep -r "0\.5 \+ " src/stores/` returns 0 results (quality formulas moved)
- [x] `grep -r "slice(-100)" src/stores/` returns 0 results (combat log cap moved)

#### Manual Verification:
- [ ] Sell cheese — value calculated correctly
- [ ] Eat cheese — buff applied correctly
- [ ] Eh counter works — multiplier applies correctly
- [ ] Offline progress caps at 8 hours
- [ ] Combat log doesn't exceed 100 entries
- [ ] Boss rewards match expected multipliers

---

## Testing Strategy

### Unit Tests

No new unit tests required — this is a pure refactoring phase. Existing tests should continue to pass.

### Integration Tests

Run full test suite to verify no regressions:
```bash
npm run test
```

### Manual Testing Steps

1. **Fresh game flow**:
   - Start new game
   - Purchase generators and upgrades — verify CPS updates
   - Click Eh counter to 100 — verify CPS increases by 1%
   - Recruit and level heroes — verify CPS updates
   
2. **Save/load flow**:
   - Build up Eh count to 150+
   - Save game
   - Reload page
   - Verify CPS includes Eh multiplier after load
   
3. **Offline progress**:
   - Note current CPS
   - Close game for 5+ minutes
   - Reopen — verify offline progress calculated correctly

4. **Combat flow**:
   - Enter combat
   - Defeat boss
   - Verify rewards match expected multipliers

5. **Crafting flow**:
   - Craft cheese
   - Sell cheese — verify value formula
   - Eat cheese — verify buff formula

## Performance Considerations

- `recalculateCps` and `recalculateClickValue` are cheap operations (just multiplying a few numbers)
- Calling them via action vs inline has negligible overhead
- The 100-Eh threshold check in `incrementEh` avoids unnecessary recalculations (99 out of 100 clicks do NOT trigger recalc)

## Migration Notes

- No save format changes required
- Existing saves will load correctly
- CPS will be correct after load (fixing the Eh omission bug)

## References

- Research document: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Phase 1 plan: (to be created) — reconciles dead code first
- constants.ts: `src/data/constants.ts`
- cpsCalculator.ts: `src/stores/slices/production/cpsCalculator.ts`
- productionSlice.ts: `src/stores/slices/production/productionSlice.ts`
- saveSystem.ts: `src/systems/saveSystem.ts`

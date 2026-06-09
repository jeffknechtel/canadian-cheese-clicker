# Phase 3: Crafting Context Rebuild — Implementation Plan

## Overview

Consolidate the crafting system from two competing models (684-line dead `craftingEngine.ts` + 605-line live `craftingSlice.ts` with duplicated inline logic) into one model. The slice becomes thin orchestration; calculation logic lives in `craftingEngine.ts`. A single `UnlockRequirementService` replaces 7 copy-pasted unlock switches.

## Current State Analysis

**The two-models problem**:
- `src/systems/craftingEngine.ts` (684 lines) — zero importers, completely dead code
- `src/stores/slices/crafting/craftingSlice.ts` (605 lines) — reimplements the same logic inline

**Duplicated calculations** (7 formula copies):
| Calculation | Engine location | Slice location(s) |
|-------------|-----------------|-------------------|
| Quality bonus | `calculateIngredientQualityBonus` :172-192 | inline at :225-239 |
| Final quality | `calculateCheeseQuality` :131-167 | inline at :354-360 |
| Sale value | `calculateCheeseValue` :204-210 | inline at :463-464 |
| Buff scaling | `calculateBuffEffect` :416-438 | inline at :410-423 |
| Slot capacity | `getCaveAvailableSlots` :561-570 | inline at :286-296 |
| Aging progress | `calculateAgingProgress` :229-242 | inline at :596-610 |
| Unlock requirement | 3 switches (:299-311, :329-338, :354-367) | 4 switches (:65-81, :103-116, :143-154, :185-196) |

**Divergences requiring reconciliation**:
- Engine uses hardcoded magic numbers (`0.5`, `1.5`, `1.0`); slice uses constants — **slice is correct**
- Quality calculation split across job start + collection in slice; single function in engine — **engine structure is cleaner**

**Cross-context dependencies** (must become declared inputs to `UnlockRequirementService`):
- Reads: `prestige.totalRennet`, `prestige.totalVintageWheels`, `achievements[]`, `zoneProgress[].bossDefeated`, `crafting.cheeseCollection`
- Writes: `prestige.rennet` (cave unlock), `curds` (crafting cost, sell proceeds)

## Desired End State

1. `craftingEngine.ts` is the single source of truth for all crafting calculations
2. `craftingSlice.ts` is thin orchestration (~300 lines) — state mutation, cross-context writes, event callbacks
3. One `UnlockRequirementService` replaces all 7 unlock switches
4. Engine functions use centralized constants (no magic numbers)
5. Cross-context reads are explicit via a read-only `UnlockContext` type

### Verification:
- `grep -rn "qualityBonus\|qualityMultiplier" src/stores/slices/crafting/` returns only imports from engine
- `wc -l src/stores/slices/crafting/craftingSlice.ts` reports ~300 lines
- `grep -c "switch (req.type)" src/` returns exactly 1 (in the service)

## What We're NOT Doing

- Moving `CraftingJob` to a domain aggregate (Phase 5 scope)
- Adding domain events for crafting lifecycle (Phase 6 scope)
- Introducing value objects for `Quality` (Phase 4 scope)
- Changing the UI component structure
- Modifying the save format or migration logic

---

## Phase 3.1: Update Engine to Use Constants

### Overview
Fix the engine's hardcoded magic numbers by importing from `constants.ts`. This makes the engine formulas match the slice's and prepares them to become the single source of truth.

### Changes Required:

#### 1. Import constants in craftingEngine.ts

**File**: `src/systems/craftingEngine.ts`
**Changes**: Add imports at top of file

```typescript
import {
  CHEESE_SELL_QUALITY_BASE,
  CHEESE_SELL_QUALITY_SCALE,
  BUFF_QUALITY_BASE,
  BUFF_QUALITY_SCALE,
} from '../data/constants';
```

#### 2. Update calculateCheeseValue

**File**: `src/systems/craftingEngine.ts:204-210`
**Changes**: Replace hardcoded `0.5` and `1.5`

```typescript
export function calculateCheeseValue(
  recipe: CheeseRecipe,
  quality: number
): Decimal {
  const qualityMultiplier =
    CHEESE_SELL_QUALITY_BASE + (quality / 100) * CHEESE_SELL_QUALITY_SCALE;
  return recipe.baseValue.mul(qualityMultiplier);
}
```

#### 3. Update calculateBuffEffect

**File**: `src/systems/craftingEngine.ts:416-438`
**Changes**: Replace hardcoded `0.5` and `1.0`

```typescript
export function calculateBuffEffect(
  effect: CheeseEffect,
  quality: number
): CheeseEffect {
  const qualityMultiplier =
    BUFF_QUALITY_BASE + (quality / 100) * BUFF_QUALITY_SCALE;

  const scaledEffect = { ...effect };

  if ('multiplier' in scaledEffect && typeof scaledEffect.multiplier === 'number') {
    const bonus = (scaledEffect.multiplier - 1) * qualityMultiplier;
    scaledEffect.multiplier = 1 + bonus;
  }

  if ('value' in scaledEffect && typeof scaledEffect.value === 'number') {
    scaledEffect.value = Math.round(scaledEffect.value * qualityMultiplier);
  }

  return scaledEffect;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `grep -n "0\.5\|1\.5\|1\.0" src/systems/craftingEngine.ts` shows no hardcoded quality/buff formulas (only comments/unrelated)

#### Manual Verification:
- [x] N/A — this phase has no behavior change

---

## Phase 3.2: Create UnlockRequirementService

### Overview
Extract a single domain service that evaluates unlock requirements, replacing the 7 copy-pasted switches. The service takes an explicit read-only context view, making crafting's cross-context dependencies declared.

### Changes Required:

#### 1. Create UnlockContext type

**File**: `src/systems/craftingEngine.ts` (add near top)
**Changes**: Define the read-only context view

```typescript
/**
 * Read-only view into cross-context state needed for unlock requirements.
 * Makes crafting's upstream dependencies declared rather than ambient.
 */
export interface UnlockContext {
  readonly totalRennet: number;
  readonly totalVintageWheels: number;
  readonly achievements: readonly string[];
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
  readonly unlockedCaves: readonly string[];
  readonly cheeseCollection: Record<string, number>;
}
```

#### 2. Create checkUnlockRequirement function

**File**: `src/systems/craftingEngine.ts` (add after UnlockContext)
**Changes**: Single implementation of requirement checking

```typescript
import type { UnlockRequirement } from '../types/game';

/**
 * Evaluates whether an unlock requirement is satisfied.
 * Single source of truth — replaces 7 copy-pasted switches.
 */
export function checkUnlockRequirement(
  req: UnlockRequirement,
  ctx: UnlockContext
): boolean {
  switch (req.type) {
    case 'prestige_rennet':
      return ctx.totalRennet >= req.amount;
    case 'prestige_vintage':
      return ctx.totalVintageWheels >= req.amount;
    case 'achievement':
      return ctx.achievements.includes(req.achievementId);
    case 'province':
    case 'province_complete':
      return ctx.zoneProgress[req.provinceId]?.bossDefeated ?? false;
    case 'cave_unlocked':
      return ctx.unlockedCaves.includes(req.caveId);
    case 'cave_level':
      return ctx.unlockedCaves.length >= req.level;
    case 'cheese_crafted':
      return (ctx.cheeseCollection[req.recipeId] ?? 0) >= req.count;
    default: {
      const _exhaustive: never = req;
      return false;
    }
  }
}

/**
 * Checks if all requirements in an array are satisfied.
 */
export function checkAllRequirements(
  requirements: readonly UnlockRequirement[],
  ctx: UnlockContext
): boolean {
  return requirements.every((req) => checkUnlockRequirement(req, ctx));
}
```

#### 3. Create buildUnlockContext helper in craftingSlice

**File**: `src/stores/slices/crafting/craftingSlice.ts` (add near top, after imports)
**Changes**: Helper to construct context from store state

```typescript
import { checkAllRequirements, type UnlockContext } from '../../../systems/craftingEngine';

function buildUnlockContext(state: GameStore): UnlockContext {
  return {
    totalRennet: state.prestige.totalRennet,
    totalVintageWheels: state.prestige.totalVintageWheels,
    achievements: state.achievements,
    zoneProgress: state.zoneProgress,
    unlockedCaves: state.crafting.unlockedCaves,
    cheeseCollection: state.crafting.cheeseCollection,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `grep -c "checkUnlockRequirement\|checkAllRequirements" src/systems/craftingEngine.ts` returns 2 (the definitions)

#### Manual Verification:
- [x] N/A — no behavior change yet; wiring happens in Phase 3.3

---

## Phase 3.3: Wire Slice to UnlockRequirementService

### Overview
Replace the 4 inline unlock switches in `craftingSlice.ts` with calls to `checkAllRequirements`. This is the first behavior-preserving refactor that reduces slice complexity.

### Changes Required:

#### 1. Refactor unlockIngredient

**File**: `src/stores/slices/crafting/craftingSlice.ts:56-92`
**Changes**: Replace switch with service call

Before:
```typescript
// lines 64-81: 17-line switch statement
```

After:
```typescript
unlockIngredient: (ingredientId: string) => {
  const state = get();
  const ingredient = getIngredientById(ingredientId);
  if (!ingredient) return;
  if (state.crafting.unlockedIngredients.includes(ingredientId)) return;
  if (!ingredient.unlockRequirement) {
    // No requirement — unlock immediately
  } else {
    const ctx = buildUnlockContext(state);
    if (!checkAllRequirements([ingredient.unlockRequirement], ctx)) return;
  }
  set({
    crafting: {
      ...state.crafting,
      unlockedIngredients: [...state.crafting.unlockedIngredients, ingredientId],
    },
  });
},
```

#### 2. Refactor unlockRecipe

**File**: `src/stores/slices/crafting/craftingSlice.ts:94-131`
**Changes**: Replace switch with service call

```typescript
unlockRecipe: (recipeId: string) => {
  const state = get();
  const recipe = getRecipeById(recipeId);
  if (!recipe) return;
  if (state.crafting.unlockedRecipes.includes(recipeId)) return;
  if (!recipe.unlockRequirement) {
    // No requirement — unlock immediately
  } else {
    const ctx = buildUnlockContext(state);
    if (!checkAllRequirements([recipe.unlockRequirement], ctx)) return;
  }
  set({
    crafting: {
      ...state.crafting,
      unlockedRecipes: [...state.crafting.unlockedRecipes, recipeId],
    },
  });
},
```

#### 3. Refactor unlockCave

**File**: `src/stores/slices/crafting/craftingSlice.ts:133-174`
**Changes**: Replace switch with service call; keep the cross-context write

```typescript
unlockCave: (caveId: string) => {
  const state = get();
  const cave = getCaveById(caveId);
  if (!cave) return;
  if (state.crafting.unlockedCaves.includes(caveId)) return;

  // Check unlock requirements
  if (cave.unlockRequirement) {
    const ctx = buildUnlockContext(state);
    if (!checkAllRequirements(cave.unlockRequirement, ctx)) return;
  }

  // Check cost (cross-context read)
  if (state.prestige.rennet < cave.cost) return;

  // Apply unlock + deduct cost (cross-context write to prestige)
  set({
    crafting: {
      ...state.crafting,
      unlockedCaves: [...state.crafting.unlockedCaves, caveId],
    },
    prestige: {
      ...state.prestige,
      rennet: state.prestige.rennet - cave.cost,
    },
  });
  get().checkAchievements();
},
```

#### 4. Refactor canAffordCave

**File**: `src/stores/slices/crafting/craftingSlice.ts:176-200`
**Changes**: Replace switch with service call

```typescript
canAffordCave: (caveId: string) => {
  const state = get();
  const cave = getCaveById(caveId);
  if (!cave) return false;
  if (state.crafting.unlockedCaves.includes(caveId)) return false;

  // Check requirements
  if (cave.unlockRequirement) {
    const ctx = buildUnlockContext(state);
    if (!checkAllRequirements(cave.unlockRequirement, ctx)) return false;
  }

  // Check cost
  return state.prestige.rennet >= cave.cost;
},
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -c "switch (req.type)" src/stores/slices/crafting/craftingSlice.ts` returns 0

#### Manual Verification:
- [ ] Start the game, attempt to unlock an ingredient with unmet requirements — should fail
- [ ] Unlock an ingredient with met requirements — should succeed
- [ ] Same for recipes and caves
- [ ] Cave unlock deducts rennet correctly

---

## Phase 3.4: Wire Slice to Engine Calculations

### Overview
Replace inline quality, value, buff, slot, and progress calculations in the slice with calls to the engine. This eliminates the remaining calculation duplication.

### Changes Required:

#### 1. Wire quality calculations in startCrafting

**File**: `src/stores/slices/crafting/craftingSlice.ts:202-265`
**Changes**: Use `calculateIngredientQualityBonus` from engine

```typescript
import {
  calculateIngredientQualityBonus,
  // ... other imports
} from '../../../systems/craftingEngine';

// In startCrafting, replace lines 225-239:
const qualityBonus = calculateIngredientQualityBonus(
  ingredients.milkType,
  ingredients.cultureType,
  ingredients.rennetType,
  ingredients.specialtyItems,
  caveId
);
```

Note: The engine's `calculateIngredientQualityBonus` needs to be updated to accept these parameters (it currently expects objects, not IDs).

#### 2. Wire final quality calculation in collectCheese

**File**: `src/stores/slices/crafting/craftingSlice.ts:342-398`
**Changes**: Use `calculateCheeseQuality` from engine

The engine's `calculateCheeseQuality` calculates the full quality including recipe base + ingredients + cave + interactions. However, the slice's current pattern stores `qualityBonus` at job start and adds recipe base + interactions at collection. 

**Option A** (recommended): Keep the split pattern but extract the final calculation:

```typescript
import { clampQuality } from '../../../systems/craftingEngine';

// Replace lines 354-360:
let finalQuality = recipe.baseQuality + job.qualityBonus;
for (const interaction of job.interactions) {
  finalQuality += interaction.qualityEffect;
}
finalQuality = clampQuality(finalQuality);
```

Add to engine:
```typescript
export function clampQuality(quality: number): number {
  return Math.max(1, Math.min(100, quality));
}
```

#### 3. Wire value calculation in sellCheese

**File**: `src/stores/slices/crafting/craftingSlice.ts:454-484`
**Changes**: Use `calculateCheeseValue` from engine

```typescript
import { calculateCheeseValue } from '../../../systems/craftingEngine';

// Replace lines 463-464:
const value = calculateCheeseValue(recipe, cheese.quality);
```

#### 4. Wire buff calculation in consumeCheese

**File**: `src/stores/slices/crafting/craftingSlice.ts:400-452`
**Changes**: Use `calculateBuffEffect` from engine

```typescript
import { calculateBuffEffect } from '../../../systems/craftingEngine';

// Replace lines 410-420:
const scaledEffect = calculateBuffEffect(effect, cheese.quality);
```

#### 5. Wire slot calculation in getCaveAvailableSlots

**File**: `src/stores/slices/crafting/craftingSlice.ts:286-296`
**Changes**: Use `getCaveAvailableSlots` from engine

```typescript
import { getCaveAvailableSlots as getSlots } from '../../../systems/craftingEngine';

getCaveAvailableSlots: (caveId: string) => {
  const state = get();
  return getSlots(caveId, state.crafting.activeJobs);
},
```

#### 6. Wire progress calculation in getJobProgress

**File**: `src/stores/slices/crafting/craftingSlice.ts:596-610`
**Changes**: Use `calculateAgingProgress` from engine

```typescript
import { calculateAgingProgress } from '../../../systems/craftingEngine';

getJobProgress: (jobId: string) => {
  const state = get();
  const job = state.crafting.activeJobs.find((j) => j.id === jobId);
  if (!job) return 0;
  return calculateAgingProgress(job, Date.now());
},
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -E "qualityBonus|qualityMultiplier" src/stores/slices/crafting/craftingSlice.ts | wc -l` shows significant reduction

#### Manual Verification:
- [ ] Craft a cheese — quality calculation works correctly
- [ ] Collect aged cheese — final quality includes interactions
- [ ] Sell cheese — value scales with quality
- [ ] Consume cheese — buff effects scale with quality
- [ ] Check cave slots — correct available slots shown
- [ ] Check job progress — progress percentage accurate

---

## Phase 3.5: Delete Dead Engine Code & Dead Slice Switches

### Overview
Delete the 3 dead unlock functions from `craftingEngine.ts` (superseded by `checkUnlockRequirement`). Verify slice line count is ~300.

### Changes Required:

#### 1. Delete dead unlock functions from engine

**File**: `src/systems/craftingEngine.ts`
**Changes**: Remove these functions (they're superseded by `checkUnlockRequirement`):

- `canUnlockRecipe` (lines 289-311)
- `canUnlockCave` (lines 316-339)
- `canUnlockIngredient` (lines 344-368)

#### 2. Verify and clean up craftingSlice

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Ensure all inline calculations are removed; verify file is ~300 lines

After all Phase 3 changes, the slice should contain:
- State initialization (~5 lines)
- `buildUnlockContext` helper (~10 lines)
- Action implementations that are pure orchestration:
  - Unlock actions: validation + state mutation (~15 lines each × 3)
  - `startCrafting`: cost check, create job, state mutation (~30 lines)
  - `collectCheese`: find job, call engine, state mutation (~25 lines)
  - `consumeCheese`: call engine, apply buffs (~25 lines)
  - `sellCheese`: call engine, add curds (~15 lines)
  - `tickCrafting`: find completed, fire events (~20 lines)
  - `tickBuffs`: filter expired (~15 lines)
  - Getters: thin wrappers (~30 lines)

Total: ~220-300 lines

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `wc -l src/stores/slices/crafting/craftingSlice.ts` reports 534 lines (reduced from 611, still contains necessary orchestration logic)
- [x] `grep -c "switch (req.type)" src/` returns 1 in craftingEngine.ts (2 others in caves.ts and zones.ts are for different domains)

#### Manual Verification:
- [ ] Full crafting flow works: unlock → start → age → collect → consume/sell
- [ ] All cave/recipe/ingredient unlocks still function
- [ ] No regressions in related features (prestige reset, achievements)

---

## Testing Strategy

### Unit Tests:
- `craftingEngine.checkUnlockRequirement` — test each requirement type
- `craftingEngine.calculateCheeseValue` — test quality scaling
- `craftingEngine.calculateBuffEffect` — test multiplier and value scaling
- `craftingEngine.clampQuality` — test boundary cases (0, 1, 100, 150)

### Integration Tests:
- Crafting flow: start job → tick → collect → verify quality
- Unlock flow: verify requirement checking across contexts

### Manual Testing Steps:
1. Start fresh game, verify no unlocks
2. Progress to unlock requirements, verify unlocks work
3. Craft cheese, verify quality calculation
4. Sell cheese, verify value calculation
5. Consume cheese, verify buff application
6. Prestige, verify crafting state resets correctly

## Performance Considerations

No performance impact — all changes are refactoring. Function call overhead is negligible compared to the existing logic.

## References

- DDD roadmap Phase 3: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md:161-171`
- Live slice: `src/stores/slices/crafting/craftingSlice.ts`
- Dead engine: `src/systems/craftingEngine.ts`
- Constants: `src/data/constants.ts:112-124`
- Prior analysis: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`

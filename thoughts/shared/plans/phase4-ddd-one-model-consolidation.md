# Phase 4: DDD One-Model Consolidation Implementation Plan

## Overview

Consolidate the codebase to a single source of truth for each calculation and eliminate divergence traps. This phase kills dead engine exports, fixes the CombatEnemy two-sources-of-truth problem, reconciles display getters with canonical calculators, enforces slice boundaries, and cleans up dead value objects.

## Current State Analysis

**Live and Good:**
- `Battle` aggregate returns feedback/audio events as data — best pattern in codebase
- Reset factories exist for 7 slices (combat, crafting, prestige, production, goldenCheese, synergy, challenge)
- Domain-event dispatcher used by 8+ slices
- `Quality` and `Stats` value objects working
- saveSystem and migrations already delegate to reset factories

**Dead Code / Divergence Traps:**
- **craftingEngine.ts**: 19 dead exports with diverged logic (interaction rules, validation, cost calculation)
- **combatEngine.ts**: 10 dead exports including `processBossSpecialMechanics`, `createEmptyCombatState` duplicate
- **Display getters**: `getHeroMultiplier`, `getClickMultiplier` omit multipliers; `getGlobalMultiplier`, `getVisibleGenerators`, `useCraftingEvents` entirely dead
- **Modifier.ts**: `Multiplier`/`Bonus` branded types have zero callers

**Two-Sources-of-Truth:**
- `executeHeroAbility` reads unscaled catalog `enemyDef?.stats.defense` instead of `enemy.scaledStats.defense`
- Boss stages never call `scaleEnemyStats()` — bosses are never stage-scaled

**Boundary Violations:**
- `eventSlice` writes `equipmentInventory` directly (should use `grantEquipment`)
- `craftingSlice.sellCheese` writes `curds/totalCurdsEarned` directly (should use `addCurds`)
- `synergySlice` writes `whey` directly (no `spendWhey` action exists)
- `persistenceSlice.reset` has inline defaults for heroes/achievements/events/unlock (no factories)

## Desired End State

1. Every formula has exactly ONE authoritative implementation
2. No dead exports in engine files that could diverge from live logic
3. Display getters delegate to canonical calculators — UI shows accurate values
4. No slice writes another slice's state directly
5. All slice defaults flow through reset factories
6. `CombatEnemy.scaledStats` is the single source for enemy stats in combat

### Key Discoveries:

- `craftingEngine.ts:582-616` (`canAddInteraction`) diverges from `craftingSlice.ts:415-439` (different interaction limits)
- `craftingEngine.ts:558-577` (`getInteractionQualityEffect`) is dead; `CaveCard.tsx:105-108` hardcodes `qualityEffect: 1`
- `heroSlice.ts:336-341` (`getHeroMultiplier`) omits `synergyFormationBonus` parameter that `cpsCalculator.ts:32-34` includes
- `productionSlice.ts:287-293` (`getClickMultiplier`) omits `ehMultiplier` and `eventMultipliers.click`
- `combatEngine.ts:828` reads `enemyDef?.stats.defense` (unscaled) instead of `enemy.scaledStats.defense`

## What We're NOT Doing

- Moving pure combat math from `combatEngine` into domain layer (Battle→combatEngine dependency inversion is a larger refactor)
- Implementing branded `ZoneId`/`ProvinceId` types (deferred to future work, would require touching all zone/province references)
- Creating aggregates for production/crafting (the Battle pattern is a template but full adoption is P6 scope)
- Fixing the boss stage scaling design (whether bosses should scale is a game design decision)

---

## Phase 1: Fix CombatEnemy Stat Sourcing

### Overview

Fix the single bug where `executeHeroAbility` reads unscaled catalog defense instead of the enemy's `scaledStats.defense`. This ensures hero abilities respect stage scaling.

### Changes Required:

#### 1. Fix executeHeroAbility defense lookup

**File**: `src/systems/combatEngine.ts`
**Lines**: 828

```typescript
// BEFORE (line 828):
const damage = calculateDamage(source.attack, enemyDef?.stats.defense || 10, effect.multiplier);

// AFTER:
const damage = calculateDamage(source.attack, enemy.scaledStats.defense, effect.multiplier);
```

**Rationale**: `enemy` is the `CombatEnemy` instance which already has `scaledStats` populated at combat initialization. The catalog lookup is unnecessary and wrong.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] In stage 10 of any zone, hero abilities deal less damage than in stage 1 (enemies have higher defense)
- [ ] Verify by logging: `console.log('defense:', enemy.scaledStats.defense)` should show scaled value

---

## Phase 2: Kill Dead craftingEngine Exports

### Overview

Delete 19 dead exports from `craftingEngine.ts` that are divergence traps. Before deletion, reconcile any logic that should be preserved.

### Changes Required:

#### 1. Reconcile interaction rules FIRST

**Problem**: Dead `canAddInteraction` (lines 582-616) has different rules than live `addInteraction` in craftingSlice (lines 415-439).

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Action**: Verify the live `INTERACTION_LIMITS` at line 415-422 is the intended source of truth. The dead engine version includes types (`brine`, `smoke`, `press`) that don't exist in the `CraftingInteraction` union.

**Decision**: Live slice limits are correct (match the actual type union). Delete the dead engine function.

#### 2. Reconcile interaction quality effects

**Problem**: Dead `getInteractionQualityEffect` (lines 558-577) is never called. `CaveCard.tsx:105-108` hardcodes `qualityEffect: 1`.

**File**: `src/components/ui/CaveCard.tsx`
**Lines**: 105-108

```typescript
// BEFORE:
onClick={() => addInteraction(job.id, { type: 'turn', qualityEffect: 1 })}

// AFTER - import and use the engine function:
import { getInteractionQualityEffect } from '../../systems/craftingEngine';
// ...
onClick={() => addInteraction(job.id, { 
  type: 'turn', 
  qualityEffect: getInteractionQualityEffect('turn', job.recipe, job.interactions.length) 
})}
```

**Wait**: This makes `getInteractionQualityEffect` LIVE, not dead. Move it to the "keep" list.

#### 3. Delete dead exports

**File**: `src/systems/craftingEngine.ts`

Delete the following exports (after confirming no callers exist):

| Line | Export | Reason Dead |
|------|--------|-------------|
| 40 | `CraftingUnlockRequirement` | Only used internally |
| 92 | `checkAllRequirements` | Never imported; `checkUnlockRequirement` called directly |
| 103 | `clampQuality` | Deprecated; `Quality.of()` supersedes |
| 112 | `calculateIngredientCost` | Zero callers |
| 166 | `calculateSingleIngredientCost` | Zero callers |
| 205 | `calculateCheeseQuality` | Zero callers; `calculateCheeseQualityFromJob` used instead |
| 304 | `calculateCheeseValueById` | Zero callers |
| 318 | `calculateAgingProgress` | Zero callers; `CraftingJob.getProgress` used instead |
| 336 | `isJobComplete` | Zero callers; `CraftingJob.isComplete` used instead |
| 346 | `getJobRemainingTime` | Zero callers |
| 357 | `formatRemainingTime` | Zero callers |
| 405 | `calculateRecipeBuffEffects` | Zero callers |
| 418 | `validateRecipeIngredients` | Zero callers; validation is UI-only |
| 469 | `hasRequiredIngredients` | Zero callers |
| 513 | `getCaveUsedSlots` | Only internal caller |
| 537 | `getTotalUnlockedCapacity` | Zero callers |
| 549 | `getTotalUsedSlots` | Zero callers |
| 582 | `canAddInteraction` | Zero callers; diverged from slice logic |
| 623 | `getUniqueCheesesCrafted` | Zero callers |
| 632 | `getTotalCheesesCrafted` | Zero callers |
| 641 | `hasEverCrafted` | Zero callers |

**Keep** (now live after CaveCard fix):
- `getInteractionQualityEffect` (line 558)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No import errors after deletion
- [x] Tests pass: `npm test`
- [x] Grep confirms no remaining imports: `grep -r "from.*craftingEngine" src/ | grep -E "checkAllRequirements|clampQuality|calculateIngredientCost|..."` returns nothing

#### Manual Verification:
- [ ] Turning cheese in caves applies quality bonus (not always 1)

---

## Phase 3: Kill Dead combatEngine Exports

### Overview

Delete 10 dead exports from `combatEngine.ts`.

### Changes Required:

#### 1. Delete dead exports

**File**: `src/systems/combatEngine.ts`

| Line | Export | Reason Dead |
|------|--------|-------------|
| 54 | `CombatTickResult` | Unused interface; `Battle` returns `BattleTickResult` |
| 65 | `calculateAtbFillRate` | Only internal caller (`updateAtbGauge`) |
| 239 | `removeExpiredEffects` | Never called |
| 379 | `BossMechanicResult` | Return type of dead function |
| 392 | `processBossSpecialMechanics` | Zero callers; boss minion spawns never happen |
| 453 | `removeFlavourBuffs` | Zero callers |
| 489 | `createHeroCombatState` | Only internal caller |
| 509 | `createCombatEnemy` | Only internal callers |
| 729 | `createEmptyCombatState` | Dead duplicate; `resetFactory.ts` is canonical |

#### 2. Remove re-exports only used internally

**File**: `src/systems/combatEngine.ts`
**Lines**: 43-46

```typescript
// Remove from export list (keep internal use):
// BASE_ATB_RATE - only used at line 68
// LIMIT_BREAK_GAIN_FROM_DEALT - only used at line 122  
// LIMIT_BREAK_GAIN_FROM_TAKEN - only used at line 123
```

Change from:
```typescript
export {
  ATB_MAX,
  BASE_ATB_RATE,
  LIMIT_BREAK_MAX,
  LIMIT_BREAK_GAIN_FROM_DEALT,
  LIMIT_BREAK_GAIN_FROM_TAKEN,
  HP_LOW_THRESHOLD,
  HP_MEDIUM_THRESHOLD,
  BOSS_PHASE_HEAL_PERCENT,
} from '../data/constants';
```

To:
```typescript
import {
  BASE_ATB_RATE,
  LIMIT_BREAK_GAIN_FROM_DEALT,
  LIMIT_BREAK_GAIN_FROM_TAKEN,
} from '../data/constants';

export {
  ATB_MAX,
  LIMIT_BREAK_MAX,
  HP_LOW_THRESHOLD,
  HP_MEDIUM_THRESHOLD,
  BOSS_PHASE_HEAL_PERCENT,
} from '../data/constants';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] Grep confirms no imports of deleted exports

#### Manual Verification:
- [ ] Combat still works (start battle, attack, win)

---

## Phase 4: Fix Display Getters

### Overview

Make display getters delegate to canonical calculators so UI shows accurate multiplier values.

### Changes Required:

#### 1. Fix getHeroMultiplier to include synergy formation bonus

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Lines**: 336-341

```typescript
// BEFORE:
getHeroMultiplier: () => {
  const { heroes, party } = get();
  const heroMultiplier = calculateHeroCpsMultiplier(heroes, party);
  const formationMultiplier = calculateFormationMultiplier(party, heroes);
  return heroMultiplier * formationMultiplier;
},

// AFTER:
getHeroMultiplier: () => {
  const state = get();
  const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
  const synergyFormationBonus = state.getSynergyFormationBonus();
  const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes, synergyFormationBonus);
  return heroMultiplier * formationMultiplier;
},
```

#### 2. Fix getClickMultiplier to include Eh and events

**File**: `src/stores/slices/production/productionSlice.ts`
**Lines**: 287-293

```typescript
// BEFORE:
getClickMultiplier: () => {
  const { upgrades, achievements, prestige } = get();
  const upgradeMultiplier = calculateClickMultiplier(upgrades);
  const achievementMultiplier = calculateAchievementClickMultiplier(achievements);
  const prestigeMultiplier = calculatePrestigeClickMultiplier(prestige);
  return upgradeMultiplier * achievementMultiplier * prestigeMultiplier;
},

// AFTER:
getClickMultiplier: () => {
  const state = get();
  const upgradeMultiplier = calculateClickMultiplier(state.upgrades);
  const achievementMultiplier = calculateAchievementClickMultiplier(state.achievements);
  const prestigeMultiplier = calculatePrestigeClickMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();
  const eventMultipliers = state.getEventMultipliers();
  return upgradeMultiplier * achievementMultiplier * prestigeMultiplier * ehMultiplier * eventMultipliers.click;
},
```

#### 3. Delete dead getters

**File**: `src/stores/slices/production/productionSlice.ts`

Delete `getGlobalMultiplier` (lines 301-309) and `getVisibleGenerators` (lines 323-345).

**File**: `src/stores/slices/production/types.ts`

Remove from `ProductionSlice` interface:
```typescript
// DELETE these lines:
getGlobalMultiplier: () => number;
getVisibleGenerators: () => string[];
```

#### 4. Delete dead useCraftingEvents hook

**File**: `src/hooks/useCraftingEvents.ts`

Delete the entire file.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] No imports of deleted functions: `grep -r "getGlobalMultiplier\|getVisibleGenerators\|useCraftingEvents" src/`

#### Manual Verification:
- [ ] HeroPanel shows correct hero multiplier (includes synergy bonus when full party + synergy purchased)
- [ ] UpgradePanel click multiplier includes Eh bonus after saying "Eh" many times
- [ ] UpgradePanel click multiplier increases during an active click-boost event

---

## Phase 5: Enforce Slice Boundaries

### Overview

Fix boundary violations where slices write state owned by other slices. Establish `spendCurds` and `spendWhey` conventions.

### Changes Required:

#### 1. Add spendCurds action to productionSlice

**File**: `src/stores/slices/production/productionSlice.ts`

Add after `addCurds` (around line 112):

```typescript
spendCurds: (amount: Decimal) => {
  set((s) => ({
    curds: s.curds.minus(amount),
  }));
},
```

**File**: `src/stores/slices/production/types.ts`

Add to `ProductionSlice` interface:
```typescript
spendCurds: (amount: Decimal) => void;
```

#### 2. Add spendWhey action to productionSlice

**File**: `src/stores/slices/production/productionSlice.ts`

Add after `spendCurds`:

```typescript
spendWhey: (amount: Decimal) => {
  set((s) => ({
    whey: s.whey.minus(amount),
  }));
},
```

**File**: `src/stores/slices/production/types.ts`

Add to `ProductionSlice` interface:
```typescript
spendWhey: (amount: Decimal) => void;
```

#### 3. Route craftingSlice.sellCheese through addCurds

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Lines**: 383-399 (inside `sellCheese`)

```typescript
// BEFORE (lines 393-394):
set((s) => ({
  curds: s.curds.plus(value),
  totalCurdsEarned: s.totalCurdsEarned.plus(value),
  // ...
}));

// AFTER:
get().addCurds(value);
set((s) => ({
  // Remove curds/totalCurdsEarned - handled by addCurds
  crafting: {
    ...s.crafting,
    cheeseInventory: s.crafting.cheeseInventory.filter((c) => c.id !== cheeseId),
  },
  currencyAnimationTrigger: s.currencyAnimationTrigger + 1,
}));
```

#### 4. Route synergySlice through spendWhey

**File**: `src/stores/slices/synergy/synergySlice.ts`
**Line**: 31

```typescript
// BEFORE:
set((state) => ({
  whey: state.whey.minus(synergy.cost),
  // ...
}));

// AFTER:
get().spendWhey(new Decimal(synergy.cost));
set((state) => ({
  // Remove whey line - handled by spendWhey
  synergy: {
    // ...
  },
}));
```

**Note**: Import Decimal at top of file if not already imported.

#### 5. Route eventSlice through grantEquipment

**File**: `src/stores/slices/events/eventSlice.ts`
**Lines**: 86-92

```typescript
// BEFORE:
if (event.exclusiveContent.equipment) {
  for (const equipmentId of event.exclusiveContent.equipment) {
    if (!get().equipmentInventory.includes(equipmentId)) {
      set((s) => ({
        equipmentInventory: [...s.equipmentInventory, equipmentId],
      }));
    }
  }
}

// AFTER:
if (event.exclusiveContent.equipment) {
  for (const equipmentId of event.exclusiveContent.equipment) {
    get().grantEquipment(equipmentId);
  }
}
```

**Note**: `grantEquipment` already checks for duplicates (heroSlice.ts:371-378).

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] Grep for direct currency writes reduced: `grep -rn "s\.curds\.\|s\.whey\." src/stores/slices/ | grep -v production` should only show reads

#### Manual Verification:
- [ ] Selling cheese still adds curds
- [ ] Buying synergy upgrades still deducts whey
- [ ] Seasonal events still grant equipment

---

## Phase 6: Add Missing Reset Factories

### Overview

Add reset factories for heroes, achievements, events, and unlock slices. Update `persistenceSlice.reset` to delegate to them.

### Changes Required:

#### 1. Create heroSlice resetFactory

**File**: `src/stores/slices/heroes/resetFactory.ts` (new file)

```typescript
import type { PartyFormation } from '../../../types/game';

export function createInitialHeroState(): {
  heroes: Record<string, never>;
  party: PartyFormation;
  equipmentInventory: string[];
} {
  return {
    heroes: {},
    party: {
      frontLeft: null,
      frontRight: null,
      backLeft: null,
      backRight: null,
    },
    equipmentInventory: [],
  };
}
```

#### 2. Create achievementSlice resetFactory

**File**: `src/stores/slices/achievements/resetFactory.ts` (new file)

```typescript
export function createInitialAchievementState(): {
  achievements: string[];
} {
  return {
    achievements: [],
  };
}
```

#### 3. Create eventSlice resetFactory

**File**: `src/stores/slices/events/resetFactory.ts` (new file)

```typescript
export function createInitialEventState(): {
  activeEvents: string[];
} {
  return {
    activeEvents: [],
  };
}
```

#### 4. Create unlockSlice resetFactory

**File**: `src/stores/slices/unlock/resetFactory.ts` (new file)

```typescript
import type { FeatureId, HintId } from '../../../types/game';

export function createInitialUnlockState(): {
  unlockedFeatures: Set<FeatureId>;
  shownHints: Set<HintId>;
} {
  return {
    unlockedFeatures: new Set<FeatureId>(['upgrades', 'achievements']),
    shownHints: new Set<HintId>(),
  };
}
```

#### 5. Update persistenceSlice.reset to use factories

**File**: `src/stores/slices/persistence/persistenceSlice.ts`

Add imports at top:
```typescript
import { createInitialHeroState } from '../heroes/resetFactory';
import { createInitialAchievementState } from '../achievements/resetFactory';
import { createInitialEventState } from '../events/resetFactory';
import { createInitialUnlockState } from '../unlock/resetFactory';
```

Update reset function (lines 83-130):
```typescript
reset: () => {
  set({
    // Production state - DELEGATED to factory
    ...createInitialProductionState(),
    ehCount: 0,
    lastMilestone: 0,

    // Hero state - DELEGATED to factory
    ...createInitialHeroState(),

    // Combat state - DELEGATED to factory
    combat: createEmptyCombatState(),
    zoneProgress: {},

    // Prestige state - DELEGATED to factory
    prestige: createInitialPrestigeState(),

    // Crafting state - DELEGATED to factory
    crafting: createInitialCraftingState(),

    // Event state - DELEGATED to factory
    ...createInitialEventState(),

    // Achievement state - DELEGATED to factory
    ...createInitialAchievementState(),

    // Synergy state - permanent, NOT reset
    synergy: get().synergy,

    // Challenge state - DELEGATED to factory
    challenge: createInitialChallengeState(),

    // Progressive unlock state - DELEGATED to factory
    ...createInitialUnlockState(),

    // Persistence state
    lastSaved: Date.now(),
    lastSimulated: Date.now(),
    gameStarted: Date.now(),
  });
  // Initialize challenge after reset
  get().initializeChallenge();
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] All slice directories have resetFactory: `ls src/stores/slices/*/resetFactory.ts`

#### Manual Verification:
- [ ] Reset game (delete save) starts fresh with expected defaults
- [ ] All features unlock progressively as designed

---

## Phase 7: Clean Up Dead Value Objects

### Overview

Delete the unused `Modifier.ts` branded types. Document this as a future opportunity if type safety becomes a priority.

### Changes Required:

#### 1. Delete Modifier.ts

**File**: `src/domain/valueObjects/Modifier.ts`

Delete the entire file.

#### 2. Verify no imports exist

```bash
grep -r "from.*Modifier" src/
grep -r "Multiplier\|Bonus" src/domain/
```

Should return nothing.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No dangling imports

#### Manual Verification:
- [x] N/A (pure cleanup)

---

## Testing Strategy

### Unit Tests:
- Verify `executeHeroAbility` uses `enemy.scaledStats.defense`
- Verify `getHeroMultiplier` includes synergy formation bonus
- Verify `getClickMultiplier` includes Eh and event multipliers

### Integration Tests:
- Combat flow: start → attack → abilities → win/lose
- Currency flow: earn curds → spend on upgrade → verify balance
- Prestige flow: aging reset preserves expected state

### Manual Testing Steps:
1. Start combat in stage 10, verify hero abilities do less damage than stage 1
2. Buy a synergy formation bonus, verify HeroPanel multiplier updates
3. Say "Eh" 10+ times, verify UpgradePanel click multiplier increases
4. Sell cheese, verify curds increase
5. Delete save, verify fresh game state matches factories

## Performance Considerations

- No performance impact expected — this is structural cleanup
- Removing dead code slightly reduces bundle size
- No new runtime calculations added

## Migration Notes

- No save migration needed — this changes code structure, not data format
- Existing saves continue to work unchanged

## References

- Research: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md`
- Prior DDD roadmap: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Battle aggregate pattern: `src/domain/aggregates/Battle.ts`
- Reset factory pattern: `src/stores/slices/combat/resetFactory.ts`

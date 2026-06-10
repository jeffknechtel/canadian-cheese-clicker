# Critical Bugs (Tier 1) Implementation Plan

## Overview

This plan addresses the 7 Tier 1 critical bugs identified in the 2026-06-10 tiered scan. These bugs cause data corruption, currency loss, or completely broken features. They are prioritized by severity and dependency order.

## Current State Analysis

The bugs fall into three categories:

1. **Data Corruption** — Migration chain breaks for multi-version save jumps; offline progress always returns zero
2. **Race Conditions** — Stale closure patterns in crafting/prestige allow double-spending currency
3. **Dead Features** — 9 achievement types never implemented; prestige cost reduction calculated but never applied

**Key Discoveries:**

- Migration uses original `fromVersion` throughout instead of tracking version after each step (`migrations.ts:166`)
- Offline progress receives `curdPerSecond = 0` because CPS recalc happens AFTER the calculation (`persistenceSlice.ts:29-32,42`)
- Three slices use captured state outside `set()` then reference it inside, creating race windows (`craftingSlice.ts:427-433`, `prestigeSlice.ts:207-218`, `craftingSlice.ts:168,186-192`)
- Achievement switch statement has 9 cases that fall through to `default: return false` (`achievementSlice.ts:103-105`)
- `calculatePrestigeCostReduction()` is computed and displayed but `calculateGeneratorCost()` never applies it (`productionSlice.ts:100,124,129`)

## Desired End State

After this plan:
1. Saves from any prior version migrate correctly through the full chain
2. Offline progress awards curds based on actual CPS at time of load
3. Rapid clicking cannot double-spend curds or rennet
4. All 9 zone/boss/hero achievement types unlock properly
5. Prestige cost reduction upgrades actually reduce generator costs

### Verification:
- Create a v3 save, load it, verify all migrations v3→v4→v5→v6→v7→v8 run
- Go offline for 1 minute with known CPS, verify correct offline curds on reload
- Rapid-click crafting start button, verify only one job created per available slot
- Complete a zone, verify zone-based achievements unlock
- Purchase cost reduction upgrade, verify generator costs decrease

## What We're NOT Doing

- Tier 2 bugs (enemy ability effects, XP multiplier, etc.) — separate plan
- Refactoring stale closure patterns across ALL slices — only fixing the critical ones
- Adding new prestige effects — only wiring up existing cost reduction
- UI changes — backend fixes only

---

## Phase 1: Migration Chain Fix

### Overview

Fix the migration ladder to track version progression correctly. Currently, a v3 save jumping to v8 only runs the v3→v4 migration because the condition `fromVersion >= migration.fromVersion` uses the original version throughout.

### Changes Required:

#### 1. Track current version through migration chain

**File**: `src/systems/migrations.ts`
**Changes**: Track `currentVersion` that updates after each migration

```typescript
export function runMigrations(
  data: SerializedGameState,
  fromVersion: number
): SerializedGameState {
  let current = data;
  let currentVersion = fromVersion;

  for (const migration of migrations) {
    if (currentVersion >= migration.fromVersion && currentVersion < migration.toVersion) {
      console.log(`Running migration v${migration.fromVersion} → v${migration.toVersion}`);
      current = migration.migrate(current);
      currentVersion = migration.toVersion;
    }
  }

  return current;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Create a mock v3 save in localStorage, load game, verify console shows all migrations v3→v4→v5→v6→v7→v8 running
- [ ] Verify no data loss after multi-version migration

---

## Phase 2: Offline Progress Fix

### Overview

Fix offline progress calculation to use actual CPS instead of the uninitialized zero value. The issue is that `calculateOfflineProgress` is called with `savedState.curdPerSecond` before the CPS recalculation triggered by `publish({ type: 'CpsInputsChanged' })`.

### Changes Required:

#### 1. Recalculate CPS before offline progress calculation

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Changes**: Call `recalculateCps()` synchronously before calculating offline progress, or compute CPS inline

```typescript
load: () => {
  const savedState = loadGame();

  // Always check event activation, even for fresh games
  get().checkEventActivation();

  if (!savedState) return null;

  // Merge saved state first so recalculateCps has correct inputs
  set({
    ...savedState,
    lastSaved: Date.now(),
  });

  // Recalculate CPS with proper inputs (generators, upgrades, prestige, heroes, etc.)
  get().recalculateCps();

  // Now calculate offline progress with the correct CPS
  const { curdPerSecond } = get();
  const offlineProgress = calculateOfflineProgress(
    curdPerSecond,
    savedState.lastSaved
  );

  // Apply offline earnings
  set((s) => ({
    curds: s.curds.plus(offlineProgress.curdsEarned),
    totalCurdsEarned: s.totalCurdsEarned.plus(offlineProgress.curdsEarned),
  }));

  // Also recalculate click value
  get().recalculateClickValue();

  return offlineProgress;
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [ ] Play game until CPS > 0, note exact CPS value
- [ ] Save game, close browser, wait 60 seconds
- [ ] Reload, verify offline progress popup shows ~60 * CPS curds earned
- [ ] Verify CPS displays correctly after load (not zero)

---

## Phase 3: Race Condition Fixes

### Overview

Fix three stale closure bugs where state is captured outside `set()` and used inside, allowing concurrent modifications to be silently overwritten. Convert all to callback-form `set((state) => ...)`.

### Changes Required:

#### 3.1 Fix startCrafting race condition

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Lines**: 142-196
**Changes**: Use callback-form set() with fresh state for balance check and deduction

```typescript
startCrafting: (recipeId: string, caveId: string, ingredients: CraftingJob['ingredients']) => {
  const state = get();
  const canStart = state.canStartCrafting(recipeId, caveId);
  if (!canStart.canStart) return false;

  const recipe = recipeRegistry.get(recipeId);
  const cave = getCaveById(caveId);
  if (!recipe || !cave) return false;

  const milk = getMilkByType(ingredients.milkType);
  const culture = getCultureByType(ingredients.cultureType);
  const rennet = getRennetByType(ingredients.rennetType);

  if (!milk || !culture || !rennet) return false;

  const totalCurdsCost = milk.cost.plus(culture.cost).plus(rennet.cost);

  let specialtyCost = new Decimal(0);
  for (const itemId of ingredients.specialtyItems) {
    const item = getIngredientById(itemId);
    if (item) {
      specialtyCost = specialtyCost.plus(item.cost);
    }
  }

  const finalCost = totalCurdsCost.plus(specialtyCost);
  const ingredientQualityBonus = calculateIngredientQualityBonus(ingredients);
  const qualityBonus = cave.qualityBonus + ingredientQualityBonus;

  // Use callback form to atomically check balance and deduct
  let success = false;
  set((s) => {
    // Re-check balance with fresh state
    if (s.curds.lt(finalCost)) {
      return s; // No change, will set success = false
    }

    // Re-check slot availability with fresh state
    const currentSlots = engineGetCaveAvailableSlots(caveId, s.crafting.activeJobs);
    if (currentSlots <= 0) {
      return s;
    }

    const now = Date.now();
    const job: CraftingJob = {
      id: `job_${now}_${Math.random().toString(36).substring(2, 11)}`,
      recipeId,
      caveId,
      startTime: now,
      endTime: now + recipe.agingDuration,
      ingredients,
      qualityBonus,
      interactions: [],
      notificationSent: false,
    };

    success = true;
    return {
      curds: s.curds.minus(finalCost),
      crafting: {
        ...s.crafting,
        activeJobs: [...s.crafting.activeJobs, job],
      },
    };
  });

  if (success) {
    trackCraftingStart(recipeId, caveId);
  }

  return success;
},
```

#### 3.2 Fix spendRennet race condition

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Lines**: 207-218
**Changes**: Use callback-form set() with fresh state for balance check

```typescript
spendRennet: (amount: number) => {
  let success = false;
  set((s) => {
    if (s.prestige.rennet < amount) {
      return s; // No change
    }
    success = true;
    return {
      prestige: {
        ...s.prestige,
        rennet: s.prestige.rennet - amount,
      },
    };
  });
  return success;
},
```

#### 3.3 Fix tickBuffs stale closure

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Lines**: 414-439
**Changes**: Use callback-form set() instead of captured state

```typescript
tickBuffs: (_deltaMs: number) => {
  const now = Date.now();
  const expiredBuffs: CheeseActiveBuff[] = [];

  set((s) => {
    const activeBuffs = s.crafting.activeBuffs.filter((buff) => {
      if (now >= buff.endTime) {
        expiredBuffs.push(buff);
        return false;
      }
      return true;
    });

    if (activeBuffs.length === s.crafting.activeBuffs.length) {
      return s; // No change
    }

    return {
      crafting: {
        ...s.crafting,
        activeBuffs,
      },
    };
  });

  // Publish events outside of set() to avoid nested state updates
  for (const buff of expiredBuffs) {
    publish({ type: 'BuffExpired', buff });
  }
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Rapid-click "Start Crafting" button 10 times quickly, verify only 1 job per available slot created
- [ ] Rapid-click "Buy Cave" button, verify rennet only deducted once
- [ ] Consume cheese with buff, wait for expiry, verify no console errors

---

## Phase 4: Missing Achievement Handlers

### Overview

Implement the 9 achievement requirement types that currently fall through to `default: return false`. These are all zone/boss/hero related achievements that were added in Phase 7.8 but never wired up.

### Changes Required:

#### 1. Add missing requirement type handlers

**File**: `src/stores/slices/achievements/achievementSlice.ts`
**Lines**: 103-105 (replace the `default: return false` with actual implementations)
**Changes**: Add case handlers for all 9 missing types

```typescript
function checkAchievementRequirement(
  achievement: Achievement,
  state: GameState
): boolean {
  const { requirement } = achievement;

  switch (requirement.type) {
    // ... existing cases ...

    case 'zoneCompleted': {
      const zoneId = requirement.zoneId;
      const progress = state.zoneProgress[zoneId];
      return progress?.bossDefeated === true;
    }

    case 'zonesCompleted': {
      const zones = requirement.zones;
      return zones.every((zoneId) => state.zoneProgress[zoneId]?.bossDefeated === true);
    }

    case 'allProvincialZonesCompleted': {
      const provincialZones = [
        'ontario_cheese_trail',
        'quebec_fromage_frontier',
        'alberta_stampede_range',
        'manitoba_prairie_curds',
        'saskatchewan_wheat_wheels',
        'bc_pacific_creamery',
        'nova_scotia_maritime',
        'new_brunswick_bridges',
        'pei_annes_island',
        'newfoundland_viking_shores',
        'yukon_gold_rush',
        'nwt_aurora_territories',
        'nunavut_frozen_crown',
      ];
      return provincialZones.every((zoneId) => state.zoneProgress[zoneId]?.bossDefeated === true);
    }

    case 'allMythologyZonesCompleted': {
      const mythologyZones = ['thunderbird_saga', 'wendigo_warning', 'chasse_galerie'];
      return mythologyZones.every((zoneId) => state.zoneProgress[zoneId]?.bossDefeated === true);
    }

    case 'bossDefeated': {
      const bossId = requirement.bossId;
      // Find zone containing this boss and check if defeated
      for (const [zoneId, progress] of Object.entries(state.zoneProgress)) {
        if (progress.bossDefeated && zoneId.includes(bossId.replace('_boss', ''))) {
          return true;
        }
      }
      // Also check by iterating zones data for exact boss match
      return Object.values(state.zoneProgress).some((progress) => progress.bossDefeated);
    }

    case 'bossesDefeated': {
      const defeatedCount = Object.values(state.zoneProgress).filter(
        (progress) => progress.bossDefeated
      ).length;
      return defeatedCount >= requirement.count;
    }

    case 'heroesRecruited': {
      const recruitedCount = Object.keys(state.heroes).length;
      return recruitedCount >= requirement.count;
    }

    case 'legendaryHeroesRecruited': {
      // Legendary heroes are defined by rarity in HEROES data
      const legendaryHeroIds = ['nanabozho', 'sedna_ally', 'wisakedjak', 'glooscap'];
      const recruitedLegendaries = legendaryHeroIds.filter(
        (id) => state.heroes[id] !== undefined
      ).length;
      return recruitedLegendaries >= requirement.count;
    }

    case 'provincesRepresented': {
      // Count unique provinces from recruited heroes
      const provinces = new Set<string>();
      for (const heroId of Object.keys(state.heroes)) {
        const hero = heroRegistry.get(heroId);
        if (hero?.province) {
          provinces.add(hero.province);
        }
      }
      return provinces.size >= requirement.count;
    }

    default:
      return false;
  }
}
```

#### 2. Add heroRegistry import

**File**: `src/stores/slices/achievements/achievementSlice.ts`
**Changes**: Add import for heroRegistry to check hero provinces

```typescript
import { heroRegistry } from '../../../domain';
```

#### 3. Add checkAchievements trigger after combat

**File**: `src/stores/slices/combat/combatSlice.ts`
**Changes**: Call `checkAchievements()` after `endCombat` updates zone progress

Find the `endCombat` action and add:
```typescript
// After updating zoneProgress
get().checkAchievements();
```

#### 4. Add checkAchievements trigger after hero recruitment

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Changes**: Call `checkAchievements()` after successful recruitment

Find the `recruitHero` action, after the `trackHeroRecruit` call, add:
```typescript
get().checkAchievements();
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [ ] Complete a zone, verify "Atlantic Adventurer" type achievements can unlock
- [ ] Recruit a hero, verify "Full Roster" type achievements progress
- [ ] Defeat a boss, verify boss-specific achievements unlock

---

## Phase 5: Prestige Cost Reduction Application

### Overview

Wire up the prestige cost reduction calculation to actually apply to generator purchases. Currently `calculatePrestigeCostReduction()` returns the correct value and it's displayed in the UI, but `calculateGeneratorCost()` never uses it.

### Changes Required:

#### 1. Apply cost reduction in generator cost calculation

**File**: `src/systems/productionEngine.ts`
**Lines**: 42-50
**Changes**: Accept prestige state and apply cost reduction

```typescript
/**
 * Calculate the cost to buy N generators, accounting for scaling and prestige reductions
 * Cost formula: baseCost * costMultiplier^owned * (costMultiplier^count - 1) / (costMultiplier - 1)
 * Then apply prestige cost reduction
 */
export function calculateGeneratorCost(
  generatorId: string,
  owned: number,
  count: number,
  prestigeState?: PrestigeState
): Decimal {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return new Decimal(Infinity);
  
  const baseCost = generator.getCost(owned, count);
  
  if (prestigeState) {
    const costReduction = calculatePrestigeCostReduction(prestigeState);
    // costReduction is 0-0.9, so multiply by (1 - reduction)
    return baseCost.mul(1 - costReduction);
  }
  
  return baseCost;
}

/**
 * Calculate maximum generators that can be bought with given curds
 */
export function calculateMaxAffordable(
  generatorId: string,
  owned: number,
  curds: Decimal,
  prestigeState?: PrestigeState
): number {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return 0;
  
  // If we have cost reduction, we can afford more
  if (prestigeState) {
    const costReduction = calculatePrestigeCostReduction(prestigeState);
    const effectiveCurds = curds.div(1 - costReduction);
    return generator.getMaxAffordable(owned, effectiveCurds);
  }
  
  return generator.getMaxAffordable(owned, curds);
}
```

#### 2. Pass prestige state from productionSlice

**File**: `src/stores/slices/production/productionSlice.ts`
**Lines**: 98-130 (buyGenerator, getGeneratorCost, canAffordGenerator, getMaxAffordable)
**Changes**: Pass prestige state to cost calculations

```typescript
buyGenerator: (id: string, count: number) => {
  const state = get();
  const cost = calculateGeneratorCost(id, state.generators[id] ?? 0, count, state.prestige);

  if (state.curds.lt(cost)) {
    return false;
  }

  // ... rest unchanged
},

getGeneratorCost: (id: string, count: number) => {
  const { generators, prestige } = get();
  return calculateGeneratorCost(id, generators[id] ?? 0, count, prestige);
},

canAffordGenerator: (id: string, count: number) => {
  const { curds, generators, prestige } = get();
  const cost = calculateGeneratorCost(id, generators[id] ?? 0, count, prestige);
  return curds.gte(cost);
},

getMaxAffordable: (id: string) => {
  const { curds, generators, prestige } = get();
  return calculateMaxAffordable(id, generators[id] ?? 0, curds, prestige);
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [ ] Note generator cost before purchasing cost reduction upgrade
- [ ] Purchase "Efficient Operations" or similar cost reduction upgrade
- [ ] Verify generator cost decreased by the upgrade's percentage
- [ ] Verify "Cost Reduction: X%" in prestige panel matches actual reduction

---

## Testing Strategy

### Unit Tests:

- Migration chain: test v3→v8 migration runs all intermediate steps
- Race conditions: test concurrent calls don't double-spend
- Achievement requirements: test each of the 9 new requirement types
- Cost reduction: test generator costs decrease with prestige upgrades

### Integration Tests:

- Full save/load cycle with offline progress
- Prestige reset with cost reduction applied to new generators

### Manual Testing Steps:

1. Create a fresh game, play until CPS > 100
2. Manually edit localStorage to set version to 3
3. Reload, verify migrations run and data intact
4. Close browser, wait 60s, reload, verify offline curds match CPS * 60
5. Start crafting rapidly, verify no double-spend
6. Complete a zone, verify zone achievements unlock
7. Buy cost reduction upgrade, verify generator prices drop

---

## Performance Considerations

- Achievement checking now iterates zone/hero data, but this is O(n) where n is small (~30 heroes, ~16 zones)
- Cost reduction calculation is called per generator row render, but it's a simple sum

---

## Migration Notes

No data migration needed. These are runtime behavior fixes only.

---

## References

- Research: `thoughts/shared/research/2026-06-10_18-16-59_bugs-brittle-code-tiered-scan.md`
- Prior analysis: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- DDD roadmap: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
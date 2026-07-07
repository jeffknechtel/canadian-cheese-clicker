# DDD Top 5 High-Value Refactoring Implementation Plan

## Overview

This plan implements the top 5 high-value, low-risk DDD refactoring opportunities identified in the research document. These changes improve domain encapsulation, fix a tutorial bug, and establish patterns for future entity enrichment.

**Source**: `thoughts/shared/research/2026-07-06_21-51-14_ddd-high-value-refactoring-opportunities.md` (Tier 1 items 1.1-1.5)

## Current State Analysis

The codebase has a partially-realized DDD architecture:
- **Exemplary**: `Battle` aggregate (immutable, event-returning), `Stats`/`Quality` value objects
- **Rich**: `Generator` entity (encapsulates cost, CPS, affordability calculations)
- **Anemic**: `Zone`, `Recipe`, `Enemy`, `Upgrade` entities (data containers, behavior in engines/slices)

Domain logic leakage locations:
- `isZoneUnlocked()` in `data/zones.ts:1122-1146` operates on Zone data
- `checkUnlockRequirement()` in `craftingEngine.ts:58-83` operates on Recipe data
- XP level-up while-loop duplicated in `heroSlice.ts:239-244` and `heroSlice.ts:303-308`
- HP primitives (`currentHp`/`maxHp` pairs) scattered across `Battle.ts` and `combatEngine.ts`
- `HeroRecruited` event defined but never published (tutorial bug)

## Desired End State

After this plan:
1. `HeroRecruited` event fires on recruitment, fixing the tutorial step
2. `Zone.isUnlocked(context)` encapsulates unlock logic
3. `Recipe.isUnlockable(context)` encapsulates recipe unlock logic
4. `HitPoints` value object encapsulates HP semantics throughout combat
5. `Hero.processXpGain(state, amount)` encapsulates XP/leveling logic
6. Duplicate `HERO_MAX_LEVEL` constant consolidated (delete unused 50, keep 100)

## What We're NOT Doing

- **Not moving to aggregate roots**: Zone, Recipe remain entities (not aggregates)
- **Not refactoring Enemy entity**: Lower priority, more complex (affects Battle aggregate internals)
- **Not adding `equals()` to value objects**: Not needed for current use cases
- **Not extracting AchievementChecker domain service**: Medium effort, separate plan
- **Not promoting CraftingJob to aggregate**: Medium effort, separate plan

---

## Phase 1: Publish HeroRecruited Event (Tutorial Bug Fix)

### Overview

Add the missing `publish({ type: 'HeroRecruited', heroId })` call in `recruitHero()`. This is a 1-line fix that unblocks the `firstHeroRecruited` tutorial step.

### Changes Required:

#### 1. heroSlice.ts

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Changes**: Add HeroRecruited event publish after CpsInputsChanged

```typescript
// After line 50 (publish({ type: 'CpsInputsChanged' })):
publish({ type: 'HeroRecruited', heroId });
```

The event type already exists in `src/domain/events/dispatcher.ts:23` and is subscribed to in `src/hooks/useTutorialEvents.ts:54-58`.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Start new game, recruit first hero, verify "firstHeroRecruited" tutorial step triggers
- [ ] Verify no duplicate events (recruit second hero, tutorial step shouldn't re-trigger)

---

## Phase 2: Consolidate HERO_MAX_LEVEL Constant

### Overview

Two conflicting `HERO_MAX_LEVEL` constants exist:
- `src/data/heroes.ts:7` → `100` (actually used by heroSlice)
- `src/data/constants.ts:22` → `50` (unused)

Delete the unused constant from `constants.ts` to prevent confusion.

### Changes Required:

#### 1. constants.ts

**File**: `src/data/constants.ts`
**Changes**: Remove the unused `HERO_MAX_LEVEL = 50` export

```typescript
// DELETE this line (around line 22):
export const HERO_MAX_LEVEL = 50;
```

#### 2. Verify no imports

Search for imports of `HERO_MAX_LEVEL` from `constants.ts`:
```bash
grep -r "HERO_MAX_LEVEL" --include="*.ts" --include="*.tsx" src/
```

Confirm all imports are from `data/heroes.ts`.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] No broken imports: `grep -r "HERO_MAX_LEVEL.*constants" src/` returns empty
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] None required (pure cleanup)

---

## Phase 3: Move isZoneUnlocked to Zone Entity

### Overview

Move the `isZoneUnlocked()` function from `data/zones.ts` to the `Zone` entity class. This enriches the anemic entity with behavior that operates on its own data.

### Changes Required:

#### 1. Zone.ts - Add isUnlocked method

**File**: `src/domain/entities/Zone.ts`
**Changes**: Add instance method with context parameter

```typescript
import Decimal from 'decimal.js';

// After line 38 (recommendedLevel getter), add:

/**
 * Context needed to evaluate zone unlock requirements.
 */
export interface ZoneUnlockContext {
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
  readonly curds: Decimal;
  readonly achievements: readonly string[];
}

/**
 * Check if this zone is unlocked given the current game state.
 */
isUnlocked(ctx: ZoneUnlockContext): boolean {
  const req = this.unlockRequirement;

  switch (req.type) {
    case 'none':
      return true;
    case 'zone_complete':
      return ctx.zoneProgress[req.zoneId]?.bossDefeated ?? false;
    case 'curds':
      return ctx.curds.gte(req.amount);
    case 'achievement':
      return ctx.achievements.includes(req.achievementId);
    default:
      return false;
  }
}
```

#### 2. zones.ts - Keep function as adapter (deprecation path)

**File**: `src/data/zones.ts`
**Changes**: Update `isZoneUnlocked` to delegate to entity method

```typescript
// Replace lines 1122-1146 with:
/**
 * @deprecated Use Zone.isUnlocked() directly with a Zone entity instance.
 */
export function isZoneUnlocked(
  zone: ZoneDefinition,
  zoneProgress: Record<string, { bossDefeated: boolean }>,
  curds: Decimal,
  achievements: string[]
): boolean {
  const zoneEntity = Zone.fromDefinition(zone);
  return zoneEntity.isUnlocked({ zoneProgress, curds, achievements });
}
```

Add import at top of file:
```typescript
import { Zone } from '../domain/entities/Zone';
```

#### 3. ZoneSelectPanel.tsx - Migrate to entity method

**File**: `src/components/ui/ZoneSelectPanel.tsx`
**Changes**: Update to use Zone entity directly (optional, can be done later)

The current call site at line 264 can continue using `isZoneUnlocked()` via the adapter. Future cleanup can migrate to:

```typescript
const zoneEntity = Zone.fromDefinition(zone);
const unlocked = zoneEntity.isUnlocked({ zoneProgress, curds, achievements });
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Open Zone Select panel, verify locked zones show correctly
- [ ] Progress through a zone, verify next zone unlocks
- [ ] Verify curds-gated zones respect balance threshold

---

## Phase 4: Move checkUnlockRequirement to Recipe Entity

### Overview

Move recipe-specific unlock checking into the `Recipe` entity. The generic `checkUnlockRequirement` in `craftingEngine.ts` handles multiple entity types (recipes, ingredients, caves), so we'll add a recipe-specific method while keeping the generic function for others.

### Changes Required:

#### 1. Recipe.ts - Add isUnlockable method

**File**: `src/domain/entities/Recipe.ts`
**Changes**: Add unlock check method with context parameter

```typescript
// After line 52 (icon getter), add:

/**
 * Context needed to evaluate recipe unlock requirements.
 */
export interface RecipeUnlockContext {
  readonly totalRennet: number;
  readonly totalVintageWheels: number;
  readonly cheeseCollection: Record<string, number>;
  readonly zoneProgress: Record<string, { bossDefeated: boolean }>;
}

/**
 * Check if this recipe can be unlocked given the current game state.
 * Returns true if no unlock requirement exists.
 */
isUnlockable(ctx: RecipeUnlockContext): boolean {
  const req = this.unlockRequirement;
  if (!req) return true;

  switch (req.type) {
    case 'none':
      return true;
    case 'prestige_rennet':
      return ctx.totalRennet >= req.amount;
    case 'prestige_vintage':
      return ctx.totalVintageWheels >= req.amount;
    case 'cheese_crafted':
      return (ctx.cheeseCollection[req.recipeId] ?? 0) >= req.count;
    case 'province_complete':
      // Known bug: provinceId doesn't match zoneProgress keys (zone IDs)
      // This preserves existing behavior; P3 plan fixes the data model
      return ctx.zoneProgress[req.provinceId]?.bossDefeated ?? false;
    default:
      return false;
  }
}
```

#### 2. craftingSlice.ts - Use Recipe entity method

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Update `unlockRecipe` to use entity method

```typescript
// Around line 82-101 (unlockRecipe action):
// Replace the checkUnlockRequirement call with entity method

unlockRecipe: (recipeId: string) => {
  const state = get();
  const recipe = recipeRegistry.get(recipeId);

  if (!recipe) return false;
  if (state.unlockedRecipes.includes(recipeId)) return false;

  // Use Recipe entity method instead of checkUnlockRequirement
  const ctx: RecipeUnlockContext = {
    totalRennet: state.prestige.totalRennet,
    totalVintageWheels: state.prestige.totalVintageWheels,
    cheeseCollection: state.cheeseCollection,
    zoneProgress: state.zoneProgress,
  };

  if (!recipe.isUnlockable(ctx)) return false;

  set({ unlockedRecipes: [...state.unlockedRecipes, recipeId] });
  publish({ type: 'RecipeUnlocked', recipeId });
  get().checkAchievements();

  return true;
},
```

Add import:
```typescript
import type { RecipeUnlockContext } from '../../../domain/entities/Recipe';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Open crafting panel, verify locked recipes show lock icon
- [ ] Unlock a recipe by meeting requirements, verify it becomes available
- [ ] Prestige, verify rennet-gated recipes unlock correctly

---

## Phase 5: Create HitPoints Value Object

### Overview

Create an immutable `HitPoints` value object that encapsulates HP semantics: damage, healing, percentage, alive checks, and health tiers. This follows the pattern established by `Quality` and `Stats`.

### Changes Required:

#### 1. Create HitPoints.ts

**File**: `src/domain/valueObjects/HitPoints.ts`
**Changes**: New file

```typescript
import { HP_LOW_THRESHOLD, HP_MEDIUM_THRESHOLD } from '../../data/constants';

/**
 * Health tier for display and accessibility.
 */
export type HealthTier = 'critical' | 'low' | 'normal';

/**
 * HitPoints value object - encapsulates HP semantics.
 * Immutable. All operations return new HitPoints instances.
 */
export class HitPoints {
  readonly #current: number;
  readonly #max: number;

  private constructor(current: number, max: number) {
    this.#current = current;
    this.#max = max;
  }

  /**
   * Create HitPoints from current and max values.
   * Current is clamped to [0, max].
   */
  static of(current: number, max: number): HitPoints {
    return new HitPoints(Math.max(0, Math.min(max, current)), max);
  }

  /**
   * Create HitPoints at full health.
   */
  static full(max: number): HitPoints {
    return new HitPoints(max, max);
  }

  /** Current HP value */
  current(): number {
    return this.#current;
  }

  /** Maximum HP value */
  max(): number {
    return this.#max;
  }

  /**
   * Apply damage, returning new HitPoints.
   * HP cannot go below 0.
   */
  damage(amount: number): HitPoints {
    return new HitPoints(Math.max(0, this.#current - amount), this.#max);
  }

  /**
   * Apply healing, returning new HitPoints.
   * HP cannot exceed max.
   */
  heal(amount: number): HitPoints {
    return new HitPoints(Math.min(this.#max, this.#current + amount), this.#max);
  }

  /**
   * Heal by percentage of max HP.
   */
  healPercent(percent: number): HitPoints {
    const amount = Math.floor(this.#max * (percent / 100));
    return this.heal(amount);
  }

  /**
   * Check if still alive (HP > 0).
   */
  isAlive(): boolean {
    return this.#current > 0;
  }

  /**
   * Check if at full HP.
   */
  isFull(): boolean {
    return this.#current >= this.#max;
  }

  /**
   * HP as percentage (0-100).
   */
  percent(): number {
    if (this.#max === 0) return 0;
    return (this.#current / this.#max) * 100;
  }

  /**
   * Amount that can be healed before reaching max.
   */
  healableAmount(): number {
    return this.#max - this.#current;
  }

  /**
   * Health tier for display purposes.
   */
  tier(): HealthTier {
    const pct = this.percent();
    if (pct < HP_LOW_THRESHOLD) return 'critical';
    if (pct < HP_MEDIUM_THRESHOLD) return 'low';
    return 'normal';
  }

  /**
   * Serialize to plain object for storage/display.
   */
  toJSON(): { currentHp: number; maxHp: number } {
    return { currentHp: this.#current, maxHp: this.#max };
  }
}
```

#### 2. Export from valueObjects index

**File**: `src/domain/valueObjects/index.ts`
**Changes**: Add export

```typescript
export { HitPoints, type HealthTier } from './HitPoints';
```

#### 3. Use in combatEngine.ts (helper functions)

**File**: `src/systems/combatEngine.ts`
**Changes**: Replace `applyDamage` with HitPoints method calls (gradual migration)

The existing `applyDamage` function at line 119-121 can remain for now. New code should use `HitPoints.of(current, max).damage(amount).current()`.

Full migration of Battle.ts internals is a larger change; this phase establishes the value object for incremental adoption.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [ ] HitPoints tests pass (if added): verify `damage()`, `heal()`, `percent()`, `tier()` behavior

#### Manual Verification:
- [ ] Combat still works (no regressions from export changes)
- [ ] HP displays correctly in combat panel

---

## Phase 6: Move XP Level-Up Logic to Hero Entity

### Overview

Move the XP level-up while-loop from `heroSlice.ts` into the `Hero` entity as a static method. This consolidates the duplicated logic (in `grantXp` and `tickHeroXp`) and encapsulates domain calculations in the entity.

### Changes Required:

#### 1. Hero.ts - Add XP processing method

**File**: `src/domain/entities/Hero.ts`
**Changes**: Add static method for XP gain processing

```typescript
import { getXpForLevel, HERO_MAX_LEVEL } from '../../data/heroes';

// After line 73 (getFullStats), add:

/**
 * Result of processing XP gain for a hero.
 */
export interface XpGainResult {
  /** New XP value (after subtracting level-up thresholds) */
  xp: number;
  /** New level */
  level: number;
  /** XP needed for next level (0 if max level) */
  xpToNextLevel: number;
  /** Levels gained during this XP application */
  levelsGained: number[];
}

/**
 * Process XP gain for a hero state, handling level-ups.
 * Pure function - returns new state values without mutation.
 */
static processXpGain(
  currentXp: number,
  currentLevel: number,
  currentXpToNextLevel: number,
  xpAmount: number
): XpGainResult {
  if (currentLevel >= HERO_MAX_LEVEL) {
    return {
      xp: 0,
      level: currentLevel,
      xpToNextLevel: 0,
      levelsGained: [],
    };
  }

  const levelsGained: number[] = [];
  let xp = currentXp + xpAmount;
  let level = currentLevel;
  let xpToNextLevel = currentXpToNextLevel;

  while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
    xp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = getXpForLevel(level);
    levelsGained.push(level);
  }

  if (level >= HERO_MAX_LEVEL) {
    xp = 0;
    xpToNextLevel = 0;
  }

  return { xp, level, xpToNextLevel, levelsGained };
}
```

#### 2. heroSlice.ts - Use Hero.processXpGain

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Changes**: Replace inline while-loops with Hero method calls

```typescript
// Add import
import { Hero, type XpGainResult } from '../../../domain/entities/Hero';

// In grantXp (around line 226-272), replace lines 233-249:
grantXp: (heroId: string, amount: number) => {
  const state = get();
  const heroState = state.heroes[heroId];

  if (!heroState) return;
  if (heroState.level >= HERO_MAX_LEVEL) return;

  const result = Hero.processXpGain(
    heroState.xp,
    heroState.level,
    heroState.xpToNextLevel,
    amount
  );

  const newHero: HeroState = {
    ...heroState,
    xp: result.xp,
    level: result.level,
    xpToNextLevel: result.xpToNextLevel,
  };

  set({
    heroes: { ...state.heroes, [heroId]: newHero },
  });

  publish({ type: 'CpsInputsChanged' });

  if (result.levelsGained.length > 0) {
    const heroDef = heroRegistry.get(heroId);
    for (const lvl of result.levelsGained) {
      if (heroDef) {
        publish({ type: 'HeroLeveledUp', heroId, hero: heroDef, newLevel: lvl });
      }
      trackHeroLevelUp(heroId, lvl);
    }
  }
},

// In tickHeroXp (around line 275-334), replace lines 299-316:
// Similar replacement using Hero.processXpGain for each hero in the loop
```

The `tickHeroXp` changes are more involved due to batching. Replace the inner loop body (lines 299-315) with:

```typescript
for (const heroId of partyHeroIds) {
  const heroState = state.heroes[heroId];
  if (!heroState || heroState.level >= HERO_MAX_LEVEL) continue;

  const result = Hero.processXpGain(
    heroState.xp,
    heroState.level,
    heroState.xpToNextLevel,
    xpPerHero
  );

  heroUpdates[heroId] = {
    ...heroState,
    xp: result.xp,
    level: result.level,
    xpToNextLevel: result.xpToNextLevel,
  };

  for (const lvl of result.levelsGained) {
    levelUps.push({ heroId, level: lvl });
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Recruit hero, verify XP gain works in combat
- [ ] Verify level-up triggers correctly (visual feedback, stats increase)
- [ ] Verify max level (100) is respected, no XP overflow
- [ ] Grant large XP amount, verify multiple level-ups process correctly

---

## Testing Strategy

### Unit Tests (Future):
- `HitPoints.test.ts`: damage clamping, heal capping, percent calculation, tier thresholds
- `Hero.processXpGain.test.ts`: single level-up, multiple level-ups, max level cap
- `Zone.isUnlocked.test.ts`: each requirement type
- `Recipe.isUnlockable.test.ts`: each requirement type

### Integration Tests (Future):
- Tutorial event flow: recruit hero → HeroRecruited fires → tutorial step triggers

### Manual Testing Steps:
1. **Phase 1**: New game → recruit hero → check tutorial popup
2. **Phase 2**: Verify lint/typecheck (no manual test needed)
3. **Phase 3**: Zone select panel → verify locked/unlocked states
4. **Phase 4**: Crafting panel → verify recipe locks → prestige → verify unlocks
5. **Phase 5**: Combat → verify HP display → take damage → verify percentage/tier
6. **Phase 6**: Combat → earn XP → verify level-ups → reach max level

## Performance Considerations

- **Zone.isUnlocked**: Called once per zone on panel render (~16 zones), negligible
- **Recipe.isUnlockable**: Called once per recipe on unlock attempt, negligible
- **HitPoints**: Value object construction per damage/heal event; immutable allows memoization if needed
- **Hero.processXpGain**: Pure function, no state access, fast

## Migration Notes

- Phase 3 uses adapter pattern for `isZoneUnlocked` to avoid breaking existing callers
- Phase 5 establishes `HitPoints` for incremental adoption; full migration of `Battle.ts` internals is future work
- No save migration needed (no persisted structure changes)

## References

- Research document: `thoughts/shared/research/2026-07-06_21-51-14_ddd-high-value-refactoring-opportunities.md`
- Domain event system: `src/domain/events/dispatcher.ts`
- Existing value objects: `src/domain/valueObjects/Quality.ts`, `src/domain/valueObjects/Stats.ts`
- Existing rich entity: `src/domain/entities/Generator.ts`

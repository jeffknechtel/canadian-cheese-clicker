# Phase 4: Value Objects Where Units Get Confused

## Overview

Phase 4 introduces value objects to make implicit concepts explicit and enforce compile-time safety for commonly confused values. Following Evans' principle that VALUE OBJECTS make implicit concepts explicit, this phase targets three areas where the codebase has repeated bugs or confusion: Quality (ad-hoc clamping and divergent tier derivations), Stats (field-by-field addition triplicated), and Multiplier/Bonus semantics (silent ×1 vs +0 confusion).

The scope is deliberately small — full Currency wrappers over Decimal in 32 files would create too much churn for uncertain benefit. This phase also completes the language residue cleanup started in earlier phases, converting remaining snake_case identifiers to camelCase.

## Current State Analysis

### Quality (1-100 bounded value)

**Problem**: Quality is a raw number clamped ad-hoc in two places with no type enforcement:
- `craftingEngine.ts:107-109`: `clampQuality()` function
- `craftingEngine.ts:244`: inline `Math.max(1, Math.min(100, quality))`

Tier derivation is inconsistent:
- `accessibilityAnnouncer.ts:293`: 90/70/50 thresholds → 3 tiers (exceptional/high/good/standard)
- `CheeseInventoryCard.tsx:117-122`: 90/70/50/30 thresholds → 4 tiers (purple/yellow/green/blue/gray)

Quality-dependent formulas scattered:
- Sell value: `0.5 + (quality/100) * 1.5` (`craftingEngine.ts:282-288`, `craftingSlice.ts:457-458`)
- Buff scaling: `0.5 + quality/100` (`craftingEngine.ts:372-394`, `CheeseInventoryCard.tsx:127`)

### Stats (field-by-field addition)

**Problem**: HeroStats field-by-field operations duplicated 3+ times:

1. `Equipment.applyTo` (Equipment.ts:47-55):
```typescript
return {
  hp: baseStats.hp + this.getStatBonus('hp'),
  attack: baseStats.attack + this.getStatBonus('attack'),
  defense: baseStats.defense + this.getStatBonus('defense'),
  speed: baseStats.speed + this.getStatBonus('speed'),
  cheeseAffinity: baseStats.cheeseAffinity + this.getStatBonus('cheeseAffinity'),
};
```

2. `Hero.getStatsAtLevel` (Hero.ts:51-59):
```typescript
return {
  hp: this.baseStats.hp + this.statGrowth.hp * levelBonus,
  attack: this.baseStats.attack + this.statGrowth.attack * levelBonus,
  // ... same pattern
};
```

3. Boss phase stat application (combatEngine.ts:325-334):
```typescript
if (phase.statModifiers.attack) stats.attack += phase.statModifiers.attack;
if (phase.statModifiers.defense) stats.defense += phase.statModifiers.defense;
// ... same pattern
```

### Multiplier vs Bonus Semantics

**Problem**: The codebase has two modifier semantics (per GLOSSARY.md) that are silently confused:
- **Multiplier**: neutral element is `1.0`, operation is `base * multiplier`
- **Bonus**: neutral element is `0`, operation is `base + bonus` or `base * (1 + bonus)`

The `1 + bonus` conversion pattern appears 8+ times in `productionEngine.ts` (lines 264, 314, 319, 323, 337, 372, 388) and `craftingEngine.ts:385`. No type-level enforcement distinguishes them.

### Language Residue

**Problem**: Remaining snake_case identifiers violate the ubiquitous language standard:

| Location | Current | Should Be |
|----------|---------|-----------|
| `types/game.ts:314` | `'skill'` in CombatLogEntry.type | `'ability'` |
| `types/game.ts:431` | `'single_ally'`, `'all_allies'`, etc. | `'singleAlly'`, `'allAllies'`, etc. |
| `types/game.ts:446` | `'damage_reduction'` | `'damageReduction'` |
| `types/game.ts:450` | `'all_debuffs'` | `'allDebuffs'` |
| `types/game.ts:451` | `'drop_rate_bonus'` | `'dropRateBonus'` |

Usage counts:
- `AbilityTargetType` snake_case: 37 in heroes.ts + 8 in combatEngine.ts
- `damage_reduction`: 5 in heroes.ts
- `drop_rate_bonus`: 3 in heroes.ts + 1 in combatEngine.ts
- `all_debuffs`: 4 in heroes.ts
- `'skill'` type: 4 in combatEngine.ts + 2 in CombatLog.tsx

## Desired End State

1. **Quality value object** encapsulates 1-100 invariant with tier derivation and formula methods
2. **Stats value object** provides `add()`, `scale()`, `addScaled()` replacing manual field operations
3. **Multiplier/Bonus branded types** enforce semantic correctness at compile time
4. **All identifiers use camelCase** per GLOSSARY.md ubiquitous language standard
5. Zero new runtime behavior changes except where explicitly noted

### Verification:
- `npm run typecheck` passes with no errors
- `npm run lint` passes
- `npm run build` succeeds
- All existing tests pass
- Manual spot-check: crafting quality display, combat log entries, hero stat calculations

## What We're NOT Doing

- Full Currency value objects for `curds`/`whey`/`rennet` (would touch 32+ files with Decimal imports)
- Runtime validation in value object constructors (TypeScript compile-time is sufficient)
- Changing any game balance formulas (only consolidating them)
- Migrating saved games for combat log type changes (combat logs aren't persisted)

---

## Phase 4.1: Quality Value Object

### Overview

Create a `Quality` value object that encapsulates the 1-100 bounded integer invariant, unifies tier derivation, and provides formula methods for sell value and buff scaling.

### Changes Required:

#### 1. Create Quality Value Object

**File**: `src/domain/valueObjects/Quality.ts` (new file)

```typescript
/**
 * Quality value object - represents cheese quality bounded to [1, 100].
 * Immutable. All operations return new Quality instances.
 */
export class Quality {
  private constructor(private readonly value: number) {}

  /**
   * Create a Quality from a raw number, clamping to [1, 100].
   */
  static of(raw: number): Quality {
    return new Quality(Math.max(1, Math.min(100, Math.round(raw))));
  }

  /**
   * Create a Quality that is already known to be valid (no clamping).
   * Use only when loading from validated storage.
   */
  static fromValid(value: number): Quality {
    return new Quality(value);
  }

  /** Raw numeric value (1-100) */
  toNumber(): number {
    return this.value;
  }

  /**
   * Quality tier for display purposes.
   * Thresholds: 90+ exceptional, 70+ high, 50+ good, 30+ standard, <30 poor
   */
  toTier(): 'exceptional' | 'high' | 'good' | 'standard' | 'poor' {
    if (this.value >= 90) return 'exceptional';
    if (this.value >= 70) return 'high';
    if (this.value >= 50) return 'good';
    if (this.value >= 30) return 'standard';
    return 'poor';
  }

  /**
   * Tailwind color class for quality display.
   */
  toColorClass(): string {
    switch (this.toTier()) {
      case 'exceptional': return 'text-purple-600';
      case 'high': return 'text-yellow-600';
      case 'good': return 'text-green-600';
      case 'standard': return 'text-blue-600';
      case 'poor': return 'text-gray-500';
    }
  }

  /**
   * Sell value multiplier: 0.5 + (quality/100) * 1.5
   * Range: 0.5 (quality 0) to 2.0 (quality 100)
   */
  toSellMultiplier(): number {
    return 0.5 + (this.value / 100) * 1.5;
  }

  /**
   * Buff effect scale: 0.5 + (quality/100)
   * Range: 0.5 (quality 0) to 1.5 (quality 100)
   */
  toBuffScale(): number {
    return 0.5 + this.value / 100;
  }

  /**
   * Add a bonus to quality, returning a new clamped Quality.
   */
  addBonus(bonus: number): Quality {
    return Quality.of(this.value + bonus);
  }
}
```

#### 2. Create Value Objects Index

**File**: `src/domain/valueObjects/index.ts` (new file)

```typescript
export { Quality } from './Quality';
```

#### 3. Update craftingEngine.ts

**File**: `src/systems/craftingEngine.ts`

**Change 1**: Remove inline clamping, use Quality.of() where quality is calculated.

```typescript
// Line 107-109: Keep clampQuality for backwards compat, but deprecate
/** @deprecated Use Quality.of() instead */
export function clampQuality(quality: number): number {
  return Math.max(1, Math.min(100, quality));
}
```

**Change 2**: Line 244 - replace inline clamp with Quality:
```typescript
// Before:
return Math.max(1, Math.min(100, quality));
// After:
return Quality.of(quality).toNumber();
```

**Change 3**: Lines 282-288 - use Quality.toSellMultiplier():
```typescript
// Before:
const qualityMultiplier = CHEESE_SELL_QUALITY_BASE + (quality / 100) * CHEESE_SELL_QUALITY_SCALE;
// After:
const qualityMultiplier = Quality.of(quality).toSellMultiplier();
```

Note: Remove CHEESE_SELL_QUALITY_BASE and CHEESE_SELL_QUALITY_SCALE from constants.ts after this change, or keep them if used elsewhere.

#### 4. Update craftingSlice.ts

**File**: `src/stores/slices/crafting/craftingSlice.ts`

**Change**: Line 303 - use Quality.of():
```typescript
// Before:
finalQuality = clampQuality(finalQuality);
// After:
import { Quality } from '../../../domain/valueObjects';
finalQuality = Quality.of(finalQuality).toNumber();
```

#### 5. Update CheeseInventoryCard.tsx

**File**: `src/components/ui/crafting/CheeseInventoryCard.tsx`

**Change 1**: Lines 117-122 - replace getQualityColor with Quality.toColorClass():
```typescript
// Before:
const getQualityColor = (quality: number) => {
  if (quality >= 90) return 'text-purple-600';
  // ...
};
// After:
import { Quality } from '../../../domain/valueObjects';
// Usage:
<span className={Quality.of(cheese.quality).toColorClass()}>
```

**Change 2**: Line 127 - replace inline buff formula:
```typescript
// Before:
const buffStrength = 0.5 + (quality / 100) * 1.0;
// After:
const buffStrength = Quality.of(quality).toBuffScale();
```

#### 6. Update accessibilityAnnouncer.ts

**File**: `src/systems/accessibilityAnnouncer.ts`

**Change**: Line 293 - use Quality.toTier():
```typescript
// Before:
const qualityTier = quality >= 90 ? 'exceptional' : quality >= 70 ? 'high' : quality >= 50 ? 'good' : 'standard';
// After:
import { Quality } from '../domain/valueObjects';
const qualityTier = Quality.of(quality).toTier();
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] New file exists: `src/domain/valueObjects/Quality.ts`
- [x] New file exists: `src/domain/valueObjects/index.ts`

#### Manual Verification:
- [ ] Craft a cheese and verify quality displays correctly
- [ ] Verify quality tier colors match expected (90+ purple, 70+ yellow, etc.)
- [ ] Verify sell value calculation unchanged
- [ ] Verify buff effects scale correctly with quality

---

## Phase 4.2: Stats Value Object

### Overview

Create a `Stats` value object that encapsulates HeroStats field operations, replacing the triplicated field-by-field addition pattern.

### Changes Required:

#### 1. Create Stats Value Object

**File**: `src/domain/valueObjects/Stats.ts` (new file)

```typescript
import type { HeroStats } from '../../types/game';

/**
 * Stats value object - immutable wrapper for HeroStats operations.
 * All operations return new Stats instances.
 */
export class Stats {
  private constructor(private readonly data: Readonly<HeroStats>) {}

  /**
   * Create Stats from a HeroStats object.
   */
  static of(stats: HeroStats): Stats {
    return new Stats({ ...stats });
  }

  /**
   * Create zero stats (identity for addition).
   */
  static zero(): Stats {
    return new Stats({ hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 });
  }

  /** Get the underlying HeroStats object (new copy). */
  toHeroStats(): HeroStats {
    return { ...this.data };
  }

  /** Get a specific stat value. */
  get(stat: keyof HeroStats): number {
    return this.data[stat];
  }

  /**
   * Add another Stats or partial HeroStats to this one.
   */
  add(other: Stats | Partial<HeroStats>): Stats {
    const otherData = other instanceof Stats ? other.data : other;
    return new Stats({
      hp: this.data.hp + (otherData.hp ?? 0),
      attack: this.data.attack + (otherData.attack ?? 0),
      defense: this.data.defense + (otherData.defense ?? 0),
      speed: this.data.speed + (otherData.speed ?? 0),
      cheeseAffinity: this.data.cheeseAffinity + (otherData.cheeseAffinity ?? 0),
    });
  }

  /**
   * Scale all stats by a factor.
   */
  scale(factor: number): Stats {
    return new Stats({
      hp: Math.floor(this.data.hp * factor),
      attack: Math.floor(this.data.attack * factor),
      defense: Math.floor(this.data.defense * factor),
      speed: Math.floor(this.data.speed * factor),
      cheeseAffinity: Math.floor(this.data.cheeseAffinity * factor),
    });
  }

  /**
   * Add scaled stats: this + (other * scale).
   * Useful for level-up calculations: base + growth * levelBonus.
   */
  addScaled(other: Stats | HeroStats, scale: number): Stats {
    const otherData = other instanceof Stats ? other.data : other;
    return new Stats({
      hp: this.data.hp + otherData.hp * scale,
      attack: this.data.attack + otherData.attack * scale,
      defense: this.data.defense + otherData.defense * scale,
      speed: this.data.speed + otherData.speed * scale,
      cheeseAffinity: this.data.cheeseAffinity + otherData.cheeseAffinity * scale,
    });
  }

  /**
   * Apply a floor to all stats (e.g., after scaling).
   */
  floor(): Stats {
    return new Stats({
      hp: Math.floor(this.data.hp),
      attack: Math.floor(this.data.attack),
      defense: Math.floor(this.data.defense),
      speed: Math.floor(this.data.speed),
      cheeseAffinity: Math.floor(this.data.cheeseAffinity),
    });
  }

  /**
   * Ensure all stats are at least a minimum value.
   */
  min(minValue: number): Stats {
    return new Stats({
      hp: Math.max(minValue, this.data.hp),
      attack: Math.max(minValue, this.data.attack),
      defense: Math.max(minValue, this.data.defense),
      speed: Math.max(minValue, this.data.speed),
      cheeseAffinity: Math.max(minValue, this.data.cheeseAffinity),
    });
  }
}
```

#### 2. Update Value Objects Index

**File**: `src/domain/valueObjects/index.ts`

```typescript
export { Quality } from './Quality';
export { Stats } from './Stats';
```

#### 3. Update Equipment.ts

**File**: `src/domain/entities/Equipment.ts`

```typescript
// Add import:
import { Stats } from '../valueObjects';

// Replace applyTo method (lines 47-55):
applyTo(baseStats: HeroStats): HeroStats {
  return Stats.of(baseStats).add(this.stats).toHeroStats();
}
```

#### 4. Update Hero.ts

**File**: `src/domain/entities/Hero.ts`

```typescript
// Add import:
import { Stats } from '../valueObjects';

// Replace getStatsAtLevel method (lines 51-60):
getStatsAtLevel(level: number): HeroStats {
  const levelBonus = Math.max(0, level - 1);
  return Stats.of(this.baseStats).addScaled(this.statGrowth, levelBonus).toHeroStats();
}

// getFullStats can stay as-is since it uses applyTo which now uses Stats internally
```

#### 5. Update combatEngine.ts getBossEffectiveStats

**File**: `src/systems/combatEngine.ts`

```typescript
// Add import at top:
import { Stats } from '../domain/valueObjects';

// Replace getBossEffectiveStats function (lines 319-337):
export function getBossEffectiveStats(
  enemy: CombatEnemy,
  bossDef: BossDefinition
): HeroStats {
  let stats = Stats.of(bossDef.stats);
  
  for (const phase of bossDef.phases) {
    if (enemy.phaseTriggered?.[phase.phaseNumber] && phase.statModifiers) {
      stats = stats.add(phase.statModifiers);
    }
  }
  
  return stats.toHeroStats();
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] New file exists: `src/domain/valueObjects/Stats.ts`

#### Manual Verification:
- [ ] Hero stats display correctly at different levels
- [ ] Equipment stat bonuses apply correctly
- [ ] Boss phase stat modifiers work in combat
- [ ] No stat calculation regressions

---

## Phase 4.3: Multiplier/Bonus Type Distinction

### Overview

Create branded types for `Multiplier` and `Bonus` to enforce the semantic distinction at compile time. A `Multiplier` has neutral element `1.0` (scales via `*`), while a `Bonus` has neutral element `0` (adds via `+` or converts to multiplier via `1 + bonus`).

### Changes Required:

#### 1. Create Multiplier/Bonus Types

**File**: `src/domain/valueObjects/Modifier.ts` (new file)

```typescript
/**
 * Branded type for multiplicative modifiers.
 * Neutral element: 1.0 (no change)
 * Operation: base * multiplier
 */
export type Multiplier = number & { readonly __brand: 'Multiplier' };

/**
 * Branded type for additive bonuses.
 * Neutral element: 0 (no change)
 * Operation: base + bonus OR base * (1 + bonus)
 */
export type Bonus = number & { readonly __brand: 'Bonus' };

export const Multiplier = {
  /** Create a Multiplier from a raw number. */
  of(value: number): Multiplier {
    return value as Multiplier;
  },

  /** Neutral element (no change). */
  identity(): Multiplier {
    return 1 as Multiplier;
  },

  /** Combine multipliers: a * b */
  combine(a: Multiplier, b: Multiplier): Multiplier {
    return (a * b) as Multiplier;
  },

  /** Apply multiplier to a base value. */
  apply(base: number, multiplier: Multiplier): number {
    return base * multiplier;
  },
} as const;

export const Bonus = {
  /** Create a Bonus from a raw decimal (0.1 = 10%). */
  of(value: number): Bonus {
    return value as Bonus;
  },

  /** Create a Bonus from a percentage (10 = 10%). */
  ofPercent(percent: number): Bonus {
    return (percent / 100) as Bonus;
  },

  /** Neutral element (no change). */
  identity(): Bonus {
    return 0 as Bonus;
  },

  /** Combine bonuses: a + b */
  combine(a: Bonus, b: Bonus): Bonus {
    return (a + b) as Bonus;
  },

  /** Convert bonus to multiplier: 1 + bonus */
  toMultiplier(bonus: Bonus): Multiplier {
    return (1 + bonus) as Multiplier;
  },

  /** Apply bonus additively to a base value. */
  applyAdditive(base: number, bonus: Bonus): number {
    return base + bonus;
  },

  /** Apply bonus as a multiplier: base * (1 + bonus) */
  applyMultiplicative(base: number, bonus: Bonus): number {
    return base * (1 + bonus);
  },
} as const;
```

#### 2. Update Value Objects Index

**File**: `src/domain/valueObjects/index.ts`

```typescript
export { Quality } from './Quality';
export { Stats } from './Stats';
export { Multiplier, Bonus } from './Modifier';
export type { Multiplier as MultiplierType, Bonus as BonusType } from './Modifier';
```

#### 3. Update productionEngine.ts (example conversions)

**File**: `src/systems/productionEngine.ts`

This phase provides the types; full adoption across 8+ sites is optional for now. Key example:

```typescript
// Add import:
import { Bonus } from '../domain/valueObjects';

// Line 314 example - before:
multiplier *= 1 + upgrade.effect.value;
// After:
multiplier *= Bonus.toMultiplier(Bonus.of(upgrade.effect.value));

// Or more readably, accumulate bonuses first:
const bonus = Bonus.of(upgrade.effect.value);
multiplier = Multiplier.combine(multiplier, Bonus.toMultiplier(bonus));
```

**Note**: Full conversion of all 8 sites is not required in this phase. The value objects provide the infrastructure; teams can adopt incrementally.

#### 4. Update GLOSSARY.md

**File**: `docs/GLOSSARY.md`

Add reference to new value objects:

```markdown
## Value Modifiers

| Canonical Term | Definition | Operation | Type |
|----------------|------------|-----------|------|
| `*Multiplier` | Scales a value | `base * multiplier` | `Multiplier` (branded type) |
| `*Bonus` | Adds to a value | `base + bonus` or `base * (1 + bonus)` | `Bonus` (branded type) |
| `*Modifier` | Additive stat adjustment | `stat + modifier` | plain `number` |
| `*Scale` | Multiplicative scaling factor | `base * scale` | plain `number` |

### Implementation Notes:
- Use `Multiplier.of(1.5)` for multiplicative values (neutral = 1.0)
- Use `Bonus.of(0.1)` or `Bonus.ofPercent(10)` for additive percentages (neutral = 0)
- Convert bonus to multiplier: `Bonus.toMultiplier(bonus)` returns `1 + bonus`
- See `src/domain/valueObjects/Modifier.ts` for full API
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] New file exists: `src/domain/valueObjects/Modifier.ts`

#### Manual Verification:
- [ ] Production multipliers calculate correctly
- [ ] Click bonuses apply correctly
- [ ] No gameplay changes from this phase

---

## Phase 4.4: Language Residue Cleanup

### Overview

Convert remaining snake_case identifiers to camelCase per the ubiquitous language standard in GLOSSARY.md. This is a mechanical find-and-replace operation with no behavior changes.

**Important**: Combat logs are NOT persisted (`saveSystem.ts:162` resets to empty array on load), so no save migration is needed for the `'skill'` → `'ability'` change.

### Changes Required:

#### 1. Update CombatLogEntry Type

**File**: `src/types/game.ts`

**Line 314**: Change `'skill'` to `'ability'`:
```typescript
// Before:
type: 'attack' | 'skill' | 'damage' | 'heal' | 'status' | 'defeat' | 'victory' | 'phase_change';
// After:
type: 'attack' | 'ability' | 'damage' | 'heal' | 'status' | 'defeat' | 'victory' | 'phaseChange';
```

Note: Also change `'phase_change'` to `'phaseChange'` for consistency.

#### 2. Update AbilityTargetType

**File**: `src/types/game.ts`

**Line 431**: Convert to camelCase:
```typescript
// Before:
export type AbilityTargetType = 'self' | 'single_ally' | 'all_allies' | 'single_enemy' | 'all_enemies';
// After:
export type AbilityTargetType = 'self' | 'singleAlly' | 'allAllies' | 'singleEnemy' | 'allEnemies';
```

#### 3. Update AbilityEffect Types

**File**: `src/types/game.ts`

**Lines 446, 450, 451**: Convert to camelCase:
```typescript
// Before (line 446):
| { type: 'buff'; stat: keyof HeroStats | 'damage_reduction'; value: number; duration: number }
// After:
| { type: 'buff'; stat: keyof HeroStats | 'damageReduction'; value: number; duration: number }

// Before (line 450):
| { type: 'immunity'; immunityType: 'freeze' | 'slow' | 'all_debuffs'; duration: number }
// After:
| { type: 'immunity'; immunityType: 'freeze' | 'slow' | 'allDebuffs'; duration: number }

// Before (line 451):
| { type: 'drop_rate_bonus'; value: number; duration: number };
// After:
| { type: 'dropRateBonus'; value: number; duration: number };
```

#### 4. Update CombatLog.tsx

**File**: `src/components/ui/CombatLog.tsx`

**Lines 4-13, 15-24**: Rename `skill` to `ability`, add `phaseChange`:
```typescript
const LOG_TYPE_COLORS: Record<CombatLogEntry['type'], string> = {
  attack: 'text-timber-700',
  ability: 'text-purple-600',  // was 'skill'
  damage: 'text-red-600',
  heal: 'text-green-600',
  status: 'text-amber-600',
  defeat: 'text-red-700 font-semibold',
  victory: 'text-cheddar-600 font-bold',
  phaseChange: 'text-purple-700 font-semibold',  // was 'phase_change'
};

const LOG_TYPE_ICONS: Record<CombatLogEntry['type'], string> = {
  attack: '⚔️',
  ability: '✨',  // was 'skill'
  damage: '💥',
  heal: '💚',
  status: '🔮',
  defeat: '💀',
  victory: '🎉',
  phaseChange: '⚠️',  // was 'phase_change'
};
```

#### 5. Update combatEngine.ts

**File**: `src/systems/combatEngine.ts`

**Lines 437, 1169, 1420, 1522**: Change `type: 'skill'` to `type: 'ability'`:
```typescript
// Line 437 (boss summon):
type: 'ability',  // was 'skill'

// Line 1169 (ability damage):
type: 'ability',  // was 'skill'

// Line 1420 (ability activation):
type: 'ability',  // was 'skill'

// Line 1522 (limit break):
type: 'ability',  // was 'skill'
```

**Lines 1155, 1192, 1223, 1254, 1310, 1354, 1537**: Update target type comparisons:
```typescript
// Before:
targetType === 'all_enemies'
targetType === 'all_allies'
// After:
targetType === 'allEnemies'
targetType === 'allAllies'
```

**Line 1339**: Update effect type:
```typescript
// Before:
case 'drop_rate_bonus':
// After:
case 'dropRateBonus':
```

#### 6. Update heroes.ts

**File**: `src/data/heroes.ts`

Mass find-and-replace (37 target type changes, 12 effect type changes):

| Find | Replace |
|------|---------|
| `'single_ally'` | `'singleAlly'` |
| `'all_allies'` | `'allAllies'` |
| `'single_enemy'` | `'singleEnemy'` |
| `'all_enemies'` | `'allEnemies'` |
| `'damage_reduction'` | `'damageReduction'` |
| `'drop_rate_bonus'` | `'dropRateBonus'` |
| `'all_debuffs'` | `'allDebuffs'` |

#### 7. Update GLOSSARY.md

**File**: `docs/GLOSSARY.md`

Add/update entries:

```markdown
## Ability Target Types (camelCase)

| Canonical Term | Definition |
|----------------|------------|
| `'self'` | Targets the ability user |
| `'singleAlly'` | Targets one ally |
| `'allAllies'` | Targets all allies |
| `'singleEnemy'` | Targets one enemy |
| `'allEnemies'` | Targets all enemies |

## Combat Log Entry Types (camelCase)

| Canonical Term | Definition |
|----------------|------------|
| `'ability'` | Hero or enemy ability activation (NOT 'skill') |
| `'phaseChange'` | Boss phase transition |
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes (this validates all usages updated)
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -r "single_ally\|all_allies\|single_enemy\|all_enemies" src/` returns no matches
- [x] `grep -r "'skill'" src/` returns no matches (in type contexts)
- [x] `grep -r "damage_reduction\|drop_rate_bonus\|all_debuffs" src/` returns no matches

#### Manual Verification:
- [ ] Combat log displays ability activations correctly
- [ ] Boss phase changes appear in combat log
- [ ] Hero abilities target correctly (self, single, all)
- [ ] Debuff immunity effects work

---

## Testing Strategy

### Unit Tests:

Each value object should have unit tests:

1. **Quality tests** (`src/domain/valueObjects/__tests__/Quality.test.ts`):
   - `Quality.of()` clamps values correctly (0→1, 150→100, 50→50)
   - `toTier()` returns correct tier for boundary values
   - `toSellMultiplier()` returns expected values
   - `toBuffScale()` returns expected values
   - `addBonus()` clamps result

2. **Stats tests** (`src/domain/valueObjects/__tests__/Stats.test.ts`):
   - `Stats.add()` adds fields correctly
   - `Stats.scale()` scales and floors
   - `Stats.addScaled()` combines add and scale
   - `Stats.zero()` is identity for add

3. **Modifier tests** (`src/domain/valueObjects/__tests__/Modifier.test.ts`):
   - `Multiplier.identity()` is 1
   - `Bonus.identity()` is 0
   - `Bonus.toMultiplier()` returns `1 + bonus`
   - `Multiplier.combine()` multiplies correctly

### Integration Tests:

- Existing combat tests should pass without modification
- Existing crafting tests should pass without modification

### Manual Testing Steps:

1. Start the game, craft several cheeses of varying quality
2. Verify quality tier colors display correctly
3. Sell cheese and verify value calculation
4. Enter combat and use hero abilities
5. Verify combat log shows "ability" entries with correct styling
6. Fight a boss and verify phase changes appear in log
7. Level up a hero and verify stat increases are correct
8. Equip items and verify stat bonuses apply

---

## Performance Considerations

- Value objects are lightweight wrappers; no performance impact expected
- `Stats.add()` creates new objects but HeroStats is only 5 fields
- No hot-path changes (combat tick, production tick remain unchanged)

---

## Migration Notes

**No save migration required.** Combat logs are not persisted (reset on load). All other changes are type-level only and don't affect serialized state.

If a future phase adds persistent combat history, a migration would be needed at that time.

---

## References

- Research document: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Ubiquitous language: `docs/GLOSSARY.md`
- Prior DDD analysis: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Domain entities: `src/domain/entities/`
- Type definitions: `src/types/game.ts`

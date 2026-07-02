# Anemic Domain Model Refactoring Plan

## Overview

Refactor all 7 domain entities (Generator, Hero, Recipe, Zone, Equipment, Enemy, Upgrade) from pure data bags into rich domain models that encapsulate their own behavior. This eliminates 133+ scattered `getXxxById()` lookup calls and consolidates business logic into cohesive, self-contained entities.

## Current State Analysis

All domain entities are **anemic data bags**:

| Entity | Data File | Type Definition | Behavior Location |
|--------|-----------|-----------------|-------------------|
| Generator | [generators.ts](src/data/generators.ts) | [game.ts:106-114](src/types/game.ts#L106-L114) | productionEngine.ts, gameStore.ts |
| Hero | [heroes.ts](src/data/heroes.ts) | [game.ts:214-229](src/types/game.ts#L214-L229) | productionEngine.ts, combatEngine.ts, gameStore.ts |
| Recipe | [cheeseRecipes.ts](src/data/cheeseRecipes.ts) | [game.ts:496](src/types/game.ts#L496) | craftingEngine.ts, gameStore.ts |
| Zone | [zones.ts](src/data/zones.ts) | [game.ts:375-406](src/types/game.ts#L375-L406) | combatEngine.ts, gameStore.ts |
| Equipment | [equipment.ts](src/data/equipment.ts) | [game.ts:239-248](src/types/game.ts#L239-L248) | productionEngine.ts, gameStore.ts |
| Enemy | [enemies.ts](src/data/enemies.ts) | [game.ts:323-350](src/types/game.ts#L323-L350) | combatEngine.ts |
| Upgrade | [upgrades.ts](src/data/upgrades.ts) | [game.ts:116-135](src/types/game.ts#L116-L135) | productionEngine.ts, gameStore.ts |

**Problem**: 133 `getXxxById()` calls scattered across 13 files. Business logic is procedural and duplicated.

**Example - Tell Don't Ask violation** at [productionEngine.ts:36-61](src/systems/productionEngine.ts#L36-L61):
```typescript
// CURRENT: External function asks for data, then operates on it
export function calculateGeneratorCost(generatorId: string, owned: number, count: number): Decimal {
  const generator = getGeneratorById(generatorId);  // Ask
  if (!generator) return new Decimal(Infinity);
  const { baseCost, costMultiplier } = generator;   // Extract
  // ... 20 lines of calculation                    // Process externally
}

// DESIRED: Generator knows how to calculate its own cost
generator.getCost(owned, count);  // Tell
```

## Desired End State

1. **Rich domain models** with encapsulated behavior in `src/domain/`
2. **Lookup registry** with O(1) access replacing O(n) `.find()` calls
3. **Engine functions refactored** to delegate to domain methods
4. **133 getXxxById() calls eliminated** or reduced to registry lookups
5. **Type safety preserved** - domain classes implement existing interfaces

**Verification**:
- `npm run typecheck` passes
- `npm run lint` passes
- All existing functionality works identically (manual testing)
- No performance regression in game loop

## What We're NOT Doing

- **Not splitting gameStore.ts** into bounded context slices (separate plan)
- **Not introducing event sourcing** or CQRS patterns
- **Not changing the game loop architecture** (100ms ticks)
- **Not modifying save/load format** (domain models serialize to same JSON)
- **Not adding new features** - pure refactoring for same behavior
- **Not converting to classes everywhere** - only domain entities get rich behavior

## Implementation Approach

We'll use a **class-based approach** compatible with React/Zustand immutability:
1. Domain classes are **immutable** - methods return new instances
2. Classes implement existing TypeScript interfaces for backwards compatibility
3. A central **Registry** provides O(1) lookup by ID
4. Existing engine functions become thin wrappers or are deprecated

**Why classes over factory functions?**
- Easier to read and maintain (`generator.getCost()` vs `getGeneratorCost(generator)`)
- IDE autocomplete and discovery
- Natural place for static factory methods (`Generator.fromDefinition()`)

---

## Phase 1: Create Domain Infrastructure

### Overview

Set up the domain directory structure and create the base Registry pattern for O(1) lookups.

### Changes Required:

#### 1. Create domain directory structure

**New Directories**:
```
src/domain/
src/domain/entities/
src/domain/registry/
```

#### 2. Create base Entity class

**File**: `src/domain/entities/BaseEntity.ts`

```typescript
/**
 * Base class for all domain entities.
 * Provides common ID-based identity and immutability patterns.
 */
export abstract class BaseEntity<T extends { id: string }> {
  protected readonly data: Readonly<T>;

  constructor(data: T) {
    this.data = Object.freeze({ ...data });
  }

  get id(): string {
    return this.data.id;
  }

  /**
   * Create a new instance with updated data (immutable update)
   */
  protected abstract withData(updates: Partial<T>): this;

  /**
   * Serialize to plain object for persistence
   */
  toJSON(): T {
    return { ...this.data };
  }
}
```

#### 3. Create EntityRegistry

**File**: `src/domain/registry/EntityRegistry.ts`

```typescript
/**
 * Generic registry for O(1) entity lookup by ID.
 * Replaces scattered getXxxById() functions.
 */
export class EntityRegistry<T extends { id: string }> {
  private readonly byId: Map<string, T>;
  private readonly all: readonly T[];

  constructor(entities: readonly T[]) {
    this.all = entities;
    this.byId = new Map(entities.map(e => [e.id, e]));
  }

  get(id: string): T | undefined {
    return this.byId.get(id);
  }

  getOrThrow(id: string): T {
    const entity = this.byId.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    return entity;
  }

  getAll(): readonly T[] {
    return this.all;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get size(): number {
    return this.byId.size;
  }
}
```

#### 4. Create domain barrel export

**File**: `src/domain/index.ts`

```typescript
// Entities
export { BaseEntity } from './entities/BaseEntity';

// Registry
export { EntityRegistry } from './registry/EntityRegistry';

// Individual entity exports will be added in subsequent phases
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Files exist: `src/domain/entities/BaseEntity.ts`, `src/domain/registry/EntityRegistry.ts`

#### Manual Verification:
- [x] N/A - infrastructure only, no behavioral changes

---

## Phase 2: Refactor Generator Entity

### Overview

Convert Generator from a plain interface to a rich domain model with cost calculation encapsulated.

### Changes Required:

#### 1. Create Generator domain class

**File**: `src/domain/entities/Generator.ts`

```typescript
import Decimal from 'decimal.js';
import type { Generator as GeneratorData } from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Generator.
 * Encapsulates cost calculation and CPS contribution logic.
 */
export class Generator extends BaseEntity<GeneratorData> implements GeneratorData {
  // Expose interface properties
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get baseCost(): Decimal { return this.data.baseCost; }
  get baseCps(): Decimal { return this.data.baseCps; }
  get costMultiplier(): number { return this.data.costMultiplier; }
  get icon(): string | undefined { return this.data.icon; }

  protected withData(updates: Partial<GeneratorData>): this {
    return new Generator({ ...this.data, ...updates }) as this;
  }

  /**
   * Calculate cost to buy `count` generators when `owned` are already owned.
   * Geometric series: baseCost * m^owned * (m^count - 1) / (m - 1)
   */
  getCost(owned: number, count: number = 1): Decimal {
    const m = this.costMultiplier;
    const mPowOwned = new Decimal(m).pow(owned);
    const mPowCount = new Decimal(m).pow(count);
    const numerator = mPowCount.minus(1);
    const denominator = new Decimal(m).minus(1);

    if (denominator.isZero()) {
      return this.baseCost.mul(count).floor();
    }

    return this.baseCost.mul(mPowOwned).mul(numerator.div(denominator)).floor();
  }

  /**
   * Calculate CPS contribution from this generator type.
   */
  getCps(owned: number, multiplier: number = 1): Decimal {
    if (owned <= 0) return new Decimal(0);
    return this.baseCps.mul(owned).mul(multiplier);
  }

  /**
   * Calculate maximum affordable count given available curds.
   */
  getMaxAffordable(owned: number, curds: Decimal): number {
    let low = 0;
    let high = 100000;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (curds.gte(this.getCost(owned, mid))) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  /**
   * Factory method to create from plain data
   */
  static fromDefinition(data: GeneratorData): Generator {
    return new Generator(data);
  }
}
```

#### 2. Create Generator registry

**File**: `src/domain/registry/generators.ts`

```typescript
import { GENERATORS } from '../../data/generators';
import { Generator } from '../entities/Generator';
import { EntityRegistry } from './EntityRegistry';

// Create rich domain models from static data
const generatorEntities = GENERATORS.map(Generator.fromDefinition);

// Export registry for O(1) lookup
export const generatorRegistry = new EntityRegistry(generatorEntities);

// Re-export for convenience
export { Generator };
```

#### 3. Update domain barrel export

**File**: `src/domain/index.ts` (append)

```typescript
// Generator
export { Generator } from './entities/Generator';
export { generatorRegistry } from './registry/generators';
```

#### 4. Refactor productionEngine.ts to use Generator domain

**File**: `src/systems/productionEngine.ts`

Replace:
```typescript
import { GENERATORS, getGeneratorById } from '../data/generators';
```

With:
```typescript
import { generatorRegistry, Generator } from '../domain';
```

Update `calculateGeneratorCost`:
```typescript
export function calculateGeneratorCost(
  generatorId: string,
  owned: number,
  count: number
): Decimal {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return new Decimal(Infinity);
  return generator.getCost(owned, count);
}
```

Update `calculateMaxAffordable`:
```typescript
export function calculateMaxAffordable(
  generatorId: string,
  owned: number,
  curds: Decimal
): number {
  const generator = generatorRegistry.get(generatorId);
  if (!generator) return 0;
  return generator.getMaxAffordable(owned, curds);
}
```

Update `calculateCps`:
```typescript
export function calculateCps(
  ownedGenerators: Record<string, number>,
  generatorMultipliers: Record<string, number> = {},
  globalMultiplier: number = 1
): Decimal {
  let totalCps = new Decimal(0);

  for (const generator of generatorRegistry.getAll()) {
    const owned = ownedGenerators[generator.id] ?? 0;
    if (owned > 0) {
      const multiplier = generatorMultipliers[generator.id] ?? 1;
      totalCps = totalCps.plus(generator.getCps(owned, multiplier));
    }
  }

  return totalCps.mul(globalMultiplier);
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Generator.ts`

#### Manual Verification:
- [ ] Generator purchase works correctly in game
- [ ] Generator cost scaling matches previous behavior
- [ ] CPS calculation unchanged (compare before/after values)
- [ ] Bulk purchase (buy max) works correctly

---

## Phase 3: Refactor Upgrade Entity

### Overview

Convert Upgrade to a rich domain model with effect application encapsulated.

### Changes Required:

#### 1. Create Upgrade domain class

**File**: `src/domain/entities/Upgrade.ts`

```typescript
import Decimal from 'decimal.js';
import type { Upgrade as UpgradeData, UpgradeEffect, UpgradeRequirement } from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Upgrade.
 * Encapsulates requirement checking and effect application.
 */
export class Upgrade extends BaseEntity<UpgradeData> implements UpgradeData {
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get cost(): Decimal { return this.data.cost; }
  get costCurrency(): 'curds' | 'whey' { return this.data.costCurrency; }
  get effect(): UpgradeEffect { return this.data.effect; }
  get requirement(): UpgradeRequirement | undefined { return this.data.requirement; }

  protected withData(updates: Partial<UpgradeData>): this {
    return new Upgrade({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if this upgrade's requirement is met.
   */
  isUnlocked(ownedGenerators: Record<string, number>): boolean {
    if (!this.requirement) return true;

    if (this.requirement.type === 'generatorOwned') {
      const owned = ownedGenerators[this.requirement.generatorId] ?? 0;
      return owned >= this.requirement.count;
    }

    return true;
  }

  /**
   * Check if player can afford this upgrade.
   */
  canAfford(curds: Decimal, whey: Decimal): boolean {
    const currency = this.costCurrency === 'curds' ? curds : whey;
    return currency.gte(this.cost);
  }

  /**
   * Check if this upgrade affects a specific generator.
   */
  affectsGenerator(generatorId: string): boolean {
    return this.effect.type === 'generatorMultiplier' && 
           this.effect.generatorId === generatorId;
  }

  /**
   * Get the multiplier value if this is a multiplier upgrade.
   */
  getMultiplierValue(): number {
    if (this.effect.type === 'clickMultiplier' ||
        this.effect.type === 'generatorMultiplier' ||
        this.effect.type === 'globalMultiplier') {
      return this.effect.value;
    }
    return 1;
  }

  static fromDefinition(data: UpgradeData): Upgrade {
    return new Upgrade(data);
  }
}
```

#### 2. Create Upgrade registry

**File**: `src/domain/registry/upgrades.ts`

```typescript
import { UPGRADES } from '../../data/upgrades';
import { Upgrade } from '../entities/Upgrade';
import { EntityRegistry } from './EntityRegistry';

const upgradeEntities = UPGRADES.map(Upgrade.fromDefinition);

export const upgradeRegistry = new EntityRegistry(upgradeEntities);

export { Upgrade };
```

#### 3. Update domain barrel export

**File**: `src/domain/index.ts` (append)

```typescript
// Upgrade
export { Upgrade } from './entities/Upgrade';
export { upgradeRegistry } from './registry/upgrades';
```

#### 4. Refactor productionEngine.ts upgrade functions

**File**: `src/systems/productionEngine.ts`

Replace `getUpgradeById` usage:
```typescript
import { upgradeRegistry } from '../domain';
```

Update multiplier calculation functions:
```typescript
export function calculateClickMultiplier(purchasedUpgradeIds: string[]): number {
  let multiplier = 1;
  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'clickMultiplier') {
      multiplier *= upgrade.getMultiplierValue();
    }
  }
  return multiplier;
}

export function calculateGeneratorMultipliers(
  purchasedUpgradeIds: string[]
): Record<string, number> {
  const multipliers: Record<string, number> = {};
  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'generatorMultiplier') {
      const { generatorId, value } = upgrade.effect;
      multipliers[generatorId] = (multipliers[generatorId] ?? 1) * value;
    }
  }
  return multipliers;
}

export function calculateGlobalMultiplier(purchasedUpgradeIds: string[]): number {
  let multiplier = 1;
  for (const upgradeId of purchasedUpgradeIds) {
    const upgrade = upgradeRegistry.get(upgradeId);
    if (upgrade?.effect.type === 'globalMultiplier') {
      multiplier *= upgrade.getMultiplierValue();
    }
  }
  return multiplier;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Upgrade.ts`

#### Manual Verification:
- [ ] Upgrade purchase works correctly
- [ ] Upgrade effects apply correctly (click, generator, global multipliers)
- [ ] Upgrade unlock requirements work (show/hide based on generator count)

---

## Phase 4: Refactor Equipment Entity

### Overview

Convert Equipment to a rich domain model with stat calculation encapsulated.

### Changes Required:

#### 1. Create Equipment domain class

**File**: `src/domain/entities/Equipment.ts`

```typescript
import Decimal from 'decimal.js';
import type { Equipment as EquipmentData, EquipmentSlot, EquipmentRarity, HeroStats } from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Equipment.
 * Encapsulates stat bonuses and slot compatibility.
 */
export class Equipment extends BaseEntity<EquipmentData> implements EquipmentData {
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get slot(): EquipmentSlot { return this.data.slot; }
  get rarity(): EquipmentRarity { return this.data.rarity; }
  get stats(): Partial<HeroStats> { return this.data.stats; }
  get cost(): Decimal { return this.data.cost; }
  get icon(): string { return this.data.icon; }

  protected withData(updates: Partial<EquipmentData>): this {
    return new Equipment({ ...this.data, ...updates }) as this;
  }

  /**
   * Get stat bonus for a specific stat.
   */
  getStatBonus(stat: keyof HeroStats): number {
    return this.stats[stat] ?? 0;
  }

  /**
   * Apply this equipment's stats to base stats.
   */
  applyTo(baseStats: HeroStats): HeroStats {
    return {
      hp: baseStats.hp + this.getStatBonus('hp'),
      attack: baseStats.attack + this.getStatBonus('attack'),
      defense: baseStats.defense + this.getStatBonus('defense'),
      speed: baseStats.speed + this.getStatBonus('speed'),
      cheeseAffinity: baseStats.cheeseAffinity + this.getStatBonus('cheeseAffinity'),
    };
  }

  /**
   * Get rarity color for UI display.
   */
  getRarityColor(): string {
    switch (this.rarity) {
      case 'common': return '#9ca3af';    // gray
      case 'uncommon': return '#22c55e';  // green
      case 'rare': return '#3b82f6';      // blue
      default: return '#9ca3af';
    }
  }

  static fromDefinition(data: EquipmentData): Equipment {
    return new Equipment(data);
  }
}
```

#### 2. Create Equipment registry

**File**: `src/domain/registry/equipment.ts`

```typescript
import { EQUIPMENT } from '../../data/equipment';
import { Equipment } from '../entities/Equipment';
import { EntityRegistry } from './EntityRegistry';

const equipmentEntities = EQUIPMENT.map(Equipment.fromDefinition);

export const equipmentRegistry = new EntityRegistry(equipmentEntities);

export { Equipment };
```

#### 3. Update productionEngine.ts to use Equipment domain

Replace equipment stat calculation in `calculateHeroStats`:
```typescript
import { equipmentRegistry } from '../domain';

export function calculateHeroStats(heroId: string, heroState: HeroState): HeroStats {
  const heroDef = heroRegistry.get(heroId);
  if (!heroDef) {
    return { hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 };
  }

  // Start with base stats + level growth
  let stats: HeroStats = { ...heroDef.baseStats };
  const levelBonus = heroState.level - 1;
  stats.hp += heroDef.statGrowth.hp * levelBonus;
  stats.attack += heroDef.statGrowth.attack * levelBonus;
  stats.defense += heroDef.statGrowth.defense * levelBonus;
  stats.speed += heroDef.statGrowth.speed * levelBonus;
  stats.cheeseAffinity += heroDef.statGrowth.cheeseAffinity * levelBonus;

  // Apply equipment bonuses using domain model
  for (const equipmentId of Object.values(heroState.equipment)) {
    if (equipmentId) {
      const equipment = equipmentRegistry.get(equipmentId);
      if (equipment) {
        stats = equipment.applyTo(stats);
      }
    }
  }

  return stats;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Equipment.ts`

#### Manual Verification:
- [ ] Equipment can be purchased from shop
- [ ] Equipment can be equipped on heroes
- [ ] Hero stats reflect equipped items correctly
- [ ] Equipment rarity colors display correctly

---

## Phase 5: Refactor Hero Entity

### Overview

Convert Hero to a rich domain model. This is the most complex entity with stats, abilities, and equipment integration.

### Changes Required:

#### 1. Create Hero domain class

**File**: `src/domain/entities/Hero.ts`

```typescript
import Decimal from 'decimal.js';
import type { 
  HeroDefinition, HeroStats, HeroState, HeroClass, Province 
} from '../../types/game';
import { BaseEntity } from './BaseEntity';
import { equipmentRegistry } from '../registry/equipment';
import { HERO_XP_BASE, HERO_XP_MULTIPLIER, HERO_MAX_LEVEL } from '../../data/heroes';

/**
 * Rich domain model for Hero definition.
 * Encapsulates stat calculation, XP progression, and ability logic.
 */
export class Hero extends BaseEntity<HeroDefinition> implements HeroDefinition {
  get name(): string { return this.data.name; }
  get title(): string { return this.data.title; }
  get class(): HeroClass { return this.data.class; }
  get province(): Province { return this.data.province; }
  get description(): string { return this.data.description; }
  get specialAbility(): { name: string; description: string } { return this.data.specialAbility; }
  get baseStats(): HeroStats { return this.data.baseStats; }
  get statGrowth(): HeroStats { return this.data.statGrowth; }
  get recruitCost(): Decimal { return this.data.recruitCost; }
  get icon(): string { return this.data.icon; }

  protected withData(updates: Partial<HeroDefinition>): this {
    return new Hero({ ...this.data, ...updates }) as this;
  }

  /**
   * Calculate stats at a given level (without equipment).
   */
  getStatsAtLevel(level: number): HeroStats {
    const levelBonus = Math.max(0, level - 1);
    return {
      hp: this.baseStats.hp + this.statGrowth.hp * levelBonus,
      attack: this.baseStats.attack + this.statGrowth.attack * levelBonus,
      defense: this.baseStats.defense + this.statGrowth.defense * levelBonus,
      speed: this.baseStats.speed + this.statGrowth.speed * levelBonus,
      cheeseAffinity: this.baseStats.cheeseAffinity + this.statGrowth.cheeseAffinity * levelBonus,
    };
  }

  /**
   * Calculate full stats including equipment.
   */
  getFullStats(heroState: HeroState): HeroStats {
    let stats = this.getStatsAtLevel(heroState.level);

    for (const equipmentId of Object.values(heroState.equipment)) {
      if (equipmentId) {
        const equipment = equipmentRegistry.get(equipmentId);
        if (equipment) {
          stats = equipment.applyTo(stats);
        }
      }
    }

    return stats;
  }

  /**
   * Calculate XP required for next level.
   */
  static getXpForLevel(level: number): number {
    return Math.floor(HERO_XP_BASE * Math.pow(HERO_XP_MULTIPLIER, level - 1));
  }

  /**
   * Check if hero can level up with current XP.
   */
  canLevelUp(heroState: HeroState): boolean {
    if (heroState.level >= HERO_MAX_LEVEL) return false;
    return heroState.xp >= heroState.xpToNextLevel;
  }

  /**
   * Get CPS contribution from this hero's cheese affinity.
   */
  getCpsContribution(heroState: HeroState): number {
    const stats = this.getFullStats(heroState);
    return stats.cheeseAffinity / 100; // Convert to percentage
  }

  /**
   * Check if player can afford to recruit this hero.
   */
  canRecruit(curds: Decimal): boolean {
    return curds.gte(this.recruitCost);
  }

  /**
   * Get class role description for UI.
   */
  getRoleDescription(): string {
    switch (this.class) {
      case 'tank': return 'Absorbs damage and protects allies';
      case 'dps': return 'Deals high damage to enemies';
      case 'support': return 'Buffs allies and debuffs enemies';
      case 'healer': return 'Restores HP to allies';
    }
  }

  static fromDefinition(data: HeroDefinition): Hero {
    return new Hero(data);
  }
}
```

#### 2. Create Hero registry

**File**: `src/domain/registry/heroes.ts`

```typescript
import { HEROES } from '../../data/heroes';
import { Hero } from '../entities/Hero';
import { EntityRegistry } from './EntityRegistry';

const heroEntities = HEROES.map(Hero.fromDefinition);

export const heroRegistry = new EntityRegistry(heroEntities);

export { Hero };
```

#### 3. Refactor productionEngine.ts to use Hero domain

Replace `calculateHeroStats` with Hero domain method delegation:
```typescript
import { heroRegistry } from '../domain';

export function calculateHeroStats(heroId: string, heroState: HeroState): HeroStats {
  const hero = heroRegistry.get(heroId);
  if (!hero) {
    return { hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 };
  }
  return hero.getFullStats(heroState);
}
```

#### 4. Refactor combatEngine.ts hero lookups

Replace 11 `getHeroById()` calls with `heroRegistry.get()`.

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Hero.ts`

#### Manual Verification:
- [ ] Heroes can be recruited
- [ ] Hero stats display correctly with level and equipment
- [ ] Hero leveling works (XP gain, level up)
- [ ] Party formation works
- [ ] Combat uses correct hero stats

---

## Phase 6: Refactor Enemy Entity

### Overview

Convert Enemy to a rich domain model with combat behavior encapsulated.

### Changes Required:

#### 1. Create Enemy domain class

**File**: `src/domain/entities/Enemy.ts`

```typescript
import type { 
  EnemyDefinition, EnemyType, EnemySkill, EnemyDrop, HeroStats 
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Enemy.
 * Encapsulates combat behavior, skill selection, and drop calculation.
 */
export class Enemy extends BaseEntity<EnemyDefinition> implements EnemyDefinition {
  get name(): string { return this.data.name; }
  get type(): EnemyType { return this.data.type; }
  get description(): string { return this.data.description; }
  get stats(): HeroStats { return this.data.stats; }
  get skills(): EnemySkill[] { return this.data.skills; }
  get drops(): EnemyDrop[] { return this.data.drops; }
  get curdReward(): number { return this.data.curdReward; }
  get xpReward(): number { return this.data.xpReward; }
  get icon(): string { return this.data.icon; }

  protected withData(updates: Partial<EnemyDefinition>): this {
    return new Enemy({ ...this.data, ...updates }) as this;
  }

  /**
   * Get scaled stats for a zone level.
   */
  getScaledStats(zoneLevel: number): HeroStats {
    const scaleFactor = 1 + (zoneLevel - 1) * 0.15;
    return {
      hp: Math.floor(this.stats.hp * scaleFactor),
      attack: Math.floor(this.stats.attack * scaleFactor),
      defense: Math.floor(this.stats.defense * scaleFactor),
      speed: this.stats.speed,
      cheeseAffinity: this.stats.cheeseAffinity,
    };
  }

  /**
   * Select a skill to use based on AI logic.
   * Returns the first available skill (can be extended for smarter AI).
   */
  selectSkill(cooldowns: Record<string, number>): EnemySkill | null {
    for (const skill of this.skills) {
      const cooldown = cooldowns[skill.id] ?? 0;
      if (cooldown <= 0) {
        return skill;
      }
    }
    return null;
  }

  /**
   * Calculate damage dealt to a target.
   */
  calculateDamage(targetDefense: number): number {
    const baseDamage = this.stats.attack;
    const mitigation = targetDefense / (targetDefense + 100);
    return Math.max(1, Math.floor(baseDamage * (1 - mitigation)));
  }

  /**
   * Get scaled rewards for a zone level.
   */
  getScaledRewards(zoneLevel: number): { curds: number; xp: number } {
    const scaleFactor = 1 + (zoneLevel - 1) * 0.1;
    return {
      curds: Math.floor(this.curdReward * scaleFactor),
      xp: Math.floor(this.xpReward * scaleFactor),
    };
  }

  /**
   * Check if this enemy is a boss type.
   */
  isBoss(): boolean {
    return this.type === 'boss';
  }

  static fromDefinition(data: EnemyDefinition): Enemy {
    return new Enemy(data);
  }
}
```

#### 2. Create Enemy and Boss registries

**File**: `src/domain/registry/enemies.ts`

```typescript
import { ENEMIES, BOSSES } from '../../data/enemies';
import { Enemy } from '../entities/Enemy';
import { EntityRegistry } from './EntityRegistry';

const enemyEntities = ENEMIES.map(Enemy.fromDefinition);
const bossEntities = BOSSES.map(Enemy.fromDefinition);

export const enemyRegistry = new EntityRegistry(enemyEntities);
export const bossRegistry = new EntityRegistry(bossEntities);

/**
 * Unified lookup for any enemy (regular or boss).
 */
export function getAnyEnemy(id: string): Enemy | undefined {
  return enemyRegistry.get(id) ?? bossRegistry.get(id);
}

export { Enemy };
```

#### 3. Refactor combatEngine.ts

Replace all `getEnemyById(id) || getBossById(id)` patterns with `getAnyEnemy(id)`.

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Enemy.ts`

#### Manual Verification:
- [ ] Combat encounters spawn correct enemies
- [ ] Enemy damage calculation unchanged
- [ ] Boss fights work correctly
- [ ] Combat rewards (curds, XP) are correct

---

## Phase 7: Refactor Zone Entity

### Overview

Convert Zone to a rich domain model with progression and unlock logic encapsulated.

### Changes Required:

#### 1. Create Zone domain class

**File**: `src/domain/entities/Zone.ts`

```typescript
import type { 
  ZoneDefinition, ZoneProgress, ZoneUnlockRequirement, Province 
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Zone.
 * Encapsulates unlock requirements and progression logic.
 */
export class Zone extends BaseEntity<ZoneDefinition> implements ZoneDefinition {
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get province(): Province { return this.data.province; }
  get enemies(): string[] { return this.data.enemies; }
  get bossId(): string { return this.data.bossId; }
  get stages(): number { return this.data.stages; }
  get unlockRequirement(): ZoneUnlockRequirement | undefined { return this.data.unlockRequirement; }
  get background(): string { return this.data.background; }
  get icon(): string { return this.data.icon; }

  protected withData(updates: Partial<ZoneDefinition>): this {
    return new Zone({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if this zone is unlocked given current progress.
   */
  isUnlocked(zoneProgress: Record<string, ZoneProgress>): boolean {
    if (!this.unlockRequirement) return true;

    const req = this.unlockRequirement;
    switch (req.type) {
      case 'zone_complete':
        return zoneProgress[req.zoneId]?.bossDefeated ?? false;
      case 'hero_level':
        // Would need hero state to check - delegate to caller
        return true;
      case 'prestige_level':
        // Would need prestige state to check - delegate to caller
        return true;
      default:
        return true;
    }
  }

  /**
   * Get completion percentage for this zone.
   */
  getProgress(zoneProgress: ZoneProgress | undefined): number {
    if (!zoneProgress) return 0;
    if (zoneProgress.bossDefeated) return 100;
    return Math.floor((zoneProgress.highestStageReached / this.stages) * 100);
  }

  /**
   * Check if boss stage has been reached.
   */
  isBossStageReached(currentStage: number): boolean {
    return currentStage > this.stages;
  }

  /**
   * Get enemy ID for a specific stage.
   */
  getEnemyForStage(stage: number): string {
    // Cycle through enemies for stages
    const index = (stage - 1) % this.enemies.length;
    return this.enemies[index];
  }

  static fromDefinition(data: ZoneDefinition): Zone {
    return new Zone(data);
  }
}
```

#### 2. Create Zone registry

**File**: `src/domain/registry/zones.ts`

```typescript
import { ZONES } from '../../data/zones';
import { Zone } from '../entities/Zone';
import { EntityRegistry } from './EntityRegistry';

const zoneEntities = ZONES.map(Zone.fromDefinition);

export const zoneRegistry = new EntityRegistry(zoneEntities);

export { Zone };
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Zone.ts`

#### Manual Verification:
- [ ] Zone selection panel shows correct zones
- [ ] Zone unlock requirements work
- [ ] Zone progression (stages) works correctly
- [ ] Boss encounters trigger at correct stage

---

## Phase 8: Refactor Recipe Entity

### Overview

Convert Recipe (CheeseRecipe) to a rich domain model with crafting logic encapsulated.

### Changes Required:

#### 1. Create Recipe domain class

**File**: `src/domain/entities/Recipe.ts`

```typescript
import type { 
  CheeseRecipe, RecipeUnlockRequirement, CheeseCategory, CheeseQuality 
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Cheese Recipe.
 * Encapsulates crafting requirements and quality calculation.
 */
export class Recipe extends BaseEntity<CheeseRecipe> implements CheeseRecipe {
  get name(): string { return this.data.name; }
  get description(): string { return this.data.description; }
  get category(): CheeseCategory { return this.data.category; }
  get ingredients(): { id: string; amount: number }[] { return this.data.ingredients; }
  get craftTime(): number { return this.data.craftTime; }
  get agingTime(): number { return this.data.agingTime; }
  get baseQuality(): number { return this.data.baseQuality; }
  get effect(): { type: string; value: number; duration: number } { return this.data.effect; }
  get unlockRequirement(): RecipeUnlockRequirement | undefined { return this.data.unlockRequirement; }
  get icon(): string { return this.data.icon; }

  protected withData(updates: Partial<CheeseRecipe>): this {
    return new Recipe({ ...this.data, ...updates }) as this;
  }

  /**
   * Check if player has required ingredients.
   */
  canCraft(ingredientInventory: Record<string, number>): boolean {
    return this.ingredients.every(req => {
      const owned = ingredientInventory[req.id] ?? 0;
      return owned >= req.amount;
    });
  }

  /**
   * Calculate final quality based on modifiers.
   */
  calculateQuality(qualityModifier: number = 0): CheeseQuality {
    const finalQuality = this.baseQuality + qualityModifier;
    
    if (finalQuality >= 90) return 'legendary';
    if (finalQuality >= 75) return 'excellent';
    if (finalQuality >= 50) return 'good';
    if (finalQuality >= 25) return 'average';
    return 'poor';
  }

  /**
   * Get total crafting time including aging.
   */
  getTotalTime(): number {
    return this.craftTime + this.agingTime;
  }

  /**
   * Check if this is a legendary recipe.
   */
  isLegendary(): boolean {
    return this.category === 'legendary';
  }

  /**
   * Get required cave tier for aging (if any).
   */
  getRequiredCaveTier(): number {
    if (this.agingTime === 0) return 0;
    if (this.isLegendary()) return 3;
    if (this.category === 'hard') return 2;
    return 1;
  }

  static fromDefinition(data: CheeseRecipe): Recipe {
    return new Recipe(data);
  }
}
```

#### 2. Create Recipe registry

**File**: `src/domain/registry/recipes.ts`

```typescript
import { CHEESE_RECIPES } from '../../data/cheeseRecipes';
import { Recipe } from '../entities/Recipe';
import { EntityRegistry } from './EntityRegistry';

const recipeEntities = CHEESE_RECIPES.map(Recipe.fromDefinition);

export const recipeRegistry = new EntityRegistry(recipeEntities);

export { Recipe };
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] File exists: `src/domain/entities/Recipe.ts`

#### Manual Verification:
- [ ] Recipe list displays correctly
- [ ] Crafting checks ingredient requirements
- [ ] Cheese quality calculation works
- [ ] Aging time displays correctly

---

## Phase 9: Update gameStore.ts Lookups

### Overview

Replace all remaining `getXxxById()` calls in gameStore.ts with registry lookups.

### Changes Required:

#### 1. Update imports in gameStore.ts

Replace individual data imports:
```typescript
// BEFORE
import { getHeroById } from '../data/heroes';
import { getEquipmentById } from '../data/equipment';
import { getRecipeById } from '../data/cheeseRecipes';
// ... etc

// AFTER
import { 
  heroRegistry,
  equipmentRegistry,
  recipeRegistry,
  upgradeRegistry,
  zoneRegistry,
  generatorRegistry,
} from '../domain';
```

#### 2. Search and replace lookup calls

Find all instances of `getXxxById(id)` and replace with `xxxRegistry.get(id)`.

Example replacements:
- `getHeroById(heroId)` → `heroRegistry.get(heroId)`
- `getEquipmentById(equipId)` → `equipmentRegistry.get(equipId)`
- `getRecipeById(recipeId)` → `recipeRegistry.get(recipeId)`

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `grep -r "getHeroById" src/stores/` returns 0 results
- [x] `grep -r "getEquipmentById" src/stores/` returns 0 results

#### Manual Verification:
- [ ] Full game playthrough: generators, upgrades, heroes, combat, crafting all work

---

## Phase 10: Update UI Components

### Overview

Replace `getXxxById()` calls in UI components with registry lookups.

### Changes Required:

Update these files to use domain registries:
- `src/components/ui/CombatPanel.tsx` (5 getHeroById, 1 getZoneById)
- `src/components/ui/HeroAbilityButton.tsx` (3 getHeroById)
- `src/components/ui/PartyFormationPanel.tsx` (2 getHeroById)
- `src/components/ui/EnemyDisplay.tsx` (2 getEnemyById, 2 getBossById)
- `src/components/ui/EquipmentModal.tsx` (1 getHeroById, 1 getEquipmentById)
- `src/components/ui/UpgradePanel.tsx` (2 getGeneratorById)

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `grep -r "getHeroById" src/components/` returns 0 results

#### Manual Verification:
- [ ] All UI panels render correctly
- [ ] Combat panel shows hero and enemy info
- [ ] Equipment modal shows stats correctly

---

## Phase 11: Cleanup and Deprecation

### Overview

Remove unused `getXxxById()` functions and finalize domain structure.

### Changes Required:

#### 1. Mark old lookup functions as deprecated

Add deprecation comments to existing functions:
```typescript
/**
 * @deprecated Use generatorRegistry.get() instead
 */
export function getGeneratorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
```

#### 2. Update exports in data files

Consider whether to keep exporting raw arrays or only through domain:
- Keep `GENERATORS`, `HEROES`, etc. for now (serialization compatibility)
- Remove `getXxxById` exports after all callers migrated

#### 3. Final audit

Run grep to ensure no remaining direct lookups:
```bash
grep -r "getGeneratorById\|getHeroById\|getUpgradeById\|getEquipmentById\|getEnemyById\|getZoneById\|getRecipeById" src/ --include="*.ts" --include="*.tsx"
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] Grep audit shows 0 remaining direct lookups (excluding deprecated stubs)

#### Manual Verification:
- [ ] Full game playthrough works identically to before refactoring
- [ ] Save/load works (domain models serialize correctly)
- [ ] No console errors during gameplay

---

## Testing Strategy

### Unit Tests:

Consider adding unit tests for domain entities:
- Generator cost calculation edge cases (count=0, costMultiplier=1)
- Hero stat calculation at various levels
- Equipment stat application
- Recipe ingredient checking

### Integration Tests:

- Verify game loop still runs at correct tick rate
- Verify CPS calculation matches pre-refactor values
- Verify combat damage calculations unchanged

### Manual Testing Steps:

1. Start new game, buy generators, verify cost scaling
2. Purchase upgrades, verify multipliers apply
3. Recruit heroes, verify stats display
4. Equip items, verify stat changes
5. Enter combat, verify enemy spawning and damage
6. Craft cheese, verify ingredient consumption
7. Save game, reload, verify state preserved

## Performance Considerations

- Registry uses `Map` for O(1) lookups vs O(n) array `.find()`
- Domain classes are immutable - no accidental state mutation
- Game loop hot paths (tick processing) will be faster with Map lookups
- Memory usage slightly higher due to class overhead, but negligible for 200 total entities

## Migration Notes

- Domain classes implement existing interfaces, so type compatibility is preserved
- Zustand store actions continue to work - they call engine functions which now use registries
- Save/load format unchanged - domain models serialize to same JSON structure
- Gradual migration possible - can have mixed `getXxxById` and registry calls during transition

## References

- Research document: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Existing patterns: `src/systems/productionEngine.ts`, `src/systems/combatEngine.ts`
- Type definitions: `src/types/game.ts`

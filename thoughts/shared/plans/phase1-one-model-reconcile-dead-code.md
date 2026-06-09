# Phase 1: One Model — Reconcile or Kill Dead Code

## Overview

Phase 1 of the DDD refactoring roadmap addresses the **two-models problem**: domain entities have methods that are either never called (dead code) or have diverged from live procedural implementations. This creates a maintenance hazard where the "model" lies about what the code actually does.

The goal is to restore MODEL-DRIVEN DESIGN by ensuring entity methods and live code are the same thing. We either **wire entity methods into live code** (when the entity is correct) or **delete entity methods** (when they've diverged or are unused).

**Bonus**: This phase fixes two real bugs for free — enemy ability selection and StatusEffect mutation.

## Current State Analysis

The domain layer at `src/domain/entities/` contains 8 entity classes wrapping immutable catalog data. Of all entity methods, only **six are ever called** outside the domain layer:

- `Generator.getCost/.getCps/.getMaxAffordable` — used by `productionEngine.ts`
- `Upgrade.getMultiplierValue` — used by `productionEngine.ts`
- `Hero.getFullStats` — used by `productionEngine.ts`

Everything else is dead code. Several dead methods have **diverged from live formulas**, creating two competing models that would produce different results if both were used.

### Live Bugs Being Fixed

1. **Enemy ability selection** (`combatEngine.ts:796-798`): Enemies always use `availableAbilities[0]`, ignoring cooldowns. Boss phase abilities are appended but never selected. The dead `Enemy.selectAbility` method implements the fix.

2. **StatusEffect shared-reference mutation** (`combatEngine.ts:202` vs `:626,632`): The tick's shallow copies share `StatusEffect` object references with previous Zustand state. `processStatusEffects` mutates `effect.duration -= 1` in place, corrupting prior immutable snapshots.

### Dead/Diverged Methods Summary

| Entity | Dead Methods | Diverged? |
|--------|-------------|-----------|
| Enemy | `getScaledStats`, `selectAbility`, `calculateDamage`, `getScaledRewards`, `isBoss` | `getScaledStats` (additive vs multiplicative), `calculateDamage` (missing variance/multiplier) |
| Recipe | `calculateQuality`, `canCraftWith`, `getTotalTime`, `isLegendary`, `requiresAging`, `getRequiredCaveTier` | `calculateQuality` (missing ingredient/cave bonuses) |
| Zone | `isUnlocked`, `getProgress`, `isBossStageReached`, `getStage`, `getTotalStages` | `isUnlocked` (missing curds/achievement requirement types) |
| Equipment | `getRarityColor` | Yes (hex colors vs Tailwind classes) |
| Hero | `getXpForLevel`, `canLevelUp`, `getCpsContribution`, `canRecruit`, `getRoleDescription` | `getXpForLevel` is exact duplicate of `data/heroes.ts` |
| Upgrade | `isUnlocked`, `canAfford`, `affectsGenerator` | Subtle difference in default return for unknown requirement types |
| BaseEntity | `withData`, `toJSON` | N/A (scaffolding never used) |

### Deprecated Lookups

8 `@deprecated` `getXxxById` functions exist with zero external callers. One internal caller remains: `getStage` at `zones.ts:1207` calls `getZoneById`.

## Desired End State

After this phase:

1. **Zero entity methods with no callers** — every method is either used or deleted
2. **Zero `@deprecated` lookup functions** — all removed
3. **Enemy ability variety observable in combat** — bosses use phase abilities, enemies respect cooldowns
4. **No StatusEffect mutation bugs** — each tick operates on its own copies
5. **`npm run typecheck && npm run lint && npm run build` green**

### Verification Commands

```bash
# All must pass
npm run typecheck
npm run lint
npm run build

# Verify no deprecated functions remain
grep -r "@deprecated" src/data/*.ts | grep -v "node_modules" | wc -l
# Expected: 0

# Verify no dead entity methods (spot check)
grep -rn "selectAbility\|getScaledStats\|calculateQuality" src/ --include="*.ts" | grep -v "domain/entities" | grep -v "\.test\." | wc -l
# Expected: 1 (the new call site in combatEngine)
```

## What We're NOT Doing

- **Not wiring `Upgrade.isUnlocked/canAfford`** — these would need slice state passed in; Phase 1 focuses on pure deletions and the one clear bug fix
- **Not creating new entity methods** — that's Phase 2+ work
- **Not touching the crafting context** — that's Phase 3
- **Not adding value objects** — that's Phase 4
- **Not changing slice boundaries** — that's Phase 6

---

## Phase 1.1: Fix Enemy Ability Selection Bug

### Overview

Wire the dead `Enemy.selectAbility` logic into `combatEngine.ts` to fix the bug where enemies always use `availableAbilities[0]`. This is the one case where the dead code is correct and the live code is buggy.

### Changes Required

#### 1. Extract selectAbility as standalone function

**File**: `src/systems/combatEngine.ts`

Add a new function near the top (after imports, before other functions):

```typescript
/**
 * Select an ability that is off cooldown, or return null if all are on cooldown.
 * Falls back to first ability if none available.
 */
function selectAbilityFromCooldowns(
  abilities: EnemyAbility[],
  cooldowns: Record<string, number>
): EnemyAbility | null {
  for (const ability of abilities) {
    const cooldown = cooldowns[ability.id] ?? 0;
    if (cooldown <= 0) {
      return ability;
    }
  }
  return null;
}
```

#### 2. Use the function at the bug site

**File**: `src/systems/combatEngine.ts`
**Lines**: 795-798

**Current code**:
```typescript
// Get first available ability (basic attack) or default
// TODO: Could add smarter ability selection based on cooldowns
const ability = availableAbilities[0];
const abilityMultiplier = ability?.damage || 1.0;
```

**Replace with**:
```typescript
// Select ability respecting cooldowns, fall back to first if all on cooldown
const ability = selectAbilityFromCooldowns(availableAbilities, enemy.abilityCooldowns) 
  || availableAbilities[0];
const abilityMultiplier = ability?.damage || 1.0;
```

#### 3. Set cooldown after ability use

**File**: `src/systems/combatEngine.ts`
**Location**: After the enemy attack is processed (around line 830, after damage is applied)

Add cooldown assignment:

```typescript
// Set cooldown for the used ability
if (ability && ability.cooldown) {
  enemy.abilityCooldowns[ability.id] = ability.cooldown;
}
```

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds

#### Manual Verification:
- [ ] In combat, enemies use different abilities over time (not always the same one)
- [ ] Boss phase abilities appear in combat log when boss enters new phases
- [ ] No console errors during combat

---

## Phase 1.2: Fix StatusEffect Mutation Bug

### Overview

Deep-copy status effects in `tickCombat`'s copy step to prevent `processStatusEffects` from mutating prior Zustand state.

### Changes Required

#### 1. Deep-copy hero status effects

**File**: `src/systems/combatEngine.ts`
**Line**: 626

**Current code**:
```typescript
statusEffects: [...heroState.statusEffects],
```

**Replace with**:
```typescript
statusEffects: heroState.statusEffects.map(e => ({ ...e })),
```

#### 2. Deep-copy enemy status effects

**File**: `src/systems/combatEngine.ts`
**Line**: 632

**Current code**:
```typescript
statusEffects: [...e.statusEffects],
```

**Replace with**:
```typescript
statusEffects: e.statusEffects.map(se => ({ ...se })),
```

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds

#### Manual Verification:
- [ ] Status effects (buffs/debuffs) tick down correctly in combat
- [ ] No "undefined" errors in combat log related to status effects
- [ ] Combat state is consistent after multiple ticks

---

## Phase 1.3: Delete Dead Entity Methods

### Overview

Remove all entity methods that have zero callers or have diverged from live implementations. This is the bulk of the cleanup work.

### Changes Required

#### 1. Enemy entity

**File**: `src/domain/entities/Enemy.ts`

**Delete methods** (keep only the constructor and basic getters):
- `getScaledStats` (lines 58-67) — diverged formula
- `selectAbility` (lines 73-81) — logic now in combatEngine
- `calculateDamage` (lines 86-90) — diverged formula
- `getScaledRewards` (lines 95-101) — diverged formula  
- `isBoss` (lines 106-108) — unused, live code uses DTO property

**Also delete**:
- `withData` inherited from BaseEntity (if overridden)

#### 2. Recipe entity

**File**: `src/domain/entities/Recipe.ts`

**Delete methods**:
- `withData` (lines 56-58)
- `canCraftWith` (lines 63-80)
- `calculateQuality` (lines 85-93) — diverged from craftingEngine
- `getTotalTime` (lines 98-100)
- `isLegendary` (lines 105-107)
- `requiresAging` (lines 112-114)
- `getRequiredCaveTier` (lines 119-124)

#### 3. Zone entity

**File**: `src/domain/entities/Zone.ts`

**Delete methods**:
- `withData` (lines 41-43)
- `isUnlocked` (lines 48-56) — diverged, missing requirement types
- `getProgress` (lines 61-66)
- `isBossStageReached` (lines 71-73)
- `getStage` (lines 78-80)
- `getTotalStages` (lines 85-87)

#### 4. Equipment entity

**File**: `src/domain/entities/Equipment.ts`

**Delete methods**:
- `withData` (lines 37-39)
- `getRarityColor` (lines 64-75) — diverged (hex vs Tailwind)

**Keep**:
- `getStatBonus` (used by `applyTo`)
- `applyTo` (used by Hero.getFullStats)

#### 5. Hero entity

**File**: `src/domain/entities/Hero.ts`

**Delete methods**:
- `withData` (lines 49-51)
- `getXpForLevel` static method (lines 88-90) — duplicate of `data/heroes.ts`
- `canLevelUp` (lines 95-98) — unused
- `getCpsContribution` (lines 103-106) — unused
- `canRecruit` (lines 111-113) — unused
- `getRoleDescription` (lines 118-129) — unused

**Keep**:
- `getStatsAtLevel` (used by getFullStats)
- `getFullStats` (used by productionEngine)

#### 6. Upgrade entity

**File**: `src/domain/entities/Upgrade.ts`

**Delete methods**:
- `withData` (lines 29-31)
- `isUnlocked` (lines 36-45) — unused
- `canAfford` (lines 50-53) — unused
- `affectsGenerator` (lines 58-62) — unused

**Keep**:
- `getMultiplierValue` (used by productionEngine)

#### 7. Generator entity

**File**: `src/domain/entities/Generator.ts`

**Delete methods**:
- `withData` (lines 29-31)

**Keep**:
- `getCost` (used)
- `getCps` (used)
- `getMaxAffordable` (used)

#### 8. BaseEntity

**File**: `src/domain/entities/BaseEntity.ts`

**Delete methods**:
- `withData` (line 19) — abstract method never implemented usefully
- `toJSON` (lines 24-26) — never called

The class becomes just the constructor and `data` getter.

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes (no missing method errors)
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] No imports break (verify with full build)

#### Manual Verification:
- [ ] Game loads and runs normally
- [ ] Production, combat, and heroes all function correctly

---

## Phase 1.4: Delete Dead productionEngine Function

### Overview

Remove the dead `recalculateCpsFromState` function that omits the Eh multiplier. This prevents anyone from accidentally using the wrong CPS calculation.

### Changes Required

#### 1. Delete the function

**File**: `src/systems/productionEngine.ts`
**Lines**: 442-460 (approximately)

**Delete the entire function**:
```typescript
export function recalculateCpsFromState(
  generators: Record<string, number>,
  upgrades: string[],
  achievements: string[],
  heroes: Record<string, HeroState>,
  party: PartyFormation,
  prestige: PrestigeState
): Decimal {
  // ... entire function body
}
```

#### 2. Verify no callers

Run grep to confirm no callers exist:
```bash
grep -rn "recalculateCpsFromState" src/ --include="*.ts"
```

Should only show the definition, which we're deleting.

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -rn "recalculateCpsFromState" src/` returns no results

---

## Phase 1.5: Remove Deprecated getXxxById Exports

### Overview

Remove all 8 deprecated lookup functions. They have zero external callers — the codebase has fully migrated to registries.

### Changes Required

#### 1. generators.ts

**File**: `src/data/generators.ts`
**Line**: ~148

**Delete**:
```typescript
/** @deprecated Use generatorRegistry.get() instead */
export function getGeneratorById(id: string): GeneratorDefinition | undefined {
  return GENERATORS.find(g => g.id === id);
}
```

#### 2. upgrades.ts

**File**: `src/data/upgrades.ts`
**Line**: ~512

**Delete**:
```typescript
/** @deprecated Use upgradeRegistry.get() instead */
export function getUpgradeById(id: string): UpgradeDefinition | undefined {
  return UPGRADES.find(u => u.id === id);
}
```

#### 3. heroes.ts

**File**: `src/data/heroes.ts`
**Line**: ~999

**Delete**:
```typescript
/** @deprecated Use heroRegistry.get() instead */
export function getHeroById(id: string): HeroDefinition | undefined {
  return HEROES.find(h => h.id === id);
}
```

#### 4. zones.ts

**File**: `src/data/zones.ts`
**Line**: ~1096

**Delete**:
```typescript
/** @deprecated Use zoneRegistry.get() instead */
export function getZoneById(id: string): ZoneDefinition | undefined {
  return ZONES.find(z => z.id === id);
}
```

#### 5. enemies.ts

**File**: `src/data/enemies.ts`
**Lines**: ~3550, ~3557

**Delete both**:
```typescript
/** @deprecated Use enemyRegistry.get() instead */
export function getEnemyById(id: string): EnemyDefinition | undefined {
  return ENEMIES.find(e => e.id === id);
}

/** @deprecated Use bossRegistry.get() instead */
export function getBossById(id: string): BossDefinition | undefined {
  return BOSSES.find(b => b.id === id);
}
```

#### 6. equipment.ts

**File**: `src/data/equipment.ts`
**Line**: ~555

**Delete**:
```typescript
/** @deprecated Use equipmentRegistry.get() instead */
export function getEquipmentById(id: string): EquipmentDefinition | undefined {
  return EQUIPMENT.find(e => e.id === id);
}
```

#### 7. cheeseRecipes.ts

**File**: `src/data/cheeseRecipes.ts`
**Line**: ~1017

**Delete**:
```typescript
/** @deprecated Use recipeRegistry.get() instead */
export function getRecipeById(id: string): RecipeDefinition | undefined {
  return RECIPES.find(r => r.id === id);
}
```

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -r "@deprecated" src/data/*.ts | wc -l` returns 0

---

## Phase 1.6: Retire getStage Legacy Lookup

### Overview

The `getStage` helper in `zones.ts` is the last function using a deprecated lookup. Update it to use the registry, then verify `combatEngine.ts` still works.

### Changes Required

#### 1. Update getStage to use registry

**File**: `src/data/zones.ts`
**Lines**: ~1206-1216

**Current code**:
```typescript
export function getStage(zoneId: string, stageNumber: number) {
  const zone = getZoneById(zoneId);
  if (!zone) return null;
  
  if (stageNumber === zone.stages.length + 1 && zone.boss) {
    return { type: 'boss' as const, bossStage: zone.boss };
  }
  
  return zone.stages[stageNumber - 1] || null;
}
```

**Replace with**:
```typescript
export function getStage(zoneId: string, stageNumber: number) {
  const zone = zoneRegistry.get(zoneId);
  if (!zone) return null;
  
  const zoneDef = zone.data;
  if (stageNumber === zoneDef.stages.length + 1 && zoneDef.boss) {
    return { type: 'boss' as const, bossStage: zoneDef.boss };
  }
  
  return zoneDef.stages[stageNumber - 1] || null;
}
```

**Add import** at top of file if not present:
```typescript
import { zoneRegistry } from '../domain/registry/zones';
```

### Success Criteria

#### Automated Verification:
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `grep -rn "getZoneById\|getGeneratorById\|getUpgradeById\|getHeroById\|getEnemyById\|getBossById\|getEquipmentById\|getRecipeById" src/ --include="*.ts" | grep -v node_modules` returns no results

#### Manual Verification:
- [ ] Combat loads stages correctly
- [ ] Boss stages appear at correct zone progression points
- [ ] No errors when entering combat zones

---

## Testing Strategy

### Unit Tests

No new unit tests required — this phase is pure deletion and one bug fix. Existing tests should continue to pass.

### Integration Tests

The build and typecheck serve as integration tests — if any deleted method was actually used, the build would fail.

### Manual Testing Steps

1. **Start the game fresh** — verify it loads without errors
2. **Buy some generators and upgrades** — verify production works
3. **Enter combat in any zone** — verify enemies attack with variety (not always the same ability)
4. **Progress to a boss** — verify boss uses phase abilities as health decreases
5. **Apply status effects in combat** (use a hero with buff/debuff) — verify effects tick down correctly
6. **Check combat log** — verify no "undefined" or strange values appear
7. **Save and reload** — verify game state persists correctly

---

## Performance Considerations

This phase has no performance implications — we're only deleting dead code and fixing two bugs. The deep-copy of status effects adds negligible overhead (typically <10 status effects per combat).

---

## Migration Notes

No save migration required. The changes are purely internal code cleanup and bug fixes that don't affect persisted state.

---

## References

- Research document: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Prior DDD analysis: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Glossary: `docs/GLOSSARY.md`
- Constants: `src/data/constants.ts`

# Ubiquitous Language Standardization Plan

## Overview

Standardize naming conventions across the codebase to eliminate confusion caused by multiple names for the same concepts. This addresses DDD "Ubiquitous Language" violations identified in the brittle code analysis.

## Current State Analysis

The codebase has 4 categories of naming inconsistencies:

1. **Multiplier/Bonus/Modifier confusion**: `*Bonus` functions return multipliers, `*Modifier` used for both additive and multiplicative operations
2. **Ability/Skill overlap**: Heroes have "abilities", enemies have "skills", but cooldowns tracked in `skillCooldowns` for both
3. **Effect type casing**: `production_boost` vs `productionBonus` for the same concept
4. **CPS terminology**: `curdPerSecond`, `CPS`, `baseCps`, `production` all used interchangeably

### Key Discoveries:

- `getEhBonus()`, `calculateHeroCpsBonus()`, `calculateFormationBonus()` all return multipliers despite "Bonus" name
- `useHeroSkill()` ignores its `skillId` parameter and calls `executeHeroAbility()` internally
- `HeroDefinition.specialAbility` is flavor text; `HeroAbilityDefinition` has actual mechanics
- snake_case effects in combat/cheese, camelCase in upgrades/aging - same concepts, different names

## Desired End State

A glossary-driven codebase where:
- Each concept has exactly one canonical name
- Function names accurately describe their return type (Multiplier vs Bonus)
- Effect types use consistent camelCase
- Hero and enemy combat actions use unified "ability" terminology

### Verification:
- Grep for deprecated terms returns 0 results
- All tests pass
- TypeScript compilation succeeds
- Game functions identically (no behavioral changes)

## What We're NOT Doing

- Refactoring the god-object store (separate plan exists)
- Changing game mechanics or balance
- Renaming user-facing strings (UI labels like "CPS" are fine)
- Changing save file format (migration handled transparently)

---

## Phase 1: Create Ubiquitous Language Glossary

### Overview

Establish canonical terminology in a reference document that all subsequent phases will follow.

### Changes Required:

#### 1. Create Glossary Document

**File**: `docs/GLOSSARY.md`
**Changes**: New file defining canonical terms

```markdown
# The Great Canadian Cheese Quest - Glossary

## Currency & Production

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `curds` | Primary currency (state field) | - |
| `curdPerSecond` | Production rate (state field) | `CPS` in code (OK in UI/comments) |
| `baseCps` | Generator's base production rate | - |
| `curdPerClick` | Base click value | - |
| `totalCurdsEarned` | Lifetime currency earned | - |

## Value Modifiers

| Canonical Term | Definition | Operation | Avoid Using |
|----------------|------------|-----------|-------------|
| `*Multiplier` | Scales a value | `base * multiplier` | - |
| `*Bonus` | Adds to a value | `base + bonus` | Using for multiplicative values |
| `*Modifier` | Additive stat adjustment | `stat + modifier` | Using for multiplicative scaling |
| `*Scale` | Multiplicative scaling factor | `base * scale` | `*Modifier` for multiplicative |

### Multiplier Naming Rules:
- Functions returning `1.0` as "no change" → use `*Multiplier`
- Functions returning `0` as "no change" → use `*Bonus`
- Prestige bonuses stored as percentages (0.1 = 10%) → `*Bonus`, applied as `1 + bonus`

## Combat Actions

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `ability` | Any combat action (hero or enemy) | `skill` for heroes |
| `HeroAbility` | Hero's combat ability with mechanics | `specialAbility` (flavor only) |
| `EnemyAbility` | Enemy's combat ability | `EnemySkill` |
| `abilityCooldowns` | Cooldown tracking for abilities | `skillCooldowns` |

## Effect Types (camelCase)

| Canonical Term | Definition | Avoid Using |
|----------------|------------|-------------|
| `productionBoost` | Temporary production multiplier | `production_boost` |
| `clickBoost` | Temporary click multiplier | `click_boost` |
| `xpBoost` | Temporary XP multiplier | `xp_boost` |
| `damageOverTime` | DoT effect | `damage_over_time` |
| `healOverTime` | HoT effect | `heal_over_time` |
| `heroBuff` | Temporary hero stat increase | `hero_buff` |
```

### Success Criteria:

#### Automated Verification:
- [x] File exists at `docs/GLOSSARY.md`
- [x] Markdown linting passes

#### Manual Verification:
- [x] Glossary covers all identified naming conflicts
- [x] Rules are clear and unambiguous

---

## Phase 2: Standardize Multiplier/Bonus/Modifier Naming

### Overview

Rename functions and fields to accurately reflect whether they return multiplicative or additive values.

### Changes Required:

#### 1. Rename Multiplicative "Bonus" Functions to "Multiplier"

**File**: `src/systems/productionEngine.ts`
**Changes**: Rename functions that return multipliers

```typescript
// Line 163: Rename calculateHeroCpsBonus -> calculateHeroCpsMultiplier
export function calculateHeroCpsMultiplier(
  heroes: Record<string, HeroState>,
  party: PartyState
): number {
  // ... existing logic, returns 1 + totalAffinity / 1000
}

// Line 205: Rename calculateFormationBonus -> calculateFormationMultiplier
export function calculateFormationMultiplier(
  party: PartyState,
  heroes: Record<string, HeroState>
): number {
  // ... existing logic, returns 1 + bonus
}
```

**File**: `src/stores/slices/production/productionSlice.ts`
**Changes**: Rename getEhBonus

```typescript
// Line 220: Rename getEhBonus -> getEhMultiplier
getEhMultiplier: () => {
  const { ehCount } = get();
  return 1 + Math.floor(ehCount / 100) * 0.01;
},
```

#### 2. Update All Call Sites

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Changes**: Update function calls

```typescript
// Line 310-312: Update variable names and calls
const heroMultiplier = calculateHeroCpsMultiplier(state.heroes, state.party);
const formationMultiplier = calculateFormationMultiplier(state.party, state.heroes);
// ... use heroMultiplier * formationMultiplier
```

**File**: `src/stores/slices/production/cpsCalculator.ts`
**Changes**: Update imports and calls

#### 3. Rename Multiplicative "Modifier" to "Scale"

**File**: `src/types/game.ts`
**Changes**: Rename enemyLevelModifier in ZoneStage

```typescript
// Line ~520 (ZoneStage interface): Rename field
enemyLevelScale: number;  // was enemyLevelModifier
```

**File**: `src/data/zones.ts`
**Changes**: Rename field in all zone definitions (16 zones × ~10 stages each)

```typescript
// Example at line 33
{
  stage: 1,
  enemyLevelScale: 1.0,  // was enemyLevelModifier
  // ...
}
```

**File**: `src/systems/combatEngine.ts`
**Changes**: Update usage

```typescript
// Line 541: Update parameter name
scaleEnemyStats(enemyDef, stage.enemyLevelScale)
```

**File**: `src/data/enemies.ts`
**Changes**: Rename levelModifier parameter

```typescript
// Line 3580: Rename parameter
export function scaleEnemyForLevel(enemy: EnemyDefinition, levelScale: number): EnemyDefinition {
  // Line 3585-3592: Update usage
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run typecheck`
- [x] All tests pass: `npm test`
- [x] Grep for old names returns 0: `rg "getEhBonus|calculateHeroCpsBonus|calculateFormationBonus|enemyLevelModifier" src/`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Production rate displays correctly in game
- [x] Combat damage scaling unchanged
- [x] Prestige multipliers work correctly

---

## Phase 3: Unify Ability/Skill Terminology

### Overview

Standardize on "ability" for all combat actions. Rename enemy "skills" to "abilities" and fix the `skillCooldowns`/`useHeroSkill` naming.

### Changes Required:

#### 1. Rename EnemySkill to EnemyAbility

**File**: `src/types/game.ts`
**Changes**: Rename interface and field

```typescript
// Line 341-348: Rename interface
export interface EnemyAbility {
  id: string;
  name: string;
  damage: number;
  cooldown: number;
  effect?: StatusEffectDefinition;
  targetType: 'single' | 'all' | 'self';
}

// Line 333: Rename field in EnemyDefinition
abilities: EnemyAbility[];  // was skills: EnemySkill[]
```

**File**: `src/domain/entities/Enemy.ts`
**Changes**: Update getter

```typescript
// Line 35-36: Rename getter
get abilities(): EnemyAbility[] {
  return this.data.abilities;
}
```

**File**: `src/data/enemies.ts`
**Changes**: Rename field in all 65+ enemy definitions

```typescript
// Example at line 38
abilities: [  // was skills
  {
    id: 'basic_attack',
    // ...
  }
],
```

#### 2. Rename skillCooldowns to abilityCooldowns

**File**: `src/types/game.ts`
**Changes**: Rename field in combat state types

```typescript
// Line 285: In HeroCombatState
abilityCooldowns: Record<string, number>;  // was skillCooldowns

// Line 296: In CombatEnemy
abilityCooldowns: Record<string, number>;  // was skillCooldowns
```

**File**: `src/systems/combatEngine.ts`
**Changes**: Update all references (lines 905, 913, 1082, 1398, 1536, 1545)

```typescript
// Line 905-907
heroState.abilityCooldowns[abilityId] = Math.max(0, cooldown - 1);

// Line 1082
const currentCooldown = heroState.abilityCooldowns[ability.id] ?? 0;

// etc.
```

#### 3. Rename useHeroSkill to useHeroAbility

**File**: `src/stores/slices/combat/types.ts`
**Changes**: Rename action

```typescript
// Line 17: Rename action
useHeroAbility: (heroId: string, abilityId: string, targetId?: string) => boolean;
```

**File**: `src/stores/slices/combat/combatSlice.ts`
**Changes**: Rename implementation and fix unused parameter

```typescript
// Line 144: Rename and use the abilityId parameter
useHeroAbility: (heroId: string, abilityId: string, targetId?: string) => {
  // Line 151: Pass abilityId to executeHeroAbility
  const result = executeHeroAbility(combat, heroId, abilityId, targetId);
  // ...
}
```

**File**: `src/components/ui/HeroAbilityButton.tsx`
**Changes**: Update call

```typescript
// Line 28
useHeroAbility(heroState.heroId, ability.id)
```

**File**: `src/components/ui/CombatPanel.tsx`
**Changes**: Update call

```typescript
// Line 265
useHeroAbility(selectedHero.heroId, ability.id)
```

#### 4. Clarify specialAbility as Flavor Text

**File**: `src/types/game.ts`
**Changes**: Rename to make purpose clear

```typescript
// Line 221-224: Rename field
abilityFlavor: {  // was specialAbility
  name: string;
  description: string;
};
```

**File**: `src/domain/entities/Hero.ts`
**Changes**: Update getter

```typescript
// Line 33-34
get abilityFlavor() {
  return this.data.abilityFlavor;
}
```

**File**: `src/data/heroes.ts`
**Changes**: Rename in all 30 hero definitions

**File**: `src/components/ui/HeroPanel.tsx`
**Changes**: Update UI references (lines 233-234)

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run typecheck`
- [x] All tests pass: `npm test`
- [x] Grep for old names returns 0: `rg "skillCooldowns|useHeroSkill|EnemySkill|\.skills\[" src/`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Hero abilities trigger correctly in combat
- [x] Enemy attacks work correctly
- [x] Cooldowns display and decrement properly
- [x] Hero panel shows ability flavor text

---

## Phase 4: Consolidate Effect Type Casing to camelCase

### Overview

Standardize all effect type strings to camelCase. This is a large mechanical refactor affecting type definitions, data files, and runtime switch statements.

### Changes Required:

#### 1. Update Type Definitions

**File**: `src/types/game.ts`
**Changes**: Rename snake_case effect types

```typescript
// Line 305-309: Update StatusEffect stat union
stat: keyof HeroStats | 'damageOverTime' | 'healOverTime';

// Lines 446-447: Update AbilityEffect
| { type: 'debuff'; stat: keyof HeroStats | 'damageOverTime'; value: number; duration: number }

// Lines 523-527: Update CheeseEffect
export type CheeseEffect =
  | { type: 'productionBoost'; multiplier: number; duration: number }
  | { type: 'clickBoost'; multiplier: number; duration: number }
  | { type: 'xpBoost'; multiplier: number; duration: number }
  | { type: 'heroBuff'; stat: keyof HeroStats; value: number; duration: number };
```

#### 2. Update Cheese Recipe Data

**File**: `src/data/cheeseRecipes.ts`
**Changes**: Update all 48 recipes with effects

```typescript
// Line 64: Update effect type
{ type: 'productionBoost', multiplier: 1.08, duration: 90000 }

// Line 82: Update effect type
{ type: 'clickBoost', multiplier: 1.12, duration: 120000 }

// Line 154: Update effect type
{ type: 'xpBoost', multiplier: 1.1, duration: 120000 }

// Line 46: Update effect type
{ type: 'heroBuff', stat: 'speed', value: 5, duration: 90000 }
```

#### 3. Update Enemy Data

**File**: `src/data/enemies.ts`
**Changes**: Update status effect references

```typescript
// Line 77: Update stat reference
stat: 'damageOverTime'

// Line 121: Update stat reference
stat: 'healOverTime'
```

#### 4. Update Hero Ability Data

**File**: `src/data/heroes.ts`
**Changes**: Update debuff effect types

```typescript
// Line 1530
{ type: 'debuff', stat: 'damageOverTime', value: 12, duration: 8 }

// Line 1756
{ type: 'debuff', stat: 'damageOverTime', value: 16, duration: 6 }
```

#### 5. Update Runtime Switch Statements

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Changes**: Update switch cases

```typescript
// Lines 518-524: Update case labels
case 'productionBoost':
  production *= effect.multiplier;
  break;
case 'clickBoost':
  click *= effect.multiplier;
  break;
case 'xpBoost':
  xp *= effect.multiplier;
  break;
```

**File**: `src/systems/combatEngine.ts`
**Changes**: Update DoT/HoT handling

```typescript
// Update references to damage_over_time -> damageOverTime
// Update references to heal_over_time -> healOverTime
```

#### 6. Add Save Migration

**File**: `src/systems/saveSystem.ts`
**Changes**: Add migration for old effect type names in saved cheese inventories

```typescript
// In loadGame() after parsing save data:
function migrateEffectTypes(saveData: SaveData): SaveData {
  const effectTypeMap: Record<string, string> = {
    'production_boost': 'productionBoost',
    'click_boost': 'clickBoost',
    'xp_boost': 'xpBoost',
    'hero_buff': 'heroBuff',
    'damage_over_time': 'damageOverTime',
    'heal_over_time': 'healOverTime',
  };
  
  // Migrate active buffs
  if (saveData.crafting?.activeBuffs) {
    saveData.crafting.activeBuffs = saveData.crafting.activeBuffs.map(buff => ({
      ...buff,
      type: effectTypeMap[buff.type] ?? buff.type,
    }));
  }
  
  return saveData;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run typecheck`
- [x] All tests pass: `npm test`
- [x] Grep for snake_case effects returns 0: `rg "production_boost|click_boost|xp_boost|hero_buff|damage_over_time|heal_over_time" src/` (only migration map and IDs remain)
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Cheese effects apply correctly when consumed
- [x] DoT/HoT effects work in combat
- [x] Old save files load correctly with migrated effect types
- [x] Active buffs persist across save/load

---

## Phase 5: Standardize CPS-Related Naming

### Overview

Ensure consistent use of `curdPerSecond` in code while allowing `CPS` as acceptable UI/comment abbreviation.

### Changes Required:

#### 1. Document CPS as Acceptable Abbreviation

**File**: `docs/GLOSSARY.md`
**Changes**: Already covered in Phase 1 - `CPS` acceptable in UI/comments, `curdPerSecond` required in code

#### 2. Audit and Fix Code Using CPS

**File**: `src/components/ui/PartyFormationPanel.tsx`
**Changes**: Keep UI strings as-is (CPS acceptable), ensure variable names use full form

```typescript
// Line 171: UI label is fine
"CPS Multiplier"

// Ensure any local variables use curdPerSecond, not cps
```

#### 3. Standardize Function Naming

No changes needed - existing functions (`calculateCps`, `recalculateCps`) use the abbreviation appropriately since they're internal utilities.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run typecheck`
- [x] No variable names use bare `cps` (except in function names): `rg "const cps|let cps|var cps" src/`

#### Manual Verification:
- [x] UI displays "CPS" appropriately
- [x] Code is readable and consistent

---

## Testing Strategy

### Unit Tests:
- Verify renamed functions maintain identical behavior
- Test save migration with old effect type names
- Test cooldown tracking with renamed `abilityCooldowns`

### Integration Tests:
- Full game loop with production multipliers
- Combat with enemy abilities and DoT effects
- Cheese crafting and buff application

### Manual Testing Steps:
1. Load an existing save file - verify migration works
2. Purchase upgrades - verify multipliers apply
3. Enter combat - verify abilities and cooldowns work
4. Craft and consume cheese - verify effects apply
5. Trigger prestige - verify bonuses calculate correctly

## Performance Considerations

None - these are purely naming changes with no runtime impact.

## Migration Notes

- Save file migration in Phase 4 handles old effect type names
- No database migrations needed
- Old save files remain compatible

## References

- Research: `thoughts/shared/research/2026-04-19_brittle-code-ddd-analysis.md`
- Related plan: `thoughts/shared/plans/god-object-store-refactor.md`

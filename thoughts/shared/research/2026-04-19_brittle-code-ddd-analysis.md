---
date: 2026-04-19T16:57:22Z
researcher: Claude
git_commit: 2f58703e5508e4da3c0f574432dc3f2cf00634ce
branch: main
repository: game
topic: "Brittle Code Analysis through Domain-Driven Design Lens"
tags: [research, codebase, DDD, brittleness, domain-model, bounded-contexts]
status: complete
last_updated: 2026-04-19
last_updated_by: Claude
---

# Research: Brittle Code Analysis through Domain-Driven Design Lens

**Date**: 2026-04-19T16:57:22Z
**Researcher**: Claude
**Git Commit**: 2f58703e5508e4da3c0f574432dc3f2cf00634ce
**Branch**: main
**Repository**: game

## Research Question

Analyze the codebase for brittle code patterns using Eric Evans' Domain-Driven Design principles as the evaluation framework.

## Summary

The codebase exhibits five major DDD anti-patterns that create brittleness:

1. **Anemic Domain Model** - All 7 core domain entities (Generator, Hero, Recipe, Zone, Equipment, Enemy, Upgrade) are pure data bags with no encapsulated behavior. Business logic is scattered across 3-5 files per concept.

2. **Missing Bounded Contexts** - A 2367-line god-object store (`gameStore.ts`) manages 8 implicit contexts (Production, Combat, Crafting, Prestige, Heroes, Events, Achievements, Persistence) with no isolation between them.

3. **Ubiquitous Language Violations** - Same concepts have multiple names (CPS/curdPerSecond/production, multiplier/bonus/modifier, ability/skill/specialAbility) creating confusion.

4. **Tight Coupling** - CPS recalculation is copy-pasted 15 times; 75+ magic numbers scattered across files; UI components directly import engine functions.

5. **Broken Invariants** - `getEhBonus()` calculated but never applied; taunt mechanic creates status effect but targeting ignores it; `tickCrafting()` is a no-op.

---

## Detailed Findings

### 1. Anemic Domain Model

The `src/data/` directory contains 7 domain entity definitions that are pure data structures with zero behavior:

| Entity | Data File | Lines | Behavior Location |
|--------|-----------|-------|-------------------|
| Generator | [generators.ts](src/data/generators.ts) | 4-142 | productionEngine.ts, gameStore.ts |
| Hero | [heroes.ts](src/data/heroes.ts) | 28-994 | productionEngine.ts, combatEngine.ts, gameStore.ts |
| Recipe | [cheeseRecipes.ts](src/data/cheeseRecipes.ts) | 30-1075 | craftingEngine.ts, gameStore.ts |
| Zone | [zones.ts](src/data/zones.ts) | 20-1089 | combatEngine.ts, gameStore.ts |
| Equipment | [equipment.ts](src/data/equipment.ts) | Full file | productionEngine.ts, gameStore.ts |
| Enemy | [enemies.ts](src/data/enemies.ts) | Full file | combatEngine.ts |
| Upgrade | [upgrades.ts](src/data/upgrades.ts) | Full file | productionEngine.ts, gameStore.ts |

**Tell Don't Ask Violations:**

Generator cost calculation at [productionEngine.ts:36-61](src/systems/productionEngine.ts#L36-L61):
```typescript
export function calculateGeneratorCost(generator: Generator, owned: number): Decimal {
  return generator.baseCost.times(
    Decimal.pow(generator.costMultiplier, owned)
  );
}
```

This should be `generator.getCost(ownedCount)` - the Generator should know how to calculate its own cost.

Hero stats at [productionEngine.ts:184-218](src/systems/productionEngine.ts#L184-L218):
```typescript
export function calculateHeroStats(heroId: string, heroState: HeroState): HeroStats {
  const heroDef = getHeroById(heroId);
  const stats: HeroStats = { ...heroDef.baseStats };
  const levelBonus = heroState.level - 1;
  stats.hp += heroDef.statGrowth.hp * levelBonus;
  // ... 20 more lines of external stat manipulation
}
```

This should be `hero.getStatsAtLevel(level, equipment)`.

**Lookup Function Proliferation:**

The codebase has 54+ instances of `getXxxById()` pattern calls:
- 34 calls to `getHeroById()`
- 9 calls to `getRecipeById()`
- 6 calls to `getZoneById()`
- 5 calls to `getGeneratorById()`

This indicates data is constantly fetched and externally processed rather than objects knowing their own behavior.

---

### 2. Missing Bounded Contexts

**God Object: gameStore.ts**

[gameStore.ts](src/stores/gameStore.ts) is a 2367-line monolith defining 89 methods across 8 implicit bounded contexts:

| Context | Method Count | Responsibilities |
|---------|--------------|------------------|
| Production | 15 | Generators, upgrades, CPS, clicking |
| Combat | 11 | Zones, battles, ATB, targeting, rewards |
| Heroes | 13 | Recruitment, leveling, equipment, party |
| Crafting | 16 | Recipes, caves, ingredients, aging, buffs |
| Prestige | 11 | Aging/Vintage/Legacy, rennet, resets |
| Achievements | 6 | Unlock tracking, rewards |
| Events | 4 | Seasonal events, multipliers |
| Persistence | 3 | Save, load, reset |

**Context Bleeding Examples:**

1. **Prestige resets Combat and Crafting state directly** at [gameStore.ts:1404-1466](src/stores/gameStore.ts#L1404-L1466):
```typescript
performAging: () => {
  // Line 1441-1452: Directly manipulates Combat state
  combat: {
    isInCombat: false,
    currentZone: null,
    // ... reset all combat fields
  }
  // Line 1454-1466: Directly manipulates Crafting state
  crafting: {
    ...s.crafting,
    activeJobs: [],
    cheeseInventory: [],
    activeBuffs: [],
  }
}
```

The Prestige context has intimate knowledge of Combat and Crafting internal field structure.

2. **Crafting engine checks Prestige and Combat state** at [craftingEngine.ts:298-310](src/systems/craftingEngine.ts#L298-L310):
```typescript
case 'prestige_rennet':
  return state.prestige.totalRennet >= req.amount;
case 'province_complete':
  return state.zoneProgress[req.provinceId]?.bossDefeated ?? false;
```

3. **Achievement checking accesses all contexts** at [gameStore.ts:2268-2366](src/stores/gameStore.ts#L2268-L2366):
```typescript
case 'totalCurds': return state.totalCurdsEarned.gte(requirement.amount);
case 'agingResets': return state.prestige.agingResetCount >= requirement.count;
case 'cheese_crafted_total': return Object.values(state.crafting.cheeseCollection)...
```

**Missing Aggregate Roots:**

Equipment is manipulated directly instead of through Hero aggregate at [gameStore.ts:853-860](src/stores/gameStore.ts#L853-L860):
```typescript
const newHeroState: HeroState = {
  ...s.heroes[heroId],
  equipment: {
    ...s.heroes[heroId].equipment,
    [equipment.slot]: equipmentId,
  },
};
```

---

### 3. Ubiquitous Language Violations

**Primary Currency Fragmentation:**

| Term | Location | Context |
|------|----------|---------|
| `curds` | [gameStore.ts:267](src/stores/gameStore.ts#L267) | State field |
| `curdPerSecond` | [gameStore.ts:78](src/stores/gameStore.ts#L78) | Production rate |
| `baseCps` | [generators.ts:11](src/data/generators.ts#L11) | Generator base |
| `curdReward` | [enemies.ts:52](src/data/enemies.ts#L52) | Combat drops |
| `CPS` | Function names | Abbreviation |

**Multiplier/Bonus/Modifier Chaos:**

Three different terms for the same concept (something that modifies a base value):

- **Multiplier**: `globalMultiplier`, `clickMultiplier`, `generatorMultiplier`, `costMultiplier`
- **Bonus**: `productionBonus`, `clickBonus`, `xpBonus`, `qualityBonus`, `legacyBonuses`
- **Modifier**: `qualityModifier`, `statModifiers`, `enemyLevelModifier`

Concrete confusion at [gameStore.ts:1089](src/stores/gameStore.ts#L1089): `calculateHeroCpsBonus()` returns a multiplier.

**Ability/Skill/SpecialAbility Overlap:**

| Term | Location | Usage |
|------|----------|-------|
| `specialAbility` | [heroes.ts:39](src/data/heroes.ts#L39) | Hero definition |
| `skills` | [enemies.ts:38](src/data/enemies.ts#L38) | Enemy attacks |
| `ability` | [types/game.ts:433](src/types/game.ts#L433) | HeroAbilityDefinition |
| `skillCooldowns` | [types/game.ts:285](src/types/game.ts#L285) | Combat tracking |

Heroes have "special abilities" but the combat system tracks "skill cooldowns".

**Effect Type Casing Inconsistency:**

- Snake_case: `damage_over_time`, `heal_over_time`, `production_boost`, `click_boost`
- CamelCase: `clickMultiplier`, `generatorMultiplier`

Mixed within the same codebase at [types/game.ts](src/types/game.ts) and [cheeseRecipes.ts](src/data/cheeseRecipes.ts).

---

### 4. Tight Coupling and Dependencies

**Shotgun Surgery: CPS Recalculation**

The same 8-line CPS calculation block is copy-pasted 15 times in [gameStore.ts](src/stores/gameStore.ts):

| Line Range | Function |
|------------|----------|
| 406-414 | buyGenerator |
| 468-476 | buyUpgrade |
| 578-586 | checkAchievements |
| 658-666 | recruitHero |
| 734-742 | assignToParty |
| 758-766 | removeFromParty |
| 784-792 | swapPartyPositions |
| 865-873 | equipItem |
| 903-911 | unequipItem |
| 978-986 | grantXp |
| 1102-1112 | recalculateCps |

A centralized helper `recalculateCpsFromState()` exists at [productionEngine.ts:494-512](src/systems/productionEngine.ts#L494-L512) but is **never imported or used**.

**Magic Numbers Scattered:**

| Constant | Value | Location |
|----------|-------|----------|
| ATB_MAX | 100 | [combatEngine.ts:33](src/systems/combatEngine.ts#L33) |
| BASE_ATB_RATE | 10 | [combatEngine.ts:34](src/systems/combatEngine.ts#L34) |
| LIMIT_BREAK_MAX | 100 | [combatEngine.ts:35](src/systems/combatEngine.ts#L35) |
| costMultiplier | 1.15 | [generators.ts](src/data/generators.ts) (15 times) |
| GAME_LOGIC_INTERVAL_MS | 100 | [gameLoop.ts:10](src/systems/gameLoop.ts#L10) |
| Defense formula divisor | 100 | [combatEngine.ts:87](src/systems/combatEngine.ts#L87) |
| ATB ready check | 100 | [CombatPanel.tsx:28](src/components/ui/CombatPanel.tsx#L28) |

UI components duplicate the ATB_MAX constant rather than importing it.

**Missing Abstraction Layer:**

UI components directly import engine functions:

| Component | Import | Line |
|-----------|--------|------|
| [HeroAbilityButton.tsx](src/components/ui/HeroAbilityButton.tsx) | getAbilityCooldown, isAbilityReady | 3 |
| [HeroPanel.tsx](src/components/ui/HeroPanel.tsx) | calculateHeroStats | 6 |
| [PartyFormationPanel.tsx](src/components/ui/PartyFormationPanel.tsx) | calculateHeroStats | 4 |

---

### 5. Broken Invariants and State Management Issues

**Eh Bonus Never Applied:**

At [gameStore.ts:1039-1043](src/stores/gameStore.ts#L1039-L1043):
```typescript
getEhBonus: () => {
  const { ehCount } = get();
  return 1 + Math.floor(ehCount / 100) * 0.01;
},
```

This bonus is calculated but never included in any CPS calculation. No call site multiplies by `getEhBonus()`.

**Taunt Mechanic Broken:**

Taunt status effect applied at [combatEngine.ts:1245-1267](src/systems/combatEngine.ts#L1245-L1267):
```typescript
const statusEffect: StatusEffect = {
  type: 'buff',
  stat: 'defense',
  value: 0,  // No stat change, just marker
  duration: effect.duration,
  source: source.heroId,
};
```

But targeting at [combatEngine.ts:140-156](src/systems/combatEngine.ts#L140-L156) only supports `random`, `lowest_hp`, `highest_hp` - no taunt priority logic exists.

**tickCrafting is a No-Op:**

At [gameStore.ts:1857-1863](src/stores/gameStore.ts#L1857-L1863):
```typescript
tickCrafting: (_deltaMs: number) => {
  // Check for completed jobs...
  // For now, this just keeps jobs updated for progress display
},
```

Function body is empty despite being called every tick from gameLoop.

**Boss Reward Multipliers Incomplete:**

At [combatEngine.ts:943-949](src/systems/combatEngine.ts#L943-L949), only 5 of 13+ bosses have reward multipliers defined. Others silently fall back to default values.

**Events Auto-Activation Missing:**

At [events.ts](src/data/events.ts), all 4 seasonal events have `isActive: false` with no auto-activation logic based on dates.

---

## Architecture Insights

### Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────┐
│                     gameStore.ts (2367 lines)               │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐       │
│  │Production│ Combat  │Crafting │ Heroes  │Prestige │ ...   │
│  │ (all)   │ (all)   │ (all)   │ (all)   │ (all)   │       │
│  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘       │
└───────┼─────────┼─────────┼─────────┼─────────┼────────────┘
        │         │         │         │         │
   ┌────▼────┐┌───▼────┐┌───▼────┐┌───▼────┐┌───▼────┐
   │src/data/││combat  ││crafting││prod.   ││types/  │
   │*.ts     ││Engine  ││Engine  ││Engine  ││game.ts │
   │(anemic) ││        ││        ││        ││        │
   └─────────┘└────────┘└────────┘└────────┘└────────┘
```

### Recommended Architecture (DDD)

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Service                       │
└──────┬────────────┬────────────┬────────────┬───────────────┘
       │            │            │            │
┌──────▼─────┐┌─────▼─────┐┌─────▼─────┐┌─────▼─────┐
│ Production ││  Combat   ││ Crafting  ││  Heroes   │
│  Context   ││  Context  ││  Context  ││  Context  │
│ ┌────────┐ ││ ┌───────┐ ││ ┌───────┐ ││ ┌───────┐ │
│ │Generator│ ││ │Zone   │ ││ │Recipe │ ││ │Hero   │ │
│ │(rich)  │ ││ │(rich) │ ││ │(rich) │ ││ │(rich) │ │
│ └────────┘ ││ └───────┘ ││ └───────┘ ││ └───────┘ │
└────────────┘└───────────┘└───────────┘└───────────┘
```

### Key DDD Principles Violated

1. **Entities should encapsulate behavior** - All entities are DTOs
2. **Aggregates should enforce invariants** - No aggregate roots exist
3. **Bounded contexts should be explicit** - Everything is in one store
4. **Ubiquitous language should be consistent** - Multiple names for same concepts
5. **Anti-corruption layers should isolate contexts** - Contexts directly access each other's state

---

## Code References

- [gameStore.ts](src/stores/gameStore.ts) - 2367-line god object
- [productionEngine.ts:494-512](src/systems/productionEngine.ts#L494-L512) - Unused centralized helper
- [gameStore.ts:1039-1043](src/stores/gameStore.ts#L1039-L1043) - Eh bonus never applied
- [combatEngine.ts:140-156](src/systems/combatEngine.ts#L140-L156) - Taunt ignored in targeting
- [gameStore.ts:1857-1863](src/stores/gameStore.ts#L1857-L1863) - No-op tickCrafting
- [types/game.ts](src/types/game.ts) - Mixed snake_case/camelCase effects

---

## Open Questions

1. Should the store be split into separate Zustand slices per bounded context?
2. Would rich domain models work with React's immutability requirements, or is the Command pattern needed?
3. How to handle cross-context operations (prestige reset, achievement checking) with proper isolation?
4. Is the ATB system terminology acceptable, or should it be themed to match Canadian cheese domain?

---

## Recommendations Priority

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 1 | Fix Eh bonus not applied | Bug | Low |
| 2 | Fix taunt mechanic | Bug | Medium |
| 3 | Remove tickCrafting no-op | Cleanup | Low |
| 4 | Extract CPS calculation helper | DRY | Medium |
| 5 | Consolidate magic numbers | Maintainability | Medium |
| 6 | Standardize multiplier/bonus naming | Clarity | Medium |
| 7 | Split store into context slices | Architecture | High |
| 8 | Create rich domain models | Architecture | Very High |

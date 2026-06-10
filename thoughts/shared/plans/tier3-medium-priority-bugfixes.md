# Tier 3 Medium-Priority Bugfixes Implementation Plan

## Overview

This plan addresses **8 high-impact Tier-3 bugs** identified in the 2026-06-10 codebase scan. These are bugs that cause incorrect behavior in specific scenarios, performance issues, or game balance problems — but not data corruption.

## Current State Analysis

Tier-1 (7 critical) and Tier-2 (12 high) bugs are fixed on branch `fix/tier2-high-priority-bugfixes`. The remaining Tier-3 bugs have been verified and prioritized.

**14 bugs verified as still present.** This plan focuses on the **8 highest-impact** ones:

| Priority | Bug | Impact | Complexity |
|----------|-----|--------|------------|
| 1 | Enemy targetType ignored (AoE does single-target) | HIGH | Moderate |
| 2 | Heroes/ZoneProgress not reset during prestige | HIGH | Moderate |
| 3 | Eh multiplier not in click value | MEDIUM | Simple |
| 4 | Enemy ability selection prefers first ability | MEDIUM | Simple |
| 5 | StatusEffect mutation pattern | MEDIUM | Simple |
| 6 | tickHeroXp triggers 4x CPS recalcs | MEDIUM | Simple |
| 7 | Event multipliers not in displayed CPS | MEDIUM | Moderate |
| 8 | CraftingPanel non-memoized selectors | LOW | Simple |

## Desired End State

1. Enemy AoE abilities damage all heroes, not just one
2. Prestige (Aging) resets heroes to base state and clears zone progress
3. Eh multiplier applies to both CPS AND click value
4. Enemy ability selection is randomized among available abilities
5. StatusEffect processing returns new objects, doesn't mutate
6. Hero XP tick publishes one CpsInputsChanged event, not 4
7. Displayed CPS includes active event multipliers
8. CraftingPanel uses memoized selectors

## What We're NOT Doing

- Tier-4 low-priority bugs (cosmetic, minor code quality)
- Cross-slice architecture refactoring (deferred to DDD roadmap)
- Dead code cleanup (craftingEngine.ts — separate PR)
- Event check frequency change (design decision, not a bug)
- ParticleBurst callback memoization (parent component issue)

---

## Phase 1: Combat Correctness Fixes

### Overview

Fix enemy ability targeting and selection to match intended game design.

### Changes Required:

#### 1.1 Support Enemy AoE Targeting

**File**: `src/domain/aggregates/Battle.ts`
**Location**: `#executeEnemyActions` method, around line 457-458

Currently all enemy damage hits single target regardless of ability `targetType`. Need to check `ability.targetType` and apply damage to all heroes when `'all'`.

```typescript
// In #executeEnemyActions, after selecting target and calculating damage:

// Instead of just:
// target.currentHp -= actualDamage;

// Check for AoE:
if (ability?.targetType === 'all') {
  // Damage all alive heroes
  for (const hero of this.#party) {
    if (hero.currentHp > 0) {
      const heroDefense = this.#getEffectiveDefense(hero);
      const heroDamage = Math.max(1, baseDamage - heroDefense);
      hero.currentHp = Math.max(0, hero.currentHp - heroDamage);
      
      this.#logEntries.push({
        timestamp: Date.now(),
        type: 'damage',
        source: enemy.name,
        target: hero.name,
        value: heroDamage,
        message: `${enemy.name} hits ${hero.name} for ${heroDamage} damage!`,
      });
    }
  }
} else {
  // Single target (existing logic)
  target.currentHp = Math.max(0, target.currentHp - actualDamage);
  this.#logEntries.push({
    timestamp: Date.now(),
    type: 'damage',
    source: enemy.name,
    target: target.name,
    value: actualDamage,
    message: `${enemy.name} hits ${target.name} for ${actualDamage} damage!`,
  });
}
```

#### 1.2 Randomize Enemy Ability Selection

**File**: `src/domain/aggregates/Battle.ts`
**Location**: `#selectAbilityFromCooldowns` method, around line 555-565

Currently returns the first non-cooldown ability. Need to collect all available abilities and pick randomly.

```typescript
#selectAbilityFromCooldowns(
  abilities: EnemyAbility[],
  cooldowns: Map<string, number>
): EnemyAbility | undefined {
  // Collect all abilities not on cooldown
  const available = abilities.filter((ability) => {
    const cooldown = cooldowns.get(ability.name) ?? 0;
    return cooldown <= 0;
  });
  
  if (available.length === 0) return undefined;
  
  // Random selection instead of always first
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}
```

#### 1.3 Fix StatusEffect Mutation

**File**: `src/systems/combatEngine.ts`
**Location**: `processStatusEffects` function, around line 205

Currently mutates `effect.duration -= 1` directly. Return new effect objects instead.

```typescript
export function processStatusEffects(
  effects: StatusEffect[]
): { remaining: StatusEffect[]; expired: StatusEffect[] } {
  const remaining: StatusEffect[] = [];
  const expired: StatusEffect[] = [];
  
  for (const effect of effects) {
    // Create new object instead of mutating
    const updated = { ...effect, duration: effect.duration - 1 };
    
    if (updated.duration > 0) {
      remaining.push(updated);
    } else {
      expired.push(updated);
    }
  }
  
  return { remaining, expired };
}
```

Update all callers to use the returned `remaining` array instead of the mutated input.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Fight enemy with `targetType: 'all'` ability — all heroes take damage
- [ ] Boss uses variety of abilities, not just the first one
- [ ] Status effects expire correctly without console errors

---

## Phase 2: Prestige System Fix

### Overview

Ensure prestige (Aging) properly resets heroes and zone progress to maintain game balance.

### Changes Required:

#### 2.1 Create Hero Reset Factory

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Add export**: New function for prestige reset

```typescript
export function getPrestigeHeroReset(): Partial<HeroState> {
  return {
    heroes: {},           // Remove all recruited heroes
    party: [],            // Clear party
    recruitedHeroes: [],  // Clear recruitment list
    equipment: {},        // Clear equipment
  };
}
```

#### 2.2 Create Zone Progress Reset

**File**: `src/stores/slices/combat/combatSlice.ts`
**Modify**: `getPrestigeCombatReset` function

```typescript
export function getPrestigeCombatReset(): CombatState {
  return {
    ...createEmptyCombatState(),
    zoneProgress: {},     // Reset all zone progress
  };
}
```

#### 2.3 Wire Into Prestige Reset

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Location**: `performAging` function, around line 73-91

```typescript
performAging: () => {
  const state = get();
  if (!canPrestige(state.curds, state.curdPerSecond)) return;
  
  const rennetGained = calculatePrestigeRennet(state.curds, state.curdPerSecond);
  
  // Get all reset states
  const productionReset = state.getPrestigeProductionReset();
  const combatReset = state.getPrestigeCombatReset();
  const craftingReset = state.getPrestigeCraftingReset('aging');
  const heroReset = state.getPrestigeHeroReset();  // NEW
  
  set({
    ...productionReset,
    combat: combatReset,
    crafting: craftingReset,
    ...heroReset,  // NEW: Reset heroes
    prestige: {
      ...state.prestige,
      rennet: state.prestige.rennet + rennetGained,
      timesAged: state.prestige.timesAged + 1,
    },
  });
  
  publish({ type: 'CpsInputsChanged' });
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] After Aging reset: no heroes in party
- [ ] After Aging reset: zone progress shows 0/10 for all zones
- [ ] Recruitment costs reset to base values

---

## Phase 3: Click Value Consistency

### Overview

Apply Eh multiplier to click value for consistency with CPS calculation.

### Changes Required:

#### 3.1 Add Eh Multiplier to Click Value

**File**: `src/stores/slices/production/cpsCalculator.ts`
**Location**: `computeClickValue` function, around line 52-57

```typescript
export function computeClickValue(state: CpsInputs): Decimal {
  const baseClickValue = new Decimal(1);
  
  // Get all multipliers
  const upgradeMultiplier = calculateUpgradeClickMultiplier(state.upgrades);
  const achievementMultiplier = calculateAchievementClickMultiplier(state.achievements);
  const prestigeMultipliers = calculatePrestigeClickMultiplier(state.prestige);
  const ehMultiplier = state.getEhMultiplier();  // NEW: Include Eh
  
  return baseClickValue
    .mul(upgradeMultiplier)
    .mul(achievementMultiplier)
    .mul(prestigeMultipliers)
    .mul(ehMultiplier);  // NEW
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Eh bonus tooltip shows multiplier applies to "CPS and clicks"
- [ ] Click value increases as Eh tier increases

---

## Phase 4: Performance Optimization

### Overview

Reduce unnecessary CPS recalculations and React re-renders.

### Changes Required:

#### 4.1 Batch Hero XP Updates

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Location**: `tickHeroXp` function, around line 280-295

```typescript
tickHeroXp: (deltaMs: number) => {
  const state = get();
  const buffMultipliers = state.getActiveBuffMultipliers();
  const eventMultipliers = state.getEventMultipliers();
  const prestigeMultipliers = state.getPrestigeMultipliers();
  
  // Calculate all XP grants first
  const xpUpdates: Record<string, number> = {};
  let anyLevelUp = false;
  
  for (const heroId of state.party) {
    const hero = state.heroes[heroId];
    if (!hero) continue;
    
    const xpPerSecond = calculateHeroXpPerSecond(hero, state.curdPerSecond);
    const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * prestigeMultipliers.xp * deltaMs) / 1000;
    
    const newXp = hero.xp + xpGained;
    const newLevel = calculateHeroLevel(newXp);
    
    if (newLevel > hero.level) {
      anyLevelUp = true;
    }
    
    xpUpdates[heroId] = newXp;
  }
  
  // Single state update for all heroes
  set((s) => ({
    heroes: Object.fromEntries(
      Object.entries(s.heroes).map(([id, hero]) => [
        id,
        xpUpdates[id] !== undefined
          ? { ...hero, xp: xpUpdates[id], level: calculateHeroLevel(xpUpdates[id]) }
          : hero,
      ])
    ),
  }));
  
  // Single CPS recalc if any level-ups
  if (anyLevelUp) {
    publish({ type: 'CpsInputsChanged' });
  }
},
```

#### 4.2 Memoize CraftingPanel Selectors

**File**: `src/components/ui/CraftingPanel.tsx`
**Location**: Lines 22-27

```typescript
// Instead of:
// const recipes = getUnlockedRecipes();
// const caves = getUnlockedCaves();

// Use useMemo:
const recipes = useMemo(() => getUnlockedRecipes(), [crafting.unlockedRecipes]);
const caves = useMemo(() => getUnlockedCaves(), [crafting.unlockedCaves]);
const ingredients = useMemo(() => getUnlockedIngredients(), [crafting.unlockedIngredients]);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [ ] React DevTools shows no excessive re-renders in CraftingPanel

#### Manual Verification:
- [ ] Console shows 1 CPS recalc per tick (not 4) when heroes gain XP

---

## Phase 5: Event Display Accuracy

### Overview

Include active event multipliers in the displayed CPS value.

### Changes Required:

#### 5.1 Include Events in CPS Calculation

**File**: `src/stores/slices/production/cpsCalculator.ts`
**Location**: `computeCps` function, around line 22-45

```typescript
export function computeCps(state: CpsInputs): Decimal {
  // ... existing multiplier calculations ...
  
  // NEW: Get event multipliers
  const eventMultipliers = state.getEventMultipliers();
  
  const totalGlobalMultiplier =
    upgradeGlobalMultiplier *
    achievementGlobalMultiplier *
    prestigeMultiplier *
    efficiencyMultiplier *
    ehMultiplier *
    eventMultipliers.production;  // NEW
  
  // ... rest of calculation ...
}
```

**Note**: This will cause CPS to change when events activate/deactivate. The `recalculateCps` call in `checkEventActivation` already exists, so this should work automatically.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`

#### Manual Verification:
- [ ] During seasonal event: displayed CPS is higher than normal
- [ ] CPS tooltip shows "Event: +X%" breakdown

---

## Testing Strategy

### Unit Tests:

Due to no existing test suite, focus on manual verification.

### Manual Testing Steps:

1. **Combat AoE**: Enter combat against Lac St-Jean zone (has AoE enemies), verify all party members take damage from AoE attacks
2. **Prestige Reset**: Perform Aging reset, verify heroes are cleared and zone progress is 0
3. **Eh Click**: Get Eh multiplier to 2x, verify click value doubles
4. **Enemy Variety**: Fight boss, observe different abilities being used (not always first)
5. **Performance**: Open React DevTools Profiler, verify CraftingPanel doesn't re-render on unrelated state changes
6. **Events**: During Maple Fest (or mock activate), verify CPS shows event multiplier

## Success Criteria Summary

### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Lint passes: `npm run lint`
- [ ] App runs without console errors: `npm run dev`

### Manual Verification:
- [ ] All 8 bugs verified fixed via manual testing above

## References

- Bug scan: `thoughts/shared/research/2026-06-10_18-16-59_bugs-brittle-code-tiered-scan.md`
- Tier 2 fixes: `thoughts/shared/plans/tier2-high-priority-bugfixes.md`
- Constants file: `src/data/constants.ts`
- Prestige reset factories: `src/stores/resetFactory.ts`

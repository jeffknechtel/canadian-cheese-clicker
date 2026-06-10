# Tier 2 High-Priority Bugfixes Implementation Plan

## Overview

This plan addresses 9 remaining Tier 2 (High) bugs identified in the 2026-06-10 codebase scan. These are features that exist in the data model but lack runtime behavior — players see UI elements that don't work.

## Current State Analysis

The Tier 1 critical bugs were fixed in commit `2326bf8`. Three Tier 2 bugs were also fixed:
- `checkAchievements()` now called after combat (`combatSlice.ts:110-111`)
- `checkAchievements()` now called after hero recruitment (`heroSlice.ts:55-56`)
- CombatPanel stale closure fixed with proper dependency arrays

**9 bugs remain**, grouped by system:
- **Combat** (3): Enemy ability effects, immunity system, dropRateBonus
- **Prestige** (3): XP multiplier, generatorEfficiency, Vintage/Legacy resets
- **Save/Load** (2): Event activation ordering, future version handling
- **Crafting** (1): Interaction validation

## Desired End State

1. Enemy abilities apply their status effects (DoT, debuffs, buffs)
2. Immunity effects actually prevent the specified debuff type
3. dropRateBonus increases combat rewards
4. Prestige XP multiplier applies to hero XP gain
5. generatorEfficiency effect increases per-generator output
6. Vintage/Legacy resets mirror Aging reset behavior
7. Event activation persists after loading saved state
8. Future save versions show warning and refuse to load
9. Crafting interactions enforce per-type limits

## What We're NOT Doing

- Tier 3/4 bugs (edge cases, tech debt, code quality)
- New features or balance changes
- Refactoring beyond what's needed for the fix
- Full Vintage/Legacy system implementation (just the reset logic)

---

## Phase 1: Combat System Fixes

### Overview

Wire enemy ability effects into the Battle aggregate and make immunity/dropRateBonus functional.

### Changes Required:

#### 1. Apply Enemy Ability Effects

**File**: `src/domain/aggregates/Battle.ts`
**Location**: Lines 444-488, inside `#executeEnemyActions`

After calculating damage, apply the ability's status effect if present:

```typescript
// After line 488 (after damage is applied), add:
if (ability?.effect) {
  const statusEffect: StatusEffect = {
    id: `enemy_${enemy.id}_${ability.name}_${Date.now()}`,
    type: ability.effect.type,
    stat: ability.effect.stat,
    value: ability.effect.value,
    duration: ability.effect.duration,
    source: enemy.id,
  };
  
  if (ability.effect.type === 'buff') {
    // Self-buff on enemy
    enemy.statusEffects.push(statusEffect);
  } else {
    // Debuff on target hero
    target.statusEffects.push(statusEffect);
  }
  
  this.#logEntries.push({
    timestamp: Date.now(),
    type: 'status',
    source: enemy.name,
    target: ability.effect.type === 'buff' ? enemy.name : target.name,
    message: `${ability.name} applied ${ability.effect.stat} ${ability.effect.type}!`,
  });
}
```

#### 2. Fix Immunity System

**File**: `src/systems/combatEngine.ts`
**Location**: Lines 922-950

Replace the placeholder defense buff with actual immunity tracking:

```typescript
case 'immunity': {
  if (!effect.immunityType) break;
  
  const statusEffect: StatusEffect = {
    id: `immunity_${effect.immunityType}_${Date.now()}`,
    type: 'immunity',
    stat: effect.immunityType, // 'stun', 'poison', etc.
    value: 1, // Binary: immune or not
    duration: effect.duration,
    source: source.heroId,
  };
  
  source.statusEffects.push(statusEffect);
  
  logEntries.push({
    timestamp: Date.now(),
    type: 'status',
    source: heroName,
    target: heroName,
    message: `Immune to ${effect.immunityType} for ${effect.duration} turns!`,
  });
  break;
}
```

**File**: `src/domain/aggregates/Battle.ts` or `src/systems/combatEngine.ts`
**Add helper**: Check immunity before applying debuffs

```typescript
function hasImmunity(target: { statusEffects: StatusEffect[] }, debuffType: string): boolean {
  return target.statusEffects.some(
    (e) => e.type === 'immunity' && e.stat === debuffType && e.duration > 0
  );
}
```

Then wrap debuff application with immunity check.

#### 3. Wire dropRateBonus to Rewards

**File**: `src/systems/combatEngine.ts`
**Location**: Lines 953-963

Store the effect as a status effect:

```typescript
case 'dropRateBonus': {
  const statusEffect: StatusEffect = {
    id: `droprate_${Date.now()}`,
    type: 'buff',
    stat: 'dropRate',
    value: effect.value,
    duration: effect.duration,
    source: source.heroId,
  };
  
  // Add to all party members so calculateCombatRewards can find it
  for (const hero of party) {
    hero.statusEffects.push(statusEffect);
  }
  
  logEntries.push({
    timestamp: Date.now(),
    type: 'status',
    source: heroName,
    target: 'Party',
    message: `Drop rates increased by ${effect.value}% for ${effect.duration} turns!`,
  });
  break;
}
```

**File**: `src/systems/combatEngine.ts`
**Location**: `calculateCombatRewards` function

Add drop rate bonus to reward calculation:

```typescript
// Inside calculateCombatRewards, before returning rewards:
const dropRateBonus = party.reduce((sum, hero) => {
  const dropBuff = hero.statusEffects.find((e) => e.stat === 'dropRate' && e.duration > 0);
  return sum + (dropBuff?.value ?? 0);
}, 0);

const dropMultiplier = 1 + dropRateBonus / 100;
// Apply to equipment/item drops, not curds
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Tests pass: `npm test` (no tests exist)
- [x] No lint errors: `npm run lint`

#### Manual Verification:
- [ ] Enemy with DoT ability (e.g., poison) applies damage over time to hero
- [ ] Hero with immunity ability blocks the specified debuff type
- [ ] dropRateBonus buff appears in combat log and affects rewards

---

## Phase 2: Prestige System Fixes

### Overview

Apply prestige multipliers that are calculated but never used.

### Changes Required:

#### 1. Apply Prestige XP Multiplier

**File**: `src/stores/slices/heroes/heroSlice.ts`
**Location**: Lines 283-286, `tickHeroXp`

```typescript
// Change from:
const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * deltaMs) / 1000;

// To:
const prestigeMultipliers = state.getPrestigeMultipliers();
const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * prestigeMultipliers.xp * deltaMs) / 1000;
```

#### 2. Implement generatorEfficiency Effect

**File**: `src/systems/productionEngine.ts`
**Location**: `calculatePrestigeProductionMultiplier` (lines 322-344)

Add handling for `generatorEfficiency`:

```typescript
export function calculatePrestigeProductionMultiplier(prestige: PrestigeState): number {
  let multiplier = 1;
  let efficiencyPerGenerator = 0;
  
  for (const upgradeId of prestige.agingUpgrades) {
    const upgrade = agingUpgrades.find((u) => u.id === upgradeId);
    if (!upgrade) continue;
    
    if (upgrade.effect.type === 'productionBonus') {
      multiplier += upgrade.effect.value;
    } else if (upgrade.effect.type === 'generatorEfficiency') {
      efficiencyPerGenerator += upgrade.effect.value;
    }
  }
  
  return { multiplier, efficiencyPerGenerator };
}
```

**File**: `src/stores/slices/production/cpsCalculator.ts`
**Location**: `computeCps`

Apply efficiency per generator:

```typescript
// Get efficiency bonus
const { multiplier: prestigeMultiplier, efficiencyPerGenerator } = 
  calculatePrestigeProductionMultiplier(prestige);

// In generator loop, add:
const generatorCount = generators[gen.id] ?? 0;
const efficiencyBonus = 1 + (efficiencyPerGenerator * generatorCount);
const genCps = gen.getCps(generatorCount).mul(efficiencyBonus);
```

#### 3. Complete Vintage/Legacy Resets

**File**: `src/stores/slices/prestige/prestigeSlice.ts`
**Location**: `performVintage` (lines 156-179) and `performLegacy` (lines 186-205)

Add reset calls matching `performAging`:

```typescript
performVintage: () => {
  const state = get();
  if (state.prestige.rennet < VINTAGE_THRESHOLD) return;
  
  const wheelsGained = Math.floor(state.prestige.rennet / 100);
  
  // Reset production, combat, crafting (same as aging)
  set(getPrestigeProductionReset());
  set(getPrestigeCombatReset());
  set(getPrestigeCraftingReset());
  
  // Additionally reset aging upgrades for vintage
  set({
    prestige: {
      ...get().prestige,
      rennet: state.prestige.rennet % 100,
      vintageWheels: state.prestige.vintageWheels + wheelsGained,
      agingUpgrades: [], // Reset aging upgrades
      timesAged: 0,
    },
  });
  
  get().recalculateCps();
  get().recalculateClickValue();
},
```

Similar pattern for `performLegacy`, additionally resetting vintage state.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Tests pass: `npm test` (no tests exist)

#### Manual Verification:
- [ ] "Aging Wisdom" upgrade visibly increases hero XP gain rate
- [ ] "Master Affineur" upgrade increases CPS proportionally to generator count
- [ ] Vintage reset properly resets production/combat/crafting state

---

## Phase 3: Save/Load Fixes

### Overview

Fix event activation ordering and add future version protection.

### Changes Required:

#### 1. Fix Event Activation Ordering

**File**: `src/stores/slices/persistence/persistenceSlice.ts`
**Location**: Lines 20-40

Reorder to check events AFTER loading saved state:

```typescript
load: () => {
  const savedState = loadGame();
  if (!savedState) {
    // No save exists - check events for fresh game
    get().checkEventActivation();
    return null;
  }
  
  // Merge saved state first
  set({
    ...savedState,
    lastSaved: Date.now(),
  });
  
  // Recalculate derived values
  get().recalculateCps();
  get().recalculateClickValue();
  
  // NOW check events (will update activeEvents based on current date)
  get().checkEventActivation();
  
  // Calculate offline progress with correct CPS
  const { curdPerSecond } = get();
  const offlineProgress = calculateOfflineProgress(curdPerSecond, savedState.lastSaved);
  // ... rest of offline progress handling
},
```

#### 2. Add Future Version Protection

**File**: `src/systems/saveSystem.ts`
**Location**: Lines 200-206

Add early check for future versions:

```typescript
export function loadGame(): GameState | null {
  // ... existing localStorage read ...
  
  if (data.version > CURRENT_VERSION) {
    console.error(
      `Save version ${data.version} is from a newer game version. ` +
      `Current version is ${CURRENT_VERSION}. Cannot load.`
    );
    // Optionally show user notification
    return null;
  }
  
  if (data.version < CURRENT_VERSION) {
    console.log(`Migrating save from v${data.version} to v${CURRENT_VERSION}`);
    const migratedState = runMigrations(data.state as any, data.version);
    return deserializeState(migratedState as SerializedGameState);
  }
  
  return deserializeState(data.state);
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Tests pass: `npm test` (no tests exist)

#### Manual Verification:
- [ ] Seasonal event activates correctly after loading a save during event period
- [ ] Save from "future" version (manually edit localStorage) shows error and doesn't corrupt state

---

## Phase 4: Crafting Validation Fix

### Overview

Add per-type interaction limits to prevent unlimited rind washes/turns.

### Changes Required:

#### 1. Add Interaction Validation

**File**: `src/stores/slices/crafting/craftingSlice.ts`
**Location**: `addInteraction` function (lines 395-428)

Import and use the validation from craftingEngine:

```typescript
import { canAddInteraction, INTERACTION_LIMITS } from '@/systems/craftingEngine';

// Or inline the limits if we want to delete craftingEngine:
const INTERACTION_LIMITS: Record<string, number> = {
  rind_wash: 3,
  turn: 10,
  flavor_addition: 2,
  brine: 5,
  smoke: 2,
  press: 3,
};

addInteraction: (jobId: string, interactionType: string) => {
  const state = get();
  const job = state.crafting.activeJobs.find((j) => j.id === jobId);
  
  if (!job) return false;
  if (Date.now() > job.endTime) return false;
  
  // NEW: Check interaction limit
  const limit = INTERACTION_LIMITS[interactionType] ?? Infinity;
  const currentCount = job.interactions.filter((i) => i.type === interactionType).length;
  if (currentCount >= limit) {
    console.log(`Interaction limit reached: ${interactionType} (${currentCount}/${limit})`);
    return false;
  }
  
  // NEW: Check if cheese is still fresh enough for certain interactions
  const recipe = recipeRegistry.get(job.recipeId);
  if (recipe && interactionType === 'flavor_addition') {
    const progress = (Date.now() - job.startTime) / (job.endTime - job.startTime);
    if (progress > 0.5) {
      console.log('Too late to add flavors - cheese is past 50% aging');
      return false;
    }
  }
  
  // ... rest of existing implementation
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] Tests pass: `npm test` (no tests exist)

#### Manual Verification:
- [ ] Cannot add more than 3 rind washes to a single cheese
- [ ] Cannot add more than 10 turns to a single cheese
- [ ] Flavor addition blocked after cheese is 50% aged

---

## Testing Strategy

### Unit Tests:
- Test immunity blocks specific debuff types
- Test dropRateBonus affects reward calculation
- Test generatorEfficiency scales with generator count
- Test interaction limits are enforced

### Integration Tests:
- Full combat with enemy ability effects
- Prestige cycle with all multipliers applied
- Save/load cycle during seasonal event

### Manual Testing Steps:
1. Start combat against enemy with status effect ability
2. Verify effect appears on hero and damages/debuffs over time
3. Use hero immunity ability, verify blocked debuffs
4. Check prestige XP multiplier in hero panel tooltip
5. Perform Vintage reset, verify all state properly reset
6. Modify localStorage to have future version, verify graceful rejection

## References

- Bug scan: `thoughts/shared/research/2026-06-10_18-16-59_bugs-brittle-code-tiered-scan.md`
- Tier 1 fixes: commit `2326bf8`
- Constants file: `src/data/constants.ts`
- Prestige upgrades: `src/data/agingUpgrades.ts`

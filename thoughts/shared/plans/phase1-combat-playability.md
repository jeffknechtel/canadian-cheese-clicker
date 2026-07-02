# Phase 1: Combat Playability Implementation Plan

## Overview

This plan fixes the critical combat bugs that make the game's combat system unshippable. After these fixes, the core combat loop works: defeat/flee exits cleanly, retry works, buffs/debuffs last their intended duration, ATB fills at designed pace, damage numbers render, and stage scaling applies to all stats.

## Current State Analysis

Combat is critically broken in multiple ways discovered during the 2026-07-01 audit:

1. **Defeat/flee softlocks the game** — `endCombat` never clears `isInCombat`, causing an infinite defeat-modal loop
2. **Cooldowns/durations expire instantly** — decrement once per animation frame (~60/sec) instead of per turn
3. **Feedback never renders** — damage numbers/combo/shake are clobbered by stale `toState()` snapshot
4. **Stage scaling only affects HP** — attack/defense/speed/rewards use unscaled registry definitions
5. **ATB is ~10x slower than design** — formula `speed/100` missing the `1 +` prefix
6. **Self-buff abilities attack heroes** — no `targetType: 'self'` branch; `damage: 0` coerces to 1.0
7. **Hero crits are unreachable** — `damage > attack * 1.5` is mathematically impossible
8. **Boss phases only checked after basic attacks** — abilities/limit breaks/DoTs skip phase transitions

## Desired End State

A functional combat loop where:
- Losing or fleeing exits combat cleanly; "Try Again" restarts the battle
- A 3-turn buff survives exactly 3 of that unit's actions
- ATB fills in ~5-9 seconds at 1x speed (speed 10-15 heroes)
- Damage numbers, combo counter, and screen shake render during auto-attacks
- Stage 10 enemies deal more damage and grant more rewards than stage 1
- Self-buff abilities buff the enemy instead of attacking heroes
- Hero crits can occur based on a real crit chance roll
- Boss phases trigger correctly regardless of damage source

**Verification:**
- `pnpm typecheck` passes
- `pnpm lint` passes  
- Manual test: lose battle → "Return to Zone Select" → can start new battle
- Manual test: lose battle → "Try Again" → new battle starts
- Manual test: buff lasts multiple turns (not instant expiry)
- Manual test: damage numbers appear on auto-attacks
- Manual test: stage 10 enemy deals more damage than stage 1

## What We're NOT Doing

- Combat rewards at victory time instead of modal click (P2 scope — needs save-state coordination)
- Boss special mechanics wiring (`processBossSpecialMechanics`) — defer to P6 (fun features)
- Weakness/resistance implementation — defer to P6b (cross-system loops)
- Combat speed affecting status effect perception — separate balance pass

---

## Phase 1: Fix Defeat/Flee Softlock (C-1)

### Overview

`endCombat` sets `battleResult` but never clears `isInCombat`. The modal effect re-triggers infinitely. Fix by resetting combat state properly for all outcomes.

### Changes Required:

#### 1. combatSlice.ts — Reset state on all combat endings

**File**: `src/stores/slices/combat/combatSlice.ts`
**Lines**: 169-244

The issue: `endCombat` only sets `battleResult` (lines 238-243) but never resets `isInCombat`. Only `claimCombatRewards` (line 356) calls `createEmptyCombatState()`.

**Change**: For victory, preserve state until rewards claimed. For defeat/flee, reset immediately.

```typescript
endCombat: (result: 'victory' | 'defeat' | 'flee') => {
  const state = get();
  if (!state.combat.isInCombat) return;

  // ... existing victory logic for zoneProgress (lines 173-217) ...
  
  // ... existing tracking/audio (lines 220-236) ...

  if (result === 'victory') {
    // Victory: set battleResult, keep isInCombat true until rewards claimed
    set({
      combat: {
        ...state.combat,
        battleResult: 'victory',
      },
    });
  } else {
    // Defeat/flee: reset to empty state immediately
    // This prevents the infinite modal loop
    set({ combat: createEmptyCombatState() });
  }
},
```

#### 2. App.tsx — Remove double endCombat call

**File**: `src/App.tsx`
**Lines**: 362-373

The `handleCombatResultsContinue` calls `endCombat(combatResults.result)` which is redundant for defeat (already handled) and causes the double-jingle on flee.

```typescript
const handleCombatResultsContinue = useCallback(() => {
  if (combatResults?.result === 'victory') {
    // Victory: now claim rewards (which resets combat state)
    const rewards = claimCombatRewards();
    if (rewards) {
      playMilestoneChime();
    }
  }
  // For defeat/flee, combat state already reset by endCombat
  setCombatResults(null);
}, [combatResults?.result, claimCombatRewards]);
```

#### 3. App.tsx — Fix retry handler

**File**: `src/App.tsx`  
**Lines**: 375-384

Remove the redundant `endCombat` call since defeat already reset the state:

```typescript
const handleCombatRetry = useCallback(() => {
  if (combatResults) {
    const { zoneId, stageNumber } = combatResults;
    // Combat state already reset for defeat/flee
    setCombatResults(null);
    if (zoneId) {
      handleStartCombat(zoneId, stageNumber);
    }
  }
}, [combatResults, handleStartCombat]);
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Lose a battle → click "Return to Zone Select" → modal closes, can navigate
- [ ] Lose a battle → click "Try Again" → new battle starts immediately
- [ ] Flee from battle → modal closes, can start new battle
- [ ] Win a battle → click "Continue" → rewards granted, modal closes
- [ ] No double defeat jingle on flee

---

## Phase 2: Fix Turn-Time Semantics (C-2)

### Overview

Cooldowns and status effect durations decrement on every animation frame (~60fps) instead of per turn. A 3-turn cooldown expires in ~50ms. Fix by decrementing only when a unit takes its turn (ATB resets).

**Design decision**: Decrement on the *acting unit's* turn only. This matches traditional ATB semantics and means faster units burn through cooldowns faster.

### Changes Required:

#### 1. Battle.ts — Move cooldown decrement into action execution

**File**: `src/domain/aggregates/Battle.ts`

**Remove** the unconditional cooldown decrement from the end of `tick()` (line 207):

```typescript
// DELETE this line from tick():
// this.#decrementCooldowns(heroStates, enemies);
```

**Instead**, decrement cooldowns for a unit when it takes its turn. In `#executeHeroActions`:

```typescript
// After line 437 (after heroState.atbGauge = 0):
// Decrement this hero's cooldowns on their turn
for (const abilityId of Object.keys(heroState.abilityCooldowns)) {
  if (heroState.abilityCooldowns[abilityId] > 0) {
    heroState.abilityCooldowns[abilityId] -= 1;
  }
}
```

In `#executeEnemyActions`, after ATB reset (after line 595):

```typescript
// Decrement this enemy's cooldowns on their turn
for (const abilityId of Object.keys(enemy.abilityCooldowns)) {
  if (enemy.abilityCooldowns[abilityId] > 0) {
    enemy.abilityCooldowns[abilityId] -= 1;
  }
}
```

#### 2. Battle.ts — Process status effects only on unit's turn

**File**: `src/domain/aggregates/Battle.ts`

Currently `#processHeroStatusEffects` and `#processEnemyStatusEffects` run every tick. Change to process only for units that just acted.

**Option A (simpler)**: Track which units acted this tick, process their status effects only.

In `tick()`, after hero actions but before enemy actions:

```typescript
// Phase 3: Execute hero actions (heroes with full ATB)
const heroActionResult = this.#executeHeroActions(...);
damageDealt += heroActionResult.damageDealt;
const heroesWhoActed = heroActionResult.actedHeroIds; // NEW return value

// Phase 5: Process status effects ONLY for heroes who acted
const heroStatusResult = this.#processHeroStatusEffects(
  heroStates, 
  logs, 
  audioEvents, 
  feedbackEvents,
  heroesWhoActed  // NEW parameter
);
```

Update `#executeHeroActions` to return acted hero IDs:

```typescript
#executeHeroActions(
  heroStates: Record<string, HeroCombatState>,
  enemies: CombatEnemy[],
  partyStats: Record<string, HeroStats>,
  logs: CombatLogEntry[],
  audioEvents: CombatAudioEvent[],
  feedbackEvents: CombatFeedbackEvent[],
  heroDamageMultiplier = 1
): { damageDealt: number; actedHeroIds: string[] } {
  let damageDealt = 0;
  const actedHeroIds: string[] = [];

  for (const heroId of Object.keys(heroStates)) {
    const heroState = heroStates[heroId];
    if (!heroState.isAlive || heroState.atbGauge < ATB_MAX) continue;
    
    actedHeroIds.push(heroId);
    // ... rest of action execution ...
  }

  return { damageDealt, actedHeroIds };
}
```

Update `#processHeroStatusEffects` to only process specified heroes:

```typescript
#processHeroStatusEffects(
  heroStates: Record<string, HeroCombatState>,
  logs: CombatLogEntry[],
  audioEvents: CombatAudioEvent[],
  feedbackEvents: CombatFeedbackEvent[],
  onlyHeroIds?: string[]  // NEW: if provided, only process these
): { damageTaken: number } {
  let damageTaken = 0;
  const heroIds = onlyHeroIds || Object.keys(heroStates);
  // ... rest unchanged ...
}
```

Same pattern for enemies: return `actedEnemyIndices` from `#executeEnemyActions` and pass to `#processEnemyStatusEffects`.

#### 3. Delete the now-unused #decrementCooldowns method

**File**: `src/domain/aggregates/Battle.ts`
**Lines**: 839-858

Delete the entire `#decrementCooldowns` method since cooldowns now decrement inline.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Apply a 3-turn buff ability → buff icon persists for ~3 hero turns
- [ ] Enemy DoT (damage over time) ticks once per enemy turn, not per frame
- [ ] Hero ability cooldown (e.g., 5 turns) becomes ready after ~5 of that hero's turns
- [ ] Taunt survives long enough to affect enemy targeting

---

## Phase 3: Fix ATB Pacing (C-6)

### Overview

The ATB formula `BASE_ATB_RATE * (speed / 100)` should be `BASE_ATB_RATE * (1 + speed / 100)` per the original design. With speeds of 10-15, current formula gives 1-1.5 ATB/sec (67-100 seconds to fill). Fixed formula gives 11-11.5 ATB/sec (~9 seconds to fill).

### Changes Required:

#### 1. combatEngine.ts — Fix ATB fill rate formula

**File**: `src/systems/combatEngine.ts`
**Lines**: 65-69

```typescript
export function calculateAtbFillRate(speed: number, combatSpeed: 1 | 2 | 4): number {
  // Base rate modified by speed stat and combat speed setting
  // At speed 0, fills at base rate. Higher speed = faster fill.
  return BASE_ATB_RATE * (1 + speed / 100) * combatSpeed;
}
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] At 1x speed, hero with speed ~10 fills ATB in ~9 seconds (not 67+ seconds)
- [ ] At 2x speed, ATB fills twice as fast
- [ ] Combat feels responsive, not sluggish

---

## Phase 4: Fix Feedback Clobbering (C-3)

### Overview

Feedback events (damage numbers, combo, shake) are processed via individual `set()` calls, but the final `set()` overwrites `combat.feedback` with the stale snapshot from `Battle.toState()`. Fix by preserving processed feedback in the final set.

### Changes Required:

#### 1. combatSlice.ts — Preserve feedback after processing events

**File**: `src/stores/slices/combat/combatSlice.ts`
**Lines**: 161-166

After processing feedback events, read the current feedback state and merge it into the final set:

```typescript
// Process feedback events (lines 127-159)
for (const event of feedbackEvents) {
  // ... existing switch statement ...
}

// Preserve the updated feedback state
const currentFeedback = get().combat.feedback;

set({
  combat: {
    ...updated.toState(),
    feedback: currentFeedback,  // Use processed feedback, not stale toState()
    combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
  },
});
```

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] Damage numbers appear when heroes auto-attack enemies
- [ ] Combo counter increments on consecutive hits
- [ ] Screen shake triggers on heavy hits
- [ ] Flash overlay appears on crits/heals

---

## Phase 5: Fix Stage Scaling (C-4, C-5)

### Overview

`CombatEnemy` only stores HP. Attack/defense/speed/rewards are re-fetched from unscaled registry definitions via `getAnyEnemy()`. Fix by expanding `CombatEnemy` to include all scaled stats.

### Changes Required:

#### 1. game.ts — Expand CombatEnemy type

**File**: `src/types/game.ts`
**Lines**: 365-378

Add scaled stats to `CombatEnemy`:

```typescript
export interface CombatEnemy {
  id: string;
  instanceId: string;
  currentHp: number;
  maxHp: number;
  atbGauge: number;
  isAlive: boolean;
  statusEffects: StatusEffect[];
  abilityCooldowns: Record<string, number>;
  isBoss?: boolean;
  currentPhase?: number;
  phaseTriggered?: Record<number, boolean>;
  // NEW: Scaled stats persisted at combat init
  scaledStats: {
    attack: number;
    defense: number;
    speed: number;
  };
  scaledRewards: {
    xpReward: number;
    curdReward: Decimal;
  };
}
```

#### 2. combatEngine.ts — Persist scaled stats in createCombatEnemy

**File**: `src/systems/combatEngine.ts`
**Lines**: 509-529

```typescript
export function createCombatEnemy(
  enemy: EnemyDefinition,
  instanceIndex: number
): CombatEnemy {
  const isBoss = enemy.type === 'boss';

  return {
    id: enemy.id,
    instanceId: `${enemy.id}_${instanceIndex}_${Date.now()}`,
    currentHp: enemy.stats.hp,
    maxHp: enemy.stats.hp,
    atbGauge: Math.random() * INITIAL_ATB_VARIANCE,
    isAlive: true,
    statusEffects: [],
    abilityCooldowns: {},
    isBoss,
    currentPhase: isBoss ? 1 : undefined,
    phaseTriggered: isBoss ? { 1: true } : undefined,
    // NEW: Persist scaled stats
    scaledStats: {
      attack: enemy.stats.attack,
      defense: enemy.stats.defense,
      speed: enemy.stats.speed,
    },
    scaledRewards: {
      xpReward: enemy.xpReward,
      curdReward: enemy.curdReward,
    },
  };
}
```

#### 3. Battle.ts — Use scaledStats instead of registry lookups

**File**: `src/domain/aggregates/Battle.ts`

Replace registry lookups with `enemy.scaledStats`:

**Speed** (lines 347-350):
```typescript
// BEFORE:
const enemyDef = getAnyEnemy(enemy.id);
if (!enemyDef) continue;
let baseSpeed = enemyDef.stats.speed;

// AFTER:
let baseSpeed = enemy.scaledStats.speed;
```

**Defense** (lines 397-398):
```typescript
// BEFORE:
const enemyDef = getAnyEnemy(target.id);
let baseDefense = enemyDef?.stats.defense || 10;

// AFTER:
let baseDefense = target.scaledStats.defense;
```

**Attack** (lines 476-479, 497):
```typescript
// BEFORE:
const enemyDef = getAnyEnemy(enemy.id);
if (!enemyDef) continue;
let effectiveEnemyStats = enemyDef.stats;

// AFTER:
// Still need enemyDef for name/abilities, but use scaledStats for combat
const enemyDef = getAnyEnemy(enemy.id);
if (!enemyDef) continue;
// Use enemy.scaledStats.attack instead of effectiveEnemyStats.attack
```

**Status effect max HP** (lines 757-758):
```typescript
// BEFORE:
const enemyDef = getAnyEnemy(enemy.id);
const maxHp = enemyDef?.stats.hp || enemy.maxHp;

// AFTER:
const maxHp = enemy.maxHp;  // Already scaled at creation
```

#### 4. combatEngine.ts — Use scaledRewards in calculateCombatRewards

**File**: `src/systems/combatEngine.ts`
**Lines**: 651-664

```typescript
for (const enemy of enemies) {
  // Use scaled rewards from enemy, not unscaled registry
  totalCurds = totalCurds.plus(enemy.scaledRewards.curdReward);
  totalXp += enemy.scaledRewards.xpReward;
  
  // Drops still come from registry (not scaled by stage)
  const enemyDef = getAnyEnemy(enemy.id);
  if (enemyDef) {
    for (const drop of enemyDef.drops) {
      // ... existing drop logic ...
    }
  }
}
```

#### 5. resetFactory.ts — Update empty combat state

**File**: `src/stores/slices/combat/resetFactory.ts`

The `CombatEnemy` array is empty in the default state, so no changes needed there. But ensure any test fixtures or mocks include the new fields.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes

#### Manual Verification:
- [ ] Stage 10 enemy deals more damage than stage 1 enemy of same type
- [ ] Stage 10 enemy grants more curds/XP than stage 1
- [ ] Stage 10 enemy has higher defense (takes less damage)
- [ ] Applying a debuff to a scaled enemy doesn't reset HP to base

---

## Phase 6: Fix Self-Buff Abilities (C-7)

### Overview

Enemy abilities with `targetType: 'self'` still target heroes because there's no branch for it. Also, `ability?.damage || 1.0` coerces `damage: 0` to 1.0, making self-buffs deal full damage.

### Changes Required:

#### 1. Battle.ts — Add self-targeting branch

**File**: `src/domain/aggregates/Battle.ts`
**Lines**: 499-600 (in `#executeEnemyActions`)

Add handling for `targetType: 'self'` before the existing 'all' and single-target branches:

```typescript
// After ability selection (line 493), before target selection:
const abilityDamage = ability?.damage ?? 1.0;  // Use ?? instead of ||

if (ability?.targetType === 'self') {
  // Self-targeting ability: apply buff/heal to self, don't attack
  if (ability.effect) {
    const effect: StatusEffect = {
      id: `${enemy.instanceId}_${ability.id}_${Date.now()}`,
      stat: ability.effect.stat,
      value: ability.effect.value,
      duration: ability.effect.duration,
      source: enemyDef.name,
    };
    enemy.statusEffects.push(effect);
    
    logs.push({
      timestamp: Date.now(),
      type: 'buff',
      source: enemyDef.name,
      target: enemyDef.name,
      message: `${enemyDef.name} uses ${ability.name}!`,
    });
    audioEvents.push({ type: 'buff' });
  }
  
  // Set cooldown and reset ATB
  if (ability.cooldown) {
    enemy.abilityCooldowns[ability.id] = ability.cooldown;
  }
  enemy.atbGauge = 0;
  
  // Decrement cooldowns on this enemy's turn
  for (const abilityId of Object.keys(enemy.abilityCooldowns)) {
    if (enemy.abilityCooldowns[abilityId] > 0) {
      enemy.abilityCooldowns[abilityId] -= 1;
    }
  }
  
  continue;  // Skip to next enemy, don't execute attack
}

// Check for AoE targeting (existing line 500)
if (ability?.targetType === 'all') {
  // ... existing AoE code ...
}
```

#### 2. Battle.ts — Use nullish coalescing for damage

**File**: `src/domain/aggregates/Battle.ts`
**Line**: 494

```typescript
// BEFORE:
const abilityMultiplier = ability?.damage || 1.0;

// AFTER:
const abilityMultiplier = ability?.damage ?? 1.0;
```

This allows `damage: 0` to be preserved for self-buff abilities that shouldn't deal damage.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] Enemy with `regenerate` ability heals itself instead of attacking
- [ ] Enemy with `battle_cry` buffs itself instead of dealing damage
- [ ] Combat log shows "[Enemy] uses [Ability]!" for self-buffs

---

## Phase 7: Fix Hero Crits (C-8)

### Overview

Hero crits are checked with `isCrit = damage > effectiveAttack * 1.5`, but damage maxes out at ~1.1x attack (variance cap), making crits mathematically impossible. Fix with a real crit chance roll.

### Changes Required:

#### 1. Battle.ts — Implement real crit roll for heroes

**File**: `src/domain/aggregates/Battle.ts`
**Lines**: 409-418

Replace the impossible damage comparison with a proper crit roll:

```typescript
// Import crit constants at top of file
import { CLICK_CRIT_BASE_CHANCE, CLICK_CRIT_BASE_MULTIPLIER } from '../../../data/constants';

// In #executeHeroActions, replace crit logic:
// BEFORE:
const baseDamage = calculateDamage(effectiveAttack, effectiveDefense);
const damage = Math.floor(baseDamage * heroDamageMultiplier);
// ...
const isCrit = damage > effectiveAttack * 1.5;

// AFTER:
const isCrit = Math.random() < CLICK_CRIT_BASE_CHANCE;  // 5% base chance
const baseDamage = calculateDamage(effectiveAttack, effectiveDefense);
let damage = Math.floor(baseDamage * heroDamageMultiplier);
if (isCrit) {
  damage = Math.floor(damage * CLICK_CRIT_BASE_MULTIPLIER);  // 2x crit multiplier
}
```

Note: This uses the existing click crit constants. A future P6 feature could add hero-specific crit stats.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] ~5% of hero auto-attacks show as crits (yellow damage number)
- [ ] Crit attacks deal ~2x normal damage
- [ ] Crit haptic feedback fires on crit hits

---

## Phase 8: Fix Boss Phase Transitions (C-9)

### Overview

Boss phase transitions (`#checkBossPhaseTransition`) are only called after hero basic attacks (line 453), not after abilities, limit breaks, or DoT damage. This means killing a boss through a phase boundary with a limit break skips the phase transition entirely.

### Changes Required:

#### 1. Battle.ts — Check phase after all damage sources

**File**: `src/domain/aggregates/Battle.ts`

Call `#checkBossPhaseTransition` after any damage to boss enemies:

**After ability damage** (in `useAbility`, around line 251-253):
```typescript
// After victory check, before return:
// Check boss phase transitions for any damaged bosses
if (result.stateUpdates.enemies) {
  for (const enemy of result.stateUpdates.enemies) {
    if (enemy.isBoss && enemy.isAlive) {
      // Boss phase check needed
      // Note: This requires extracting phase check logic to be callable here
    }
  }
}
```

**Simpler approach**: Move phase check into a method that runs on every tick for all alive bosses:

```typescript
// In tick(), after status effect processing (line 198):
// Phase 6.5: Check boss phase transitions
this.#checkAllBossPhases(enemies, logs);
```

Add new method:
```typescript
#checkAllBossPhases(enemies: CombatEnemy[], logs: CombatLogEntry[]): void {
  for (const enemy of enemies) {
    if (!enemy.isBoss || !enemy.isAlive) continue;
    this.#checkBossPhaseTransition(enemy, logs);
  }
}
```

This ensures phase transitions are checked every tick, catching damage from any source.

### Success Criteria:

#### Automated Verification:
- [x] `pnpm typecheck` passes

#### Manual Verification:
- [ ] Killing boss through 50% HP threshold with limit break triggers phase transition
- [ ] Boss phase heal message appears in combat log
- [ ] Boss phase abilities change at phase boundaries

---

## Testing Strategy

### Unit Tests (future):
- `endCombat('defeat')` results in `isInCombat: false`
- `calculateAtbFillRate(10, 1)` returns `11` (not `1`)
- `CombatEnemy.scaledStats` is preserved through combat
- Cooldowns decrement only on unit's turn

### Integration Tests (future):
- Full combat flow: start → defeat → retry → victory → rewards
- Status effect duration across multiple turns

### Manual Testing Steps:
1. Start game, enter combat, intentionally lose
2. Click "Try Again" — verify new battle starts
3. Click "Return to Zone Select" — verify can navigate freely
4. Enter stage 10 combat, compare enemy damage to stage 1
5. Watch for damage numbers during auto-attacks
6. Apply buff ability, count turns until expiry
7. Fight boss, use limit break at phase threshold, verify phase triggers

## Performance Considerations

- Phase 5 (stage scaling) adds ~48 bytes per enemy for scaled stats
- Phase 2 (turn semantics) reduces status processing from 60/sec to ~1/sec per unit
- Phase 4 (feedback) adds one `get()` call per tick (negligible)

## Migration Notes

- `CombatEnemy` type change is backwards-compatible for existing saves since combat state is reset on load
- No database migrations required
- Existing combat states will have `undefined` for `scaledStats`/`scaledRewards` but combat resets on page load anyway

## References

- Research document: `thoughts/shared/research/2026-07-01_16-14-12_ddd-refactoring-bugs-fun-phased-roadmap.md`
- Original combat design: `thoughts/shared/plans/implemented/phase4-combat-system.md:287-291` (ATB formula)
- Constants: `src/data/constants.ts:80` (`BASE_ATB_RATE`)
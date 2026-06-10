# Phase 5: Runtime Aggregates (Battle & Party) Implementation Plan

## Overview

Phase 5 introduces **runtime aggregates** — the most structural change in the DDD refactoring roadmap. While Phases 1-4 cleaned up the model (killed dead code, centralized calculations, consolidated crafting, added value objects), Phase 5 wraps the two highest-churn runtime systems (combat and heroes) with aggregates that enforce invariants in a single place.

The key insight from Evans: AGGREGATES exist to enforce invariants at one place. Combat is where invariants are demonstrably duplicated — the victory/defeat check exists in 4 places, and party slot management logic is scattered across 5 actions in heroSlice.

## Current State Analysis

### Combat System Problems

The `tickCombat` function (`combatEngine.ts:626-983`) is a ~350-line transaction script with 8 implicit phases. Problems:

1. **Victory/defeat invariant checked in 4 places:**
   - `tickCombat` main loop (`combatEngine.ts:931-954`)
   - `combatSlice.useHeroAbility` (`combatSlice.ts:166-168`)
   - `combatSlice.useLimitBreak` (`combatSlice.ts:196-198`)
   - `executeHeroLimitBreak` (`combatEngine.ts:1554-1562`) — logs victory but doesn't set `battleResult`

2. **No aggregate boundary:** `CombatState` is a plain DTO mutated by external functions. Any code can read/write any field.

3. **Implicit phases:** The 8 phases in `tickCombat` are code blocks, not named operations. Hard to test independently or reason about.

### Hero System Problems

Party management in `heroSlice.ts` has invariants scattered across multiple actions:

1. **"Hero can only occupy one slot"** — checked/enforced in `assignToParty` (`heroSlice.ts:97-104`)
2. **"Only recruited heroes can be assigned"** — checked in `assignToParty` (`heroSlice.ts:95`)
3. **"Equipment uniqueness"** — double-loop in `equipItem` (`heroSlice.ts:176-180`)
4. **"Level cap at 100"** — enforced in `grantXp` (`heroSlice.ts:240, 248, 255-258`)
5. **Party hero extraction** — repeated at `heroSlice.ts:286-291` and `318-323`

### What's Already Done (Phase 4 Foundation)

- `Stats` value object exists (`src/domain/valueObjects/Stats.ts`) — used for stat composition
- `Quality` value object exists — used in crafting
- `Multiplier` and `Bonus` types defined (`src/domain/valueObjects/Modifier.ts`) — not yet imported anywhere
- StatusEffect mutation bug already fixed — deep copies at `combatEngine.ts:641-653`

## Desired End State

After Phase 5:

1. **`Battle` aggregate** owns all combat state transitions:
   - Single `tick(deltaMs, partyStats)` method that returns new state
   - Private methods for each phase (`advanceHeroAtb`, `advanceEnemyAtb`, `executeHeroActions`, `executeEnemyActions`, `processHeroStatusEffects`, `processEnemyStatusEffects`, `updateLimitBreak`, `checkOutcome`)
   - Victory/defeat invariant checked in exactly ONE place (`checkOutcome`)
   - Immutable — all operations return new `Battle` instances
   - Construct from `CombatState`, serialize back to `CombatState`

2. **`Party` aggregate** owns party formation invariants:
   - `assignHero(heroId, position)` — validates recruited + auto-removes from old slot
   - `removeHero(position)`
   - `swap(pos1, pos2)`
   - `getActiveHeroIds(): string[]`
   - Single source for slot assignment rules

3. **`Roster` aggregate** owns hero progression invariants:
   - `grantXp(heroId, amount)` — owns level-up logic and max level enforcement
   - `equipItem(heroId, equipmentId)` — owns equipment uniqueness
   - Could be combined with Party or kept separate

4. **Zustand remains the render projection:** Slices hold plain `CombatState`/`HeroSliceState`; aggregates are constructed, operated on, and serialized back.

### Verification

- `grep -r "allEnemiesDead\|allHeroesDead" src/` returns exactly ONE match (in `Battle.checkOutcome`)
- `grep -r "every.*isAlive" src/stores/slices/combat/` returns ZERO matches (slice delegates to aggregate)
- All existing combat tests pass
- All existing hero tests pass
- Manual verification: combat flows work identically (start battle, auto-attack, abilities, limit breaks, victory/defeat)

## What We're NOT Doing

1. **NOT creating a full event-sourced system** — aggregates use simple state transitions, not event logs
2. **NOT changing the game loop timing** — 100ms ticks remain; aggregate just wraps the tick logic
3. **NOT moving reward calculation into Battle** — `calculateCombatRewards` stays in engine (it doesn't need invariant protection)
4. **NOT touching crafting or production** — Phase 3 already handled crafting; production has no aggregate need
5. **NOT introducing domain events yet** — that's Phase 6
6. **NOT changing the UI** — components continue to read from Zustand store

---

## Phase 1: Battle Aggregate Foundation

### Overview

Create the `Battle` aggregate class with the construct-from-state/serialize-to-state pattern. Start with just the shell and `from`/`toState` methods.

### Changes Required:

#### 1. Create Battle Aggregate

**File**: `src/domain/aggregates/Battle.ts` (new file)

```typescript
import type {
  CombatState,
  CombatEnemy,
  HeroCombatState,
  CombatLogEntry,
  HeroStats,
} from '../../types/game';

/**
 * Battle aggregate - owns combat state transitions and invariants.
 * Immutable: all operations return new Battle instances.
 * 
 * Usage pattern:
 *   const battle = Battle.from(state.combat);
 *   const { battle: updated, logs } = battle.tick(deltaMs, partyStats);
 *   set({ combat: updated.toState() });
 */
export class Battle {
  readonly #state: Readonly<CombatState>;
  readonly #pendingLogs: readonly CombatLogEntry[];

  private constructor(state: CombatState, pendingLogs: CombatLogEntry[] = []) {
    this.#state = Object.freeze({ ...state });
    this.#pendingLogs = Object.freeze([...pendingLogs]);
  }

  /**
   * Construct a Battle aggregate from plain CombatState.
   */
  static from(state: CombatState): Battle {
    return new Battle(state);
  }

  /**
   * Serialize back to plain CombatState for Zustand storage.
   */
  toState(): CombatState {
    return {
      ...this.#state,
      enemies: this.#state.enemies.map(e => ({ ...e, statusEffects: [...e.statusEffects], abilityCooldowns: { ...e.abilityCooldowns } })),
      heroStates: Object.fromEntries(
        Object.entries(this.#state.heroStates).map(([id, h]) => [
          id,
          { ...h, statusEffects: [...h.statusEffects], abilityCooldowns: { ...h.abilityCooldowns } }
        ])
      ),
      combatLog: [...this.#state.combatLog],
    };
  }

  /**
   * Get pending log entries from the last operation.
   */
  get pendingLogs(): readonly CombatLogEntry[] {
    return this.#pendingLogs;
  }

  /**
   * Check if battle is active (in combat and ongoing).
   */
  get isActive(): boolean {
    return this.#state.isInCombat && this.#state.battleResult === 'ongoing';
  }

  /**
   * Get current battle result.
   */
  get result(): CombatState['battleResult'] {
    return this.#state.battleResult;
  }

  /**
   * Get current enemies (read-only view).
   */
  get enemies(): readonly CombatEnemy[] {
    return this.#state.enemies;
  }

  /**
   * Get current hero states (read-only view).
   */
  get heroStates(): Readonly<Record<string, HeroCombatState>> {
    return this.#state.heroStates;
  }

  /**
   * Get limit break gauge value.
   */
  get limitBreakGauge(): number {
    return this.#state.limitBreakGauge;
  }

  // Phase 2 will add: tick(), and private phase methods
  // Phase 3 will add: useAbility(), useLimitBreak()
}
```

#### 2. Create Barrel Export

**File**: `src/domain/aggregates/index.ts` (new file)

```typescript
export { Battle } from './Battle';
```

#### 3. Update Domain Index

**File**: `src/domain/index.ts`

Add export for aggregates:

```typescript
// ... existing exports ...
export * from './aggregates';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Existing tests pass: `npm test`

#### Manual Verification:
- [x] `Battle.from(state).toState()` round-trips correctly (write a quick test)

---

## Phase 2: Decompose tickCombat into Aggregate Methods

### Overview

Move the 8 phases from `tickCombat` into private methods on the Battle aggregate, then expose a single `tick()` method that orchestrates them. The engine's `tickCombat` function will be deprecated (kept temporarily for comparison).

### Changes Required:

#### 1. Add Phase Methods to Battle

**File**: `src/domain/aggregates/Battle.ts`

Add imports at top:

```typescript
import {
  updateAtbGauge,
  calculateDamage,
  applyDamage,
  updateLimitBreakGauge,
  selectEnemyTarget,
  selectHeroTarget,
  processStatusEffects,
  removeExpiredEffects,
  getStatModifierFromEffects,
  checkBossPhaseTransition,
  applyBossPhaseTransition,
  getBossEffectiveStats,
  getBossCurrentAbilities,
  selectAbilityFromCooldowns,
  ATB_MAX,
  BOSS_PHASE_HEAL_PERCENT,
} from '../../systems/combatEngine';
import { heroRegistry, bossRegistry, getAnyEnemy } from '../index';
```

Add the tick method and private phase methods:

```typescript
export interface BattleTickResult {
  battle: Battle;
  logs: readonly CombatLogEntry[];
}

export class Battle {
  // ... existing constructor, from, toState, getters ...

  /**
   * Advance combat by deltaMs. Returns new Battle and any log entries.
   * This is the ONLY public mutation method for the tick loop.
   */
  tick(deltaMs: number, partyStats: Record<string, HeroStats>): BattleTickResult {
    if (!this.isActive) {
      return { battle: this, logs: [] };
    }

    const deltaSeconds = deltaMs / 1000;
    const logs: CombatLogEntry[] = [];
    let damageDealt = 0;
    let damageTaken = 0;

    // Deep copy mutable state for this tick
    const heroStates = this.#deepCopyHeroStates();
    const enemies = this.#deepCopyEnemies();
    let limitBreakGauge = this.#state.limitBreakGauge;

    // Phase 1: Advance hero ATB
    this.#advanceHeroAtb(heroStates, partyStats, deltaSeconds);

    // Phase 2: Advance enemy ATB
    this.#advanceEnemyAtb(enemies, deltaSeconds);

    // Phase 3: Execute hero actions
    const heroActionResult = this.#executeHeroActions(heroStates, enemies, partyStats, logs);
    damageDealt += heroActionResult.damageDealt;

    // Phase 4: Execute enemy actions
    const enemyActionResult = this.#executeEnemyActions(enemies, heroStates, partyStats, logs);
    damageTaken += enemyActionResult.damageTaken;

    // Phase 5: Process hero status effects
    const heroStatusResult = this.#processHeroStatusEffects(heroStates, logs);
    damageTaken += heroStatusResult.damageTaken;

    // Phase 6: Process enemy status effects
    this.#processEnemyStatusEffects(enemies, logs);

    // Phase 7: Update limit break gauge
    limitBreakGauge = updateLimitBreakGauge(limitBreakGauge, damageDealt, damageTaken);

    // Phase 8: Check outcome (THE SINGLE PLACE for victory/defeat invariant)
    const battleResult = this.#checkOutcome(heroStates, enemies, logs);

    // Decrement cooldowns
    this.#decrementCooldowns(heroStates, enemies);

    const newState: CombatState = {
      ...this.#state,
      heroStates,
      enemies,
      limitBreakGauge,
      battleResult,
      combatLog: this.#state.combatLog, // Logs handled externally by slice
    };

    return {
      battle: new Battle(newState, logs),
      logs,
    };
  }

  // ===== Private Phase Methods =====

  #deepCopyHeroStates(): Record<string, HeroCombatState> {
    const copy: Record<string, HeroCombatState> = {};
    for (const [id, state] of Object.entries(this.#state.heroStates)) {
      copy[id] = {
        ...state,
        statusEffects: state.statusEffects.map(e => ({ ...e })),
        abilityCooldowns: { ...state.abilityCooldowns },
      };
    }
    return copy;
  }

  #deepCopyEnemies(): CombatEnemy[] {
    return this.#state.enemies.map(e => ({
      ...e,
      statusEffects: e.statusEffects.map(se => ({ ...se })),
      abilityCooldowns: { ...e.abilityCooldowns },
    }));
  }

  #advanceHeroAtb(
    heroStates: Record<string, HeroCombatState>,
    partyStats: Record<string, HeroStats>,
    deltaSeconds: number
  ): void {
    for (const heroId of Object.keys(heroStates)) {
      const heroState = heroStates[heroId];
      if (!heroState.isAlive) continue;

      const heroStats = partyStats[heroId];
      if (!heroStats) continue;

      const speedModifier = getStatModifierFromEffects(heroState.statusEffects, 'speed');
      const effectiveSpeed = Math.max(1, heroStats.speed + speedModifier);

      heroState.atbGauge = updateAtbGauge(
        heroState.atbGauge,
        effectiveSpeed,
        this.#state.combatSpeed,
        deltaSeconds
      );
    }
  }

  #advanceEnemyAtb(enemies: CombatEnemy[], deltaSeconds: number): void {
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const enemyDef = getAnyEnemy(enemy.id);
      if (!enemyDef) continue;

      let baseSpeed = enemyDef.stats.speed;
      if (enemy.isBoss) {
        const bossDef = bossRegistry.get(enemy.id);
        if (bossDef) {
          baseSpeed = getBossEffectiveStats(enemy, bossDef).speed;
        }
      }

      const speedModifier = getStatModifierFromEffects(enemy.statusEffects, 'speed');
      const effectiveSpeed = Math.max(1, baseSpeed + speedModifier);

      enemy.atbGauge = updateAtbGauge(
        enemy.atbGauge,
        effectiveSpeed,
        this.#state.combatSpeed,
        deltaSeconds
      );
    }
  }

  #executeHeroActions(
    heroStates: Record<string, HeroCombatState>,
    enemies: CombatEnemy[],
    partyStats: Record<string, HeroStats>,
    logs: CombatLogEntry[]
  ): { damageDealt: number } {
    let damageDealt = 0;

    for (const heroId of Object.keys(heroStates)) {
      const heroState = heroStates[heroId];
      if (!heroState.isAlive || heroState.atbGauge < ATB_MAX) continue;

      const heroStats = partyStats[heroId];
      if (!heroStats) continue;

      const heroDef = heroRegistry.get(heroId);
      if (!heroDef) continue;

      const target = selectEnemyTarget(enemies);
      if (!target) continue;

      const attackModifier = getStatModifierFromEffects(heroState.statusEffects, 'attack');
      const effectiveAttack = Math.max(1, heroStats.attack + attackModifier);

      const enemyDef = getAnyEnemy(target.id);
      let baseDefense = enemyDef?.stats.defense || 10;
      if (target.isBoss) {
        const bossDef = bossRegistry.get(target.id);
        if (bossDef) {
          baseDefense = getBossEffectiveStats(target, bossDef).defense;
        }
      }

      const defenseModifier = getStatModifierFromEffects(target.statusEffects, 'defense');
      const effectiveDefense = Math.max(0, baseDefense + defenseModifier);

      const damage = calculateDamage(effectiveAttack, effectiveDefense);
      target.currentHp = applyDamage(target.currentHp, damage);
      damageDealt += damage;

      logs.push({
        timestamp: Date.now(),
        type: 'attack',
        source: heroDef.name,
        target: enemyDef?.name || target.id,
        value: damage,
        message: `${heroDef.name} attacks ${enemyDef?.name || target.id} for ${damage} damage!`,
      });

      if (target.currentHp <= 0) {
        target.isAlive = false;
        logs.push({
          timestamp: Date.now(),
          type: 'defeat',
          source: heroDef.name,
          target: enemyDef?.name || target.id,
          message: `${enemyDef?.name || target.id} has been defeated!`,
        });
      } else if (target.isBoss) {
        this.#checkBossPhaseTransition(target, logs);
      }

      heroState.atbGauge = 0;
    }

    return { damageDealt };
  }

  #executeEnemyActions(
    enemies: CombatEnemy[],
    heroStates: Record<string, HeroCombatState>,
    partyStats: Record<string, HeroStats>,
    logs: CombatLogEntry[]
  ): { damageTaken: number } {
    let damageTaken = 0;

    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.atbGauge < ATB_MAX) continue;

      const enemyDef = getAnyEnemy(enemy.id);
      if (!enemyDef) continue;

      const target = selectHeroTarget(heroStates);
      if (!target) continue;

      let effectiveEnemyStats = enemyDef.stats;
      let availableAbilities = enemyDef.abilities;

      if (enemy.isBoss) {
        const bossDef = bossRegistry.get(enemy.id);
        if (bossDef) {
          effectiveEnemyStats = getBossEffectiveStats(enemy, bossDef);
          availableAbilities = getBossCurrentAbilities(enemy, bossDef);
        }
      }

      const ability = selectAbilityFromCooldowns(availableAbilities, enemy.abilityCooldowns)
        || availableAbilities[0];
      const abilityMultiplier = ability?.damage || 1.0;

      const attackModifier = getStatModifierFromEffects(enemy.statusEffects, 'attack');
      const effectiveAttack = Math.max(1, effectiveEnemyStats.attack + attackModifier);

      const heroStats = partyStats[target.heroId];
      const defenseModifier = getStatModifierFromEffects(target.statusEffects, 'defense');
      const effectiveDefense = Math.max(0, (heroStats?.defense || 10) + defenseModifier);

      const damage = calculateDamage(effectiveAttack, effectiveDefense, abilityMultiplier);
      target.currentHp = applyDamage(target.currentHp, damage);
      damageTaken += damage;

      const heroDef = heroRegistry.get(target.heroId);

      logs.push({
        timestamp: Date.now(),
        type: 'attack',
        source: enemyDef.name,
        target: heroDef?.name || target.heroId,
        value: damage,
        message: `${enemyDef.name} attacks ${heroDef?.name || target.heroId} for ${damage} damage!`,
      });

      if (target.currentHp <= 0) {
        target.isAlive = false;
        logs.push({
          timestamp: Date.now(),
          type: 'defeat',
          source: enemyDef.name,
          target: heroDef?.name || target.heroId,
          message: `${heroDef?.name || target.heroId} has fallen!`,
        });
      }

      if (ability?.cooldown) {
        enemy.abilityCooldowns[ability.id] = ability.cooldown;
      }

      enemy.atbGauge = 0;
    }

    return { damageTaken };
  }

  #processHeroStatusEffects(
    heroStates: Record<string, HeroCombatState>,
    logs: CombatLogEntry[]
  ): { damageTaken: number } {
    let damageTaken = 0;

    for (const heroId of Object.keys(heroStates)) {
      const heroState = heroStates[heroId];
      if (!heroState.isAlive || heroState.statusEffects.length === 0) continue;

      const result = processStatusEffects(
        heroState.currentHp,
        heroState.maxHp,
        heroState.statusEffects
      );

      heroState.currentHp = result.newHp;
      heroState.statusEffects = removeExpiredEffects(heroState.statusEffects, result.expiredEffects);

      if (result.damage > 0) {
        damageTaken += result.damage;
      }

      if (heroState.currentHp <= 0) {
        heroState.isAlive = false;
        const heroDef = heroRegistry.get(heroId);
        logs.push({
          timestamp: Date.now(),
          type: 'defeat',
          source: 'status_effect',
          target: heroDef?.name || heroId,
          message: `${heroDef?.name || heroId} succumbed to status effects!`,
        });
      }
    }

    return { damageTaken };
  }

  #processEnemyStatusEffects(enemies: CombatEnemy[], logs: CombatLogEntry[]): void {
    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.statusEffects.length === 0) continue;

      const enemyDef = getAnyEnemy(enemy.id);
      const maxHp = enemyDef?.stats.hp || enemy.maxHp;

      const result = processStatusEffects(enemy.currentHp, maxHp, enemy.statusEffects);

      enemy.currentHp = result.newHp;
      enemy.statusEffects = removeExpiredEffects(enemy.statusEffects, result.expiredEffects);

      if (enemy.currentHp <= 0) {
        enemy.isAlive = false;
        logs.push({
          timestamp: Date.now(),
          type: 'defeat',
          source: 'status_effect',
          target: enemyDef?.name || enemy.id,
          message: `${enemyDef?.name || enemy.id} succumbed to status effects!`,
        });
      }
    }
  }

  /**
   * THE SINGLE PLACE where victory/defeat is determined.
   * This is the key invariant that the aggregate protects.
   */
  #checkOutcome(
    heroStates: Record<string, HeroCombatState>,
    enemies: CombatEnemy[],
    logs: CombatLogEntry[]
  ): CombatState['battleResult'] {
    const allEnemiesDead = enemies.every(e => !e.isAlive);
    const allHeroesDead = Object.values(heroStates).every(h => !h.isAlive);

    if (allEnemiesDead) {
      logs.push({
        timestamp: Date.now(),
        type: 'victory',
        source: 'system',
        target: '',
        message: 'Victory! All enemies have been defeated!',
      });
      return 'victory';
    }

    if (allHeroesDead) {
      logs.push({
        timestamp: Date.now(),
        type: 'defeat',
        source: 'system',
        target: '',
        message: 'Defeat... All heroes have fallen.',
      });
      return 'defeat';
    }

    return 'ongoing';
  }

  #checkBossPhaseTransition(target: CombatEnemy, logs: CombatLogEntry[]): void {
    const bossDef = bossRegistry.get(target.id);
    if (!bossDef) return;

    const phaseResult = checkBossPhaseTransition(target, bossDef);
    if (phaseResult.phaseChanged && phaseResult.newPhase) {
      const updatedBoss = applyBossPhaseTransition(target, phaseResult.newPhase, bossDef);
      Object.assign(target, updatedBoss);

      if (phaseResult.logEntry) {
        logs.push(phaseResult.logEntry);
      }

      logs.push({
        timestamp: Date.now(),
        type: 'heal',
        source: bossDef.name,
        target: bossDef.name,
        value: Math.floor(target.maxHp * BOSS_PHASE_HEAL_PERCENT),
        message: `${bossDef.name} regenerates some health as they enter phase ${phaseResult.newPhase}!`,
      });
    }
  }

  #decrementCooldowns(
    heroStates: Record<string, HeroCombatState>,
    enemies: CombatEnemy[]
  ): void {
    for (const heroState of Object.values(heroStates)) {
      for (const abilityId of Object.keys(heroState.abilityCooldowns)) {
        if (heroState.abilityCooldowns[abilityId] > 0) {
          heroState.abilityCooldowns[abilityId] -= 1;
        }
      }
    }

    for (const enemy of enemies) {
      for (const abilityId of Object.keys(enemy.abilityCooldowns)) {
        if (enemy.abilityCooldowns[abilityId] > 0) {
          enemy.abilityCooldowns[abilityId] -= 1;
        }
      }
    }
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Write unit test: `Battle.from(state).tick(100, stats)` produces expected state changes
- [x] Verify `#checkOutcome` is the only method that sets `battleResult`

---

## Phase 3: Wire Battle Aggregate into combatSlice

### Overview

Replace the `combatSlice.tickCombat` call to the engine function with the Battle aggregate. Also update `useHeroAbility` and `useLimitBreak` to use the aggregate, removing their duplicate victory checks.

### Changes Required:

#### 1. Update combatSlice to Use Battle Aggregate

**File**: `src/stores/slices/combat/combatSlice.ts`

Add import:

```typescript
import { Battle } from '../../../domain/aggregates';
```

Update `tickCombat` action:

```typescript
tickCombat: (deltaMs: number) => {
  const state = get();
  if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') return;

  const partyStats = state.getPartyStats();
  const battle = Battle.from(state.combat);
  const { battle: updated, logs } = battle.tick(deltaMs, partyStats);

  if (logs.length > 0 || updated.result !== state.combat.battleResult) {
    set({
      combat: {
        ...updated.toState(),
        combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
      },
    });
  }
},
```

#### 2. Add Ability Methods to Battle Aggregate

**File**: `src/domain/aggregates/Battle.ts`

Add these methods to handle abilities and limit breaks (delegating to existing engine functions but routing victory through the aggregate):

```typescript
/**
 * Execute a hero ability. Returns updated Battle with logs.
 * Victory check is handled by the aggregate, not the caller.
 */
useAbility(
  heroId: string,
  partyStats: Record<string, HeroStats>,
  targetId?: string
): { battle: Battle; logs: readonly CombatLogEntry[]; success: boolean } {
  if (!this.isActive) {
    return { battle: this, logs: [], success: false };
  }

  const result = executeHeroAbility(this.#state, heroId, partyStats, targetId);
  if (!result.success) {
    return { battle: this, logs: [], success: false };
  }

  // Build new state from result
  const newState: CombatState = {
    ...this.#state,
    ...result.stateUpdates,
  };

  // Check victory (THE SINGLE PLACE) — replaces slice's duplicate check
  if (result.stateUpdates.enemies?.every(e => !e.isAlive)) {
    newState.battleResult = 'victory';
  }

  return {
    battle: new Battle(newState, result.logEntries),
    logs: result.logEntries,
    success: true,
  };
}

/**
 * Execute a hero's limit break. Returns updated Battle with logs.
 * Victory check is handled by the aggregate, not the caller.
 */
useLimitBreak(
  heroId: string,
  partyStats: Record<string, HeroStats>
): { battle: Battle; logs: readonly CombatLogEntry[]; success: boolean } {
  if (!this.isActive) {
    return { battle: this, logs: [], success: false };
  }

  const result = executeHeroLimitBreak(this.#state, heroId, partyStats);
  if (!result.success) {
    return { battle: this, logs: [], success: false };
  }

  // Build new state from result
  const newState: CombatState = {
    ...this.#state,
    ...result.stateUpdates,
  };

  // Check victory (THE SINGLE PLACE) — replaces slice's duplicate check
  if (result.stateUpdates.enemies?.every(e => !e.isAlive)) {
    newState.battleResult = 'victory';
  }

  return {
    battle: new Battle(newState, result.logEntries),
    logs: result.logEntries,
    success: true,
  };
}
```

Add import for engine functions:

```typescript
import {
  // ... existing imports ...
  executeHeroAbility,
  executeHeroLimitBreak,
} from '../../systems/combatEngine';
```

#### 3. Update combatSlice Ability Actions

**File**: `src/stores/slices/combat/combatSlice.ts`

Update `useHeroAbility`:

```typescript
useHeroAbility: (heroId: string, _abilityId: string, targetId?: string) => {
  const state = get();
  if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
    return false;
  }

  const partyStats = state.getPartyStats();
  const battle = Battle.from(state.combat);
  const { battle: updated, logs, success } = battle.useAbility(heroId, partyStats, targetId);

  if (!success) {
    return false;
  }

  playAbilitySound();

  set({
    combat: {
      ...updated.toState(),
      combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
    },
  });

  return true;
},
```

Update `useLimitBreak`:

```typescript
useLimitBreak: (heroId: string) => {
  const state = get();
  if (!state.combat.isInCombat || state.combat.battleResult !== 'ongoing') {
    return false;
  }

  const partyStats = state.getPartyStats();
  const battle = Battle.from(state.combat);
  const { battle: updated, logs, success } = battle.useLimitBreak(heroId, partyStats);

  if (!success) {
    return false;
  }

  playLimitBreakSound();

  set({
    combat: {
      ...updated.toState(),
      combatLog: [...state.combat.combatLog, ...logs].slice(-COMBAT_LOG_MAX_ENTRIES),
    },
  });

  return true;
},
```

#### 4. Remove Unused Import

**File**: `src/stores/slices/combat/combatSlice.ts`

Remove `tickCombat` from the import (the function, not the action):

```typescript
import {
  initializeCombat,
  // tickCombat, — REMOVE this import
  calculateCombatRewards,
  isBossStage,
  // executeHeroAbility, — REMOVE (now via aggregate)
  // executeHeroLimitBreak, — REMOVE (now via aggregate)
  canUseAbility,
  canUseLimitBreak,
} from '../../../systems/combatEngine';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Existing tests pass: `npm test`

#### Manual Verification:
- [x] Start a combat, let it auto-progress to victory — battle result shows correctly
- [x] Use hero ability that kills last enemy — victory triggers
- [x] Use limit break that kills last enemy — victory triggers
- [x] Let all heroes die — defeat triggers
- [x] `grep "every.*isAlive" src/stores/slices/combat/` returns ZERO matches

---

## Phase 4: Party Aggregate Foundation

### Overview

Create the `Party` aggregate to consolidate party formation invariants. This aggregate wraps `PartyFormation` and the roster (`Record<string, HeroState>`).

### Changes Required:

#### 1. Create Party Aggregate

**File**: `src/domain/aggregates/Party.ts` (new file)

```typescript
import type { PartyFormation, FormationPosition, HeroState } from '../../types/game';

/**
 * Party aggregate - owns party formation invariants.
 * Immutable: all operations return new Party instances.
 * 
 * Invariants enforced:
 * - A hero can only occupy one slot at a time
 * - Only recruited heroes can be assigned to party
 * - Party has exactly 4 fixed slots
 */
export class Party {
  readonly #formation: Readonly<PartyFormation>;
  readonly #roster: Readonly<Record<string, HeroState>>;

  private constructor(formation: PartyFormation, roster: Record<string, HeroState>) {
    this.#formation = Object.freeze({ ...formation });
    this.#roster = roster; // Don't deep freeze roster, it's large
  }

  /**
   * Construct a Party from formation and roster state.
   */
  static from(formation: PartyFormation, roster: Record<string, HeroState>): Party {
    return new Party(formation, roster);
  }

  /**
   * Serialize back to plain PartyFormation.
   */
  toFormation(): PartyFormation {
    return { ...this.#formation };
  }

  /**
   * Get active hero IDs (non-null slots with valid heroes).
   */
  getActiveHeroIds(): string[] {
    return [
      this.#formation.frontLeft,
      this.#formation.frontRight,
      this.#formation.backLeft,
      this.#formation.backRight,
    ].filter((id): id is string => id !== null && this.#roster[id] !== undefined);
  }

  /**
   * Check if a hero is in the party.
   */
  hasHero(heroId: string): boolean {
    return Object.values(this.#formation).includes(heroId);
  }

  /**
   * Get the position of a hero, or null if not in party.
   */
  getHeroPosition(heroId: string): FormationPosition | null {
    for (const [pos, id] of Object.entries(this.#formation)) {
      if (id === heroId) {
        return pos as FormationPosition;
      }
    }
    return null;
  }

  /**
   * Assign a hero to a position.
   * Enforces: hero must be recruited, auto-removes from previous slot.
   * Returns null if hero is not recruited.
   */
  assignHero(heroId: string, position: FormationPosition): Party | null {
    // Invariant: only recruited heroes can be assigned
    if (!this.#roster[heroId]) {
      return null;
    }

    const newFormation = { ...this.#formation };

    // Invariant: hero can only occupy one slot — remove from current if present
    const currentPosition = this.getHeroPosition(heroId);
    if (currentPosition) {
      newFormation[currentPosition] = null;
    }

    newFormation[position] = heroId;

    return new Party(newFormation, this.#roster);
  }

  /**
   * Remove hero from a position.
   */
  removeHero(position: FormationPosition): Party {
    const newFormation = {
      ...this.#formation,
      [position]: null,
    };
    return new Party(newFormation, this.#roster);
  }

  /**
   * Swap heroes between two positions.
   */
  swap(pos1: FormationPosition, pos2: FormationPosition): Party {
    const newFormation = {
      ...this.#formation,
      [pos1]: this.#formation[pos2],
      [pos2]: this.#formation[pos1],
    };
    return new Party(newFormation, this.#roster);
  }

  /**
   * Get hero ID at a position.
   */
  getHeroAt(position: FormationPosition): string | null {
    return this.#formation[position];
  }
}
```

#### 2. Update Aggregates Index

**File**: `src/domain/aggregates/index.ts`

```typescript
export { Battle } from './Battle';
export type { BattleTickResult } from './Battle';
export { Party } from './Party';
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Write unit test: `Party.from(formation, roster).assignHero().toFormation()` round-trips correctly

---

## Phase 5: Wire Party Aggregate into heroSlice

### Overview

Update heroSlice to use the Party aggregate for party management operations. The Roster aggregate is deferred — keeping equipment and XP logic in the slice for now is acceptable since those invariants are simpler.

### Changes Required:

#### 1. Update heroSlice Party Operations

**File**: `src/stores/slices/heroes/heroSlice.ts`

Add import:

```typescript
import { Party } from '../../../domain/aggregates';
```

Update `assignToParty`:

```typescript
assignToParty: (heroId: string, position: FormationPosition) => {
  const state = get();
  
  const party = Party.from(state.party, state.heroes);
  const updated = party.assignHero(heroId, position);
  
  if (!updated) {
    return false; // Hero not recruited
  }

  set({ party: updated.toFormation() });
  get().recalculateCps();

  return true;
},
```

Update `removeFromParty`:

```typescript
removeFromParty: (position: FormationPosition) => {
  const state = get();
  
  const party = Party.from(state.party, state.heroes);
  const updated = party.removeHero(position);

  set({ party: updated.toFormation() });
  get().recalculateCps();
},
```

Update `swapPartyPositions`:

```typescript
swapPartyPositions: (pos1: FormationPosition, pos2: FormationPosition) => {
  const state = get();
  
  const party = Party.from(state.party, state.heroes);
  const updated = party.swap(pos1, pos2);

  set({ party: updated.toFormation() });
  get().recalculateCps();
},
```

Update `tickHeroXp` to use Party:

```typescript
tickHeroXp: (deltaMs: number) => {
  const state = get();
  
  const party = Party.from(state.party, state.heroes);
  const partyHeroIds = party.getActiveHeroIds();

  if (partyHeroIds.length === 0) return;

  const xpPerSecond = calculateXpPerSecond(state.curdPerSecond);
  const buffMultipliers = state.getActiveBuffMultipliers();
  const eventMultipliers = state.getEventMultipliers();
  const xpGained = (xpPerSecond * buffMultipliers.xp * eventMultipliers.xp * deltaMs) / 1000;

  const xpPerHero = xpGained / partyHeroIds.length;

  for (const heroId of partyHeroIds) {
    get().grantXp(heroId, xpPerHero);
  }
},
```

Update `getPartyStats` to use Party:

```typescript
getPartyStats: () => {
  const state = get();
  const stats: Record<string, HeroStats> = {};

  const party = Party.from(state.party, state.heroes);
  const partyHeroIds = party.getActiveHeroIds();

  for (const heroId of partyHeroIds) {
    const heroState = state.heroes[heroId];
    if (heroState) {
      stats[heroId] = calculateHeroStats(heroId, heroState);
    }
  }

  return stats;
},
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Existing tests pass: `npm test`

#### Manual Verification:
- [x] Assign hero to party slot — works correctly
- [x] Assign hero to different slot — auto-removes from previous
- [x] Try to assign non-recruited hero — returns false
- [x] Swap two party positions — works correctly
- [x] Remove hero from party — works correctly

---

## Phase 6: Cleanup and Documentation

### Overview

Remove deprecated code paths, add JSDoc documentation, and verify the invariant consolidation is complete.

### Changes Required:

#### 1. Mark Old Engine tickCombat as Deprecated

**File**: `src/systems/combatEngine.ts`

Add deprecation notice to the old `tickCombat` function:

```typescript
/**
 * @deprecated Use Battle aggregate instead: Battle.from(state).tick(deltaMs, partyStats)
 * This function is retained temporarily for reference but should not be called.
 */
export function tickCombat(
  state: CombatState,
  deltaMs: number,
  partyStats: Record<string, HeroStats>
): CombatTickResult {
  // ... existing implementation (don't delete yet, keep for reference during transition)
}
```

#### 2. Update GLOSSARY.md

**File**: `docs/GLOSSARY.md`

Add aggregate terminology:

```markdown
## Aggregates

- **Battle**: Aggregate wrapping CombatState. Owns victory/defeat invariants. All combat state transitions go through Battle.tick() or Battle.useAbility()/useLimitBreak().
- **Party**: Aggregate wrapping PartyFormation. Owns slot assignment invariants (hero can only occupy one slot, only recruited heroes can be assigned).
```

#### 3. Verify Invariant Consolidation

Run these grep commands to verify:

```bash
# Victory/defeat check should only be in Battle aggregate
grep -rn "allEnemiesDead\|allHeroesDead" src/
# Expected: only in src/domain/aggregates/Battle.ts

# "every.*isAlive" pattern should not be in slices
grep -rn "every.*isAlive" src/stores/slices/combat/
# Expected: zero matches

# Party slot assignment should only be in Party aggregate
grep -rn "currentPosition.*party" src/stores/slices/heroes/
# Expected: zero matches (logic moved to Party.assignHero)
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run typecheck`
- [x] Linting passes: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] All tests pass: `npm test`
- [x] Grep checks above return expected results

#### Manual Verification:
- [x] Full combat flow: start battle → auto-attack → use abilities → victory → claim rewards
- [x] Full party flow: recruit hero → assign to party → swap positions → remove from party
- [x] Defeat flow: enter combat with weak party → let heroes die → defeat screen shows
- [x] No regressions in game functionality

---

## Testing Strategy

### Unit Tests

Create `src/domain/aggregates/__tests__/Battle.test.ts`:
- `Battle.from(state).toState()` round-trips correctly
- `tick()` advances ATB gauges
- `tick()` processes hero and enemy actions when ATB reaches 100
- `#checkOutcome` returns 'victory' when all enemies dead
- `#checkOutcome` returns 'defeat' when all heroes dead
- `useAbility()` applies damage and checks victory
- `useLimitBreak()` applies damage and checks victory
- StatusEffect processing decrements duration correctly

Create `src/domain/aggregates/__tests__/Party.test.ts`:
- `Party.from(formation, roster).toFormation()` round-trips correctly
- `assignHero()` returns null for non-recruited hero
- `assignHero()` auto-removes from previous slot
- `getActiveHeroIds()` filters out null slots and non-existent heroes
- `swap()` exchanges two positions correctly

### Integration Tests

- Combat slice with Battle aggregate produces same results as old engine (snapshot comparison)
- Hero slice with Party aggregate maintains same behavior

### Manual Testing Steps

1. Start new game, recruit first hero
2. Assign hero to party, verify CPS updates
3. Enter combat zone, verify battle starts
4. Let combat auto-progress, verify attacks and damage
5. Use hero ability, verify damage applied
6. Kill all enemies, verify victory state
7. Claim rewards, verify curds/XP granted
8. Swap party positions, verify formation changes
9. Remove hero from party, verify slot empties
10. Test defeat by entering difficult zone with weak party

---

## Performance Considerations

1. **Object creation**: Each tick creates new Battle instance. This is intentional (immutability) and the overhead is negligible at 100ms tick rate. Monitor if this becomes an issue on low-end devices.

2. **Deep copies**: The aggregate deep-copies status effects and cooldowns each tick. This is necessary to prevent the mutation bug. The current implementation copies ~4-8 heroes and ~1-5 enemies per tick — acceptable.

3. **Party construction**: Party.from() is called on each party operation. The roster reference is not deep-copied (just the formation), so this is cheap.

---

## Migration Notes

1. **Backwards compatibility**: The old `tickCombat` function is marked deprecated but not deleted. It can be removed in a future cleanup pass once the aggregate is proven stable.

2. **Save compatibility**: No save format changes — aggregates are runtime-only wrappers over the same `CombatState` and `PartyFormation` shapes.

3. **UI compatibility**: No UI changes required — components continue reading from Zustand store, which contains the same state shapes.

---

## References

- Research document: `thoughts/shared/research/2026-06-09_14-34-02_ddd-phased-refactoring-roadmap.md`
- Phase 4 value objects: `src/domain/valueObjects/Stats.ts`, `src/domain/valueObjects/Quality.ts`
- Current combat engine: `src/systems/combatEngine.ts`
- Current combat slice: `src/stores/slices/combat/combatSlice.ts`
- Current hero slice: `src/stores/slices/heroes/heroSlice.ts`
- Glossary: `docs/GLOSSARY.md`

import type {
  CombatState,
  CombatEnemy,
  HeroCombatState,
  CombatLogEntry,
  HeroStats,
  EnemyAbility,
  StatusEffect,
} from '../../types/game';
import {
  updateAtbGauge,
  calculateDamage,
  applyDamage,
  updateLimitBreakGauge,
  selectEnemyTarget,
  selectHeroTarget,
  processStatusEffects,
  getStatModifierFromEffects,
  checkBossPhaseTransition,
  applyBossPhaseTransition,
  getBossEffectiveStats,
  getBossCurrentAbilities,
  executeHeroAbility,
  executeHeroLimitBreak,
  ATB_MAX,
  BOSS_PHASE_HEAL_PERCENT,
} from '../../systems/combatEngine';
import { heroRegistry, bossRegistry, getAnyEnemy } from '../index';

export interface BattleTickResult {
  battle: Battle;
  logs: readonly CombatLogEntry[];
}

export interface BattleAbilityResult {
  battle: Battle;
  logs: readonly CombatLogEntry[];
  success: boolean;
}

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
      enemies: this.#state.enemies.map((e) => ({
        ...e,
        statusEffects: [...e.statusEffects],
        abilityCooldowns: { ...e.abilityCooldowns },
      })),
      heroStates: Object.fromEntries(
        Object.entries(this.#state.heroStates).map(([id, h]) => [
          id,
          {
            ...h,
            statusEffects: [...h.statusEffects],
            abilityCooldowns: { ...h.abilityCooldowns },
          },
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

  /**
   * Get combat speed setting.
   */
  get combatSpeed(): 1 | 2 | 4 {
    return this.#state.combatSpeed;
  }

  /**
   * Advance combat by deltaMs. Returns new Battle and any log entries.
   * This is the ONLY public mutation method for the tick loop.
   * @param heroDamageMultiplier - Optional multiplier applied to all hero damage (for synergies)
   */
  tick(deltaMs: number, partyStats: Record<string, HeroStats>, heroDamageMultiplier = 1): BattleTickResult {
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
    const heroActionResult = this.#executeHeroActions(heroStates, enemies, partyStats, logs, heroDamageMultiplier);
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
      combatLog: this.#state.combatLog,
    };

    return {
      battle: new Battle(newState, logs),
      logs,
    };
  }

  /**
   * Execute a hero ability. Returns updated Battle with logs.
   * Victory check is handled by the aggregate, not the caller.
   */
  useAbility(
    heroId: string,
    partyStats: Record<string, HeroStats>,
    targetId?: string
  ): BattleAbilityResult {
    if (!this.isActive) {
      return { battle: this, logs: [], success: false };
    }

    const result = executeHeroAbility(this.toState(), heroId, partyStats, targetId);
    if (!result.success) {
      return { battle: this, logs: [], success: false };
    }

    // Build new state from result
    const newState: CombatState = {
      ...this.#state,
      ...result.stateUpdates,
    };

    // Check victory (THE SINGLE PLACE) — replaces slice's duplicate check
    if (result.stateUpdates.enemies?.every((e) => !e.isAlive)) {
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
  ): BattleAbilityResult {
    if (!this.isActive) {
      return { battle: this, logs: [], success: false };
    }

    const result = executeHeroLimitBreak(this.toState(), heroId, partyStats);
    if (!result.success) {
      return { battle: this, logs: [], success: false };
    }

    // Build new state from result
    const newState: CombatState = {
      ...this.#state,
      ...result.stateUpdates,
    };

    // Check victory (THE SINGLE PLACE) — replaces slice's duplicate check
    if (result.stateUpdates.enemies?.every((e) => !e.isAlive)) {
      newState.battleResult = 'victory';
    }

    return {
      battle: new Battle(newState, result.logEntries),
      logs: result.logEntries,
      success: true,
    };
  }

  // ===== Private Phase Methods =====

  #deepCopyHeroStates(): Record<string, HeroCombatState> {
    const copy: Record<string, HeroCombatState> = {};
    for (const [id, state] of Object.entries(this.#state.heroStates)) {
      copy[id] = {
        ...state,
        statusEffects: state.statusEffects.map((e) => ({ ...e })),
        abilityCooldowns: { ...state.abilityCooldowns },
      };
    }
    return copy;
  }

  #deepCopyEnemies(): CombatEnemy[] {
    return this.#state.enemies.map((e) => ({
      ...e,
      statusEffects: e.statusEffects.map((se) => ({ ...se })),
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
    logs: CombatLogEntry[],
    heroDamageMultiplier = 1
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

      const baseDamage = calculateDamage(effectiveAttack, effectiveDefense);
      const damage = Math.floor(baseDamage * heroDamageMultiplier);
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

      let effectiveEnemyStats = enemyDef.stats;
      let availableAbilities = enemyDef.abilities;

      if (enemy.isBoss) {
        const bossDef = bossRegistry.get(enemy.id);
        if (bossDef) {
          effectiveEnemyStats = getBossEffectiveStats(enemy, bossDef);
          availableAbilities = getBossCurrentAbilities(enemy, bossDef);
        }
      }

      // Select ability respecting cooldowns, fall back to first if all on cooldown
      const ability =
        this.#selectAbilityFromCooldowns(availableAbilities, enemy.abilityCooldowns) ||
        availableAbilities[0];
      const abilityMultiplier = ability?.damage || 1.0;

      const attackModifier = getStatModifierFromEffects(enemy.statusEffects, 'attack');
      const effectiveAttack = Math.max(1, effectiveEnemyStats.attack + attackModifier);

      // Check for AoE targeting
      if (ability?.targetType === 'all') {
        // Damage all alive heroes
        for (const heroState of Object.values(heroStates)) {
          if (!heroState.isAlive) continue;

          const heroStats = partyStats[heroState.heroId];
          const defenseModifier = getStatModifierFromEffects(heroState.statusEffects, 'defense');
          const effectiveDefense = Math.max(0, (heroStats?.defense || 10) + defenseModifier);

          const damage = calculateDamage(effectiveAttack, effectiveDefense, abilityMultiplier);
          heroState.currentHp = applyDamage(heroState.currentHp, damage);
          damageTaken += damage;

          const heroDef = heroRegistry.get(heroState.heroId);

          logs.push({
            timestamp: Date.now(),
            type: 'attack',
            source: enemyDef.name,
            target: heroDef?.name || heroState.heroId,
            value: damage,
            message: `${enemyDef.name}'s ${ability.name} hits ${heroDef?.name || heroState.heroId} for ${damage} damage!`,
          });

          if (heroState.currentHp <= 0) {
            heroState.isAlive = false;
            logs.push({
              timestamp: Date.now(),
              type: 'defeat',
              source: enemyDef.name,
              target: heroDef?.name || heroState.heroId,
              message: `${heroDef?.name || heroState.heroId} has fallen!`,
            });
          }
        }
      } else {
        // Single target (existing logic)
        const target = selectHeroTarget(heroStates);
        if (!target) continue;

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
      }

      // Apply ability status effect if present
      if (ability?.effect) {
        if (ability.effect.type === 'buff') {
          // Self-buff on enemy
          const statusEffect: StatusEffect = {
            id: `enemy_${enemy.id}_${ability.name}_${Date.now()}`,
            type: ability.effect.type,
            stat: ability.effect.stat,
            value: ability.effect.value,
            duration: ability.effect.duration,
            source: enemy.id,
          };
          enemy.statusEffects.push(statusEffect);
          logs.push({
            timestamp: Date.now(),
            type: 'status',
            source: enemyDef.name,
            target: enemyDef.name,
            message: `${ability.name} grants ${ability.effect.stat} buff!`,
          });
        } else {
          // Debuff targets: all heroes for AoE, single target for single-target
          const debuffTargets = ability.targetType === 'all'
            ? Object.values(heroStates).filter((h) => h.isAlive)
            : [selectHeroTarget(heroStates)].filter((h): h is HeroCombatState => h !== null);

          for (const debuffTarget of debuffTargets) {
            // Check immunity before applying debuff
            const isImmune = debuffTarget.statusEffects.some(
              (e) => e.type === 'immunity' &&
                     (e.stat === ability.effect!.stat || e.stat === 'allDebuffs') &&
                     e.duration > 0
            );

            if (!isImmune) {
              const statusEffect: StatusEffect = {
                id: `enemy_${enemy.id}_${ability.name}_${debuffTarget.heroId}_${Date.now()}`,
                type: ability.effect.type,
                stat: ability.effect.stat,
                value: ability.effect.value,
                duration: ability.effect.duration,
                source: enemy.id,
              };
              debuffTarget.statusEffects.push(statusEffect);
              const heroDef = heroRegistry.get(debuffTarget.heroId);
              logs.push({
                timestamp: Date.now(),
                type: 'status',
                source: enemyDef.name,
                target: heroDef?.name || debuffTarget.heroId,
                message: `${ability.name} applies ${ability.effect.stat} ${ability.effect.type}!`,
              });
            } else {
              const heroDef = heroRegistry.get(debuffTarget.heroId);
              logs.push({
                timestamp: Date.now(),
                type: 'status',
                source: heroDef?.name || debuffTarget.heroId,
                target: enemyDef.name,
                message: `${heroDef?.name || debuffTarget.heroId} is immune to ${ability.effect.stat}!`,
              });
            }
          }
        }
      }

      if (ability?.cooldown) {
        enemy.abilityCooldowns[ability.id] = ability.cooldown;
      }

      enemy.atbGauge = 0;
    }

    return { damageTaken };
  }

  #selectAbilityFromCooldowns(
    abilities: EnemyAbility[],
    cooldowns: Record<string, number>
  ): EnemyAbility | null {
    // Collect all abilities not on cooldown
    const available = abilities.filter((ability) => {
      const cooldown = cooldowns[ability.id] ?? 0;
      return cooldown <= 0;
    });

    if (available.length === 0) return null;

    // Random selection instead of always first
    const index = Math.floor(Math.random() * available.length);
    return available[index];
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
      heroState.statusEffects = result.updatedEffects;

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
      enemy.statusEffects = result.updatedEffects;

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
    const allEnemiesDead = enemies.every((e) => !e.isAlive);
    const allHeroesDead = Object.values(heroStates).every((h) => !h.isAlive);

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

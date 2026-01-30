import Decimal from 'decimal.js';
import type {
  CombatState,
  CombatEnemy,
  HeroCombatState,
  CombatLogEntry,
  HeroStats,
  StatusEffect,
  EnemyDefinition,
  BossDefinition,
  CombatRewards,
  CombatDrop,
  HeroState,
  PartyFormation,
  HeroAbilityDefinition,
  AbilityEffect,
} from '../types/game';
import { getEnemyById, getBossById, scaleEnemyStats } from '../data/enemies';
import { getZoneById, getStage } from '../data/zones';
import { getHeroById, getHeroAbility, getHeroLimitBreak, heroHasLimitBreak } from '../data/heroes';
import { calculateHeroStats } from './productionEngine';

// ===== Constants =====

const ATB_MAX = 100;
const BASE_ATB_RATE = 10; // 10% per second at speed 100
const LIMIT_BREAK_MAX = 100;
const LIMIT_BREAK_GAIN_FROM_DEALT = 0.01; // 1% per damage dealt
const LIMIT_BREAK_GAIN_FROM_TAKEN = 0.05; // 5% per damage taken

// ===== Combat Result Type =====

export interface CombatTickResult {
  stateUpdates: Partial<CombatState>;
  newLogEntries: CombatLogEntry[];
}

// ===== ATB Calculations =====

/**
 * Calculate ATB fill rate based on speed stat and combat speed multiplier
 * Higher speed = faster ATB fill
 */
export function calculateAtbFillRate(speed: number, combatSpeed: 1 | 2 | 4): number {
  // Base rate modified by speed stat and combat speed setting
  // At speed 100, fills at base rate. Speed 200 = 2x faster, etc.
  return BASE_ATB_RATE * (speed / 100) * combatSpeed;
}

/**
 * Update ATB gauge for a unit
 */
export function updateAtbGauge(
  currentGauge: number,
  speed: number,
  combatSpeed: 1 | 2 | 4,
  deltaSeconds: number
): number {
  const fillRate = calculateAtbFillRate(speed, combatSpeed);
  const newGauge = currentGauge + fillRate * deltaSeconds;
  return Math.min(ATB_MAX, newGauge);
}

// ===== Damage Calculations =====

/**
 * Calculate damage dealt from attacker to defender
 * Formula from research doc:
 * - Base damage = attacker.attack * skillMultiplier
 * - Defense factor = 1 - (defense / (defense + 100))
 * - Variance = 0.9-1.1 random
 */
export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  skillMultiplier: number = 1.0
): number {
  const baseDamage = attackerAttack * skillMultiplier;
  const defenseFactor = 1 - defenderDefense / (defenderDefense + 100);
  const variance = 0.9 + Math.random() * 0.2; // 0.9-1.1
  return Math.max(1, Math.floor(baseDamage * defenseFactor * variance));
}

/**
 * Apply damage to a target and return updated HP
 */
export function applyDamage(currentHp: number, damage: number): number {
  return Math.max(0, currentHp - damage);
}

// ===== Limit Break Gauge =====

/**
 * Update limit break gauge based on damage dealt and taken
 */
export function updateLimitBreakGauge(
  currentGauge: number,
  damageDealt: number,
  damageTaken: number
): number {
  const gainFromDealt = damageDealt * LIMIT_BREAK_GAIN_FROM_DEALT;
  const gainFromTaken = damageTaken * LIMIT_BREAK_GAIN_FROM_TAKEN;
  return Math.min(LIMIT_BREAK_MAX, currentGauge + gainFromDealt + gainFromTaken);
}

// ===== Target Selection =====

/**
 * Select a target from available enemies
 */
export function selectEnemyTarget(
  enemies: CombatEnemy[],
  targetType: 'random' | 'lowest_hp' | 'highest_hp' = 'random'
): CombatEnemy | null {
  const aliveEnemies = enemies.filter((e) => e.isAlive);
  if (aliveEnemies.length === 0) return null;

  switch (targetType) {
    case 'lowest_hp':
      return aliveEnemies.reduce((min, e) => (e.currentHp < min.currentHp ? e : min));
    case 'highest_hp':
      return aliveEnemies.reduce((max, e) => (e.currentHp > max.currentHp ? e : max));
    case 'random':
    default:
      return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  }
}

/**
 * Select a hero target from party
 */
export function selectHeroTarget(
  heroStates: Record<string, HeroCombatState>,
  targetType: 'random' | 'lowest_hp' | 'highest_hp' = 'random'
): HeroCombatState | null {
  const aliveHeroes = Object.values(heroStates).filter((h) => h.isAlive);
  if (aliveHeroes.length === 0) return null;

  switch (targetType) {
    case 'lowest_hp':
      return aliveHeroes.reduce((min, h) => (h.currentHp < min.currentHp ? h : min));
    case 'highest_hp':
      return aliveHeroes.reduce((max, h) => (h.currentHp > max.currentHp ? h : max));
    case 'random':
    default:
      return aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
  }
}

// ===== Status Effect Processing =====

/**
 * Apply status effects (DoT, HoT, stat buffs/debuffs)
 */
export function processStatusEffects(
  currentHp: number,
  maxHp: number,
  statusEffects: StatusEffect[]
): { newHp: number; damage: number; healing: number; expiredEffects: string[] } {
  let damage = 0;
  let healing = 0;
  const expiredEffects: string[] = [];

  for (const effect of statusEffects) {
    if (effect.stat === 'damage_over_time') {
      damage += effect.value;
    } else if (effect.stat === 'heal_over_time') {
      healing += effect.value;
    }

    // Decrement duration
    effect.duration -= 1;
    if (effect.duration <= 0) {
      expiredEffects.push(effect.id);
    }
  }

  const newHp = Math.min(maxHp, Math.max(0, currentHp - damage + healing));
  return { newHp, damage, healing, expiredEffects };
}

/**
 * Get stat modifier from active status effects
 */
export function getStatModifierFromEffects(
  statusEffects: StatusEffect[],
  stat: keyof HeroStats
): number {
  let modifier = 0;
  for (const effect of statusEffects) {
    if (effect.stat === stat) {
      modifier += effect.value;
    }
  }
  return modifier;
}

/**
 * Remove expired status effects
 */
export function removeExpiredEffects(
  statusEffects: StatusEffect[],
  expiredIds: string[]
): StatusEffect[] {
  return statusEffects.filter((e) => !expiredIds.includes(e.id));
}

// ===== Boss Phase System =====

export interface BossPhaseResult {
  phaseChanged: boolean;
  newPhase?: number;
  logEntry?: CombatLogEntry;
  statsApplied?: boolean;
}

/**
 * Check if a boss should transition to a new phase based on HP percentage
 * Boss phases trigger at HP thresholds:
 * - Phase 2: 66% HP
 * - Phase 3: 33% HP
 * - Phase 4 (if applicable): 15% HP
 */
export function checkBossPhaseTransition(
  enemy: CombatEnemy,
  bossDef: BossDefinition
): BossPhaseResult {
  if (!enemy.isBoss || !enemy.currentPhase || !enemy.phaseTriggered) {
    return { phaseChanged: false };
  }

  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;

  // Find the next phase that should trigger based on current HP
  // Phases are sorted by hpThreshold descending (100, 66, 33, 15, etc.)
  const sortedPhases = [...bossDef.phases].sort((a, b) => b.hpThreshold - a.hpThreshold);

  for (const phase of sortedPhases) {
    // Skip phases we've already triggered
    if (enemy.phaseTriggered[phase.phaseNumber]) continue;

    // Check if HP has dropped below this phase's threshold
    if (hpPercent <= phase.hpThreshold) {
      return {
        phaseChanged: true,
        newPhase: phase.phaseNumber,
        logEntry: {
          timestamp: Date.now(),
          type: 'phase_change',
          source: bossDef.name,
          target: '',
          message: phase.onEnterMessage,
        },
        statsApplied: Object.keys(phase.statModifiers).length > 0,
      };
    }
  }

  return { phaseChanged: false };
}

/**
 * Get the effective stats for a boss in their current phase
 */
export function getBossEffectiveStats(
  enemy: CombatEnemy,
  bossDef: BossDefinition
): HeroStats {
  if (!enemy.isBoss || !enemy.currentPhase) {
    return bossDef.stats;
  }

  // Apply stat modifiers from all triggered phases cumulatively
  const stats = { ...bossDef.stats };

  for (const phase of bossDef.phases) {
    if (enemy.phaseTriggered?.[phase.phaseNumber]) {
      if (phase.statModifiers.attack) stats.attack += phase.statModifiers.attack;
      if (phase.statModifiers.defense) stats.defense += phase.statModifiers.defense;
      if (phase.statModifiers.speed) stats.speed += phase.statModifiers.speed;
      if (phase.statModifiers.cheeseAffinity) stats.cheeseAffinity += phase.statModifiers.cheeseAffinity;
    }
  }

  return stats;
}

/**
 * Get all available skills for a boss in their current phase
 */
export function getBossCurrentSkills(
  enemy: CombatEnemy,
  bossDef: BossDefinition
): typeof bossDef.skills {
  if (!enemy.isBoss || !enemy.currentPhase) {
    return bossDef.skills;
  }

  // Start with base skills
  const skills = [...bossDef.skills];

  // Add skills from all triggered phases
  for (const phase of bossDef.phases) {
    if (enemy.phaseTriggered?.[phase.phaseNumber] && phase.newSkills) {
      skills.push(...phase.newSkills);
    }
  }

  return skills;
}

/**
 * Apply boss phase transition: heal a portion of HP and update phase state
 */
export function applyBossPhaseTransition(
  enemy: CombatEnemy,
  newPhase: number,
  bossDef: BossDefinition
): CombatEnemy {
  const phase = bossDef.phases.find(p => p.phaseNumber === newPhase);
  if (!phase) return enemy;

  // Boss heals a small amount on phase transition (10% of max HP)
  const healAmount = Math.floor(enemy.maxHp * 0.10);
  const newHp = Math.min(enemy.maxHp, enemy.currentHp + healAmount);

  return {
    ...enemy,
    currentHp: newHp,
    currentPhase: newPhase,
    phaseTriggered: {
      ...enemy.phaseTriggered,
      [newPhase]: true,
    },
  };
}

// ===== Boss Special Mechanics =====

/**
 * Process boss special mechanics based on their specialMechanics array
 * Returns any minions that should be spawned
 */
export interface BossMechanicResult {
  minionsToSpawn: CombatEnemy[];
  logEntries: CombatLogEntry[];
  heroEffects?: { heroId: string; effect: StatusEffect }[];
}

/**
 * Check and apply boss special mechanics
 * Called periodically during combat to handle things like:
 * - Summon minions
 * - Remove buffs from heroes
 * - Apply field effects
 */
export function processBossSpecialMechanics(
  boss: CombatEnemy,
  bossDef: BossDefinition,
  combatTime: number // Time in combat (seconds)
): BossMechanicResult {
  const result: BossMechanicResult = {
    minionsToSpawn: [],
    logEntries: [],
  };

  // Only process if boss is alive
  if (!boss.isAlive) return result;

  // Process mechanics based on boss ID
  switch (bossDef.id) {
    case 'bland_baron':
      // "Removes all flavor buffs at 50% HP" - handled by phase transition
      // "Summons Processed Slimes every 30 seconds"
      if (combatTime > 0 && Math.floor(combatTime) % 30 === 0 && Math.floor(combatTime) !== 0) {
        const slime = getEnemyById('processed_slime');
        if (slime) {
          const minion = createCombatEnemy(slime, Date.now());
          result.minionsToSpawn.push(minion);
          result.logEntries.push({
            timestamp: Date.now(),
            type: 'skill',
            source: bossDef.name,
            target: '',
            message: `${bossDef.name} summons a Processed Cheese Slime! "More for the factory!"`,
          });
        }
      }
      break;

    case 'wheat_witch':
      // "Summons grain minion swarm every phase"
      // Grain minions are cheese rats flavored as grain minions
      // This is handled when phase transitions occur
      break;

    case 'pacific_rim_crab':
      // "Shell regenerates at 33% HP" - handled by phase defense modifier
      // Phase 3 removes defense for "full offense mode"
      break;

    default:
      break;
  }

  return result;
}

/**
 * Apply the "Remove Flavor" debuff - removes all buffs from heroes
 * Used by The Bland Baron at 50% HP
 */
export function removeFlavourBuffs(
  heroStates: Record<string, HeroCombatState>
): { updatedStates: Record<string, HeroCombatState>; logEntries: CombatLogEntry[] } {
  const logEntries: CombatLogEntry[] = [];
  const updatedStates = { ...heroStates };

  for (const heroId of Object.keys(updatedStates)) {
    const heroState = updatedStates[heroId];
    if (!heroState.isAlive) continue;

    const buffCount = heroState.statusEffects.filter(e => e.type === 'buff').length;
    if (buffCount > 0) {
      updatedStates[heroId] = {
        ...heroState,
        statusEffects: heroState.statusEffects.filter(e => e.type !== 'buff'),
      };

      const heroDef = getHeroById(heroId);
      logEntries.push({
        timestamp: Date.now(),
        type: 'status',
        source: 'The Bland Baron',
        target: heroDef?.name || heroId,
        message: `${heroDef?.name || heroId}'s flavor buffs have been removed! "No taste allowed in MY kingdom!"`,
      });
    }
  }

  return { updatedStates, logEntries };
}

// ===== Combat Initialization =====

/**
 * Create initial combat state for a hero
 */
export function createHeroCombatState(
  heroId: string,
  heroState: HeroState
): HeroCombatState {
  const stats = calculateHeroStats(heroId, heroState);

  return {
    heroId,
    currentHp: stats.hp,
    maxHp: stats.hp,
    atbGauge: 0,
    isAlive: true,
    statusEffects: [],
    skillCooldowns: {},
  };
}

/**
 * Create initial combat state for an enemy
 */
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
    atbGauge: Math.random() * 20, // Start with 0-20% ATB for variety
    isAlive: true,
    statusEffects: [],
    skillCooldowns: {},
    // Boss-specific fields
    isBoss,
    currentPhase: isBoss ? 1 : undefined,
    phaseTriggered: isBoss ? { 1: true } : undefined,
  };
}

/**
 * Initialize combat for a zone and stage
 */
export function initializeCombat(
  zoneId: string,
  stageNumber: number,
  heroes: Record<string, HeroState>,
  party: PartyFormation
): CombatState | null {
  const zone = getZoneById(zoneId);
  if (!zone) return null;

  const stageInfo = getStage(zoneId, stageNumber);
  if (!stageInfo) return null;

  // Initialize hero combat states
  const heroStates: Record<string, HeroCombatState> = {};
  const partyHeroIds = [
    party.frontLeft,
    party.frontRight,
    party.backLeft,
    party.backRight,
  ].filter((id): id is string => id !== null && heroes[id] !== undefined);

  for (const heroId of partyHeroIds) {
    const heroState = heroes[heroId];
    if (heroState) {
      heroStates[heroId] = createHeroCombatState(heroId, heroState);
    }
  }

  // Initialize enemies
  const enemies: CombatEnemy[] = [];

  if (stageInfo.type === 'boss') {
    const boss = getBossById(stageInfo.bossStage.bossId);
    if (boss) {
      enemies.push(createCombatEnemy(boss, 0));
    }
  } else {
    const stage = stageInfo.stage;
    stage.enemies.forEach((enemyId, index) => {
      const enemyDef = getEnemyById(enemyId);
      if (enemyDef) {
        const scaledEnemy = scaleEnemyStats(enemyDef, stage.enemyLevelModifier);
        enemies.push(createCombatEnemy(scaledEnemy, index));
      }
    });
  }

  if (enemies.length === 0 || Object.keys(heroStates).length === 0) {
    return null;
  }

  return {
    isInCombat: true,
    currentZone: zoneId,
    currentStage: stageNumber,
    enemies,
    heroStates,
    combatLog: [
      {
        timestamp: Date.now(),
        type: 'attack',
        source: 'system',
        target: '',
        message: `Battle started in ${zone.name} - Stage ${stageNumber}!`,
      },
    ],
    combatSpeed: 1,
    limitBreakGauge: 0,
    battleResult: 'ongoing',
  };
}

// ===== Combat Tick =====

/**
 * Main combat tick function - called from game loop
 */
export function tickCombat(
  state: CombatState,
  deltaMs: number,
  partyStats: Record<string, HeroStats>
): CombatTickResult {
  if (!state.isInCombat || state.battleResult !== 'ongoing') {
    return { stateUpdates: {}, newLogEntries: [] };
  }

  const deltaSeconds = deltaMs / 1000;
  const newLogEntries: CombatLogEntry[] = [];
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;

  // Create mutable copies
  const updatedHeroStates = { ...state.heroStates };
  const updatedEnemies = state.enemies.map((e) => ({ ...e }));
  let updatedLimitBreakGauge = state.limitBreakGauge;

  // 1. Update ATB gauges for all alive heroes
  for (const heroId of Object.keys(updatedHeroStates)) {
    const heroState = updatedHeroStates[heroId];
    if (!heroState.isAlive) continue;

    const heroStats = partyStats[heroId];
    if (!heroStats) continue;

    const speedModifier = getStatModifierFromEffects(heroState.statusEffects, 'speed');
    const effectiveSpeed = Math.max(1, heroStats.speed + speedModifier);

    heroState.atbGauge = updateAtbGauge(
      heroState.atbGauge,
      effectiveSpeed,
      state.combatSpeed,
      deltaSeconds
    );
  }

  // 2. Update ATB gauges for all alive enemies
  for (const enemy of updatedEnemies) {
    if (!enemy.isAlive) continue;

    const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
    if (!enemyDef) continue;

    // Get effective stats (handles boss phase modifiers)
    let baseSpeed = enemyDef.stats.speed;
    if (enemy.isBoss) {
      const bossDef = getBossById(enemy.id);
      if (bossDef) {
        baseSpeed = getBossEffectiveStats(enemy, bossDef).speed;
      }
    }

    const speedModifier = getStatModifierFromEffects(enemy.statusEffects, 'speed');
    const effectiveSpeed = Math.max(1, baseSpeed + speedModifier);

    enemy.atbGauge = updateAtbGauge(
      enemy.atbGauge,
      effectiveSpeed,
      state.combatSpeed,
      deltaSeconds
    );
  }

  // 3. Process hero actions (ATB at 100%)
  for (const heroId of Object.keys(updatedHeroStates)) {
    const heroState = updatedHeroStates[heroId];
    if (!heroState.isAlive || heroState.atbGauge < ATB_MAX) continue;

    const heroStats = partyStats[heroId];
    if (!heroStats) continue;

    const heroDef = getHeroById(heroId);
    if (!heroDef) continue;

    // Find a target
    const target = selectEnemyTarget(updatedEnemies);
    if (!target) continue;

    // Calculate damage
    const attackModifier = getStatModifierFromEffects(heroState.statusEffects, 'attack');
    const effectiveAttack = Math.max(1, heroStats.attack + attackModifier);

    const enemyDef = getEnemyById(target.id) || getBossById(target.id);

    // Get effective defense (handles boss phase modifiers)
    let baseDefense = enemyDef?.stats.defense || 10;
    if (target.isBoss) {
      const bossDef = getBossById(target.id);
      if (bossDef) {
        baseDefense = getBossEffectiveStats(target, bossDef).defense;
      }
    }

    const defenseModifier = getStatModifierFromEffects(target.statusEffects, 'defense');
    const effectiveDefense = Math.max(0, baseDefense + defenseModifier);

    const damage = calculateDamage(effectiveAttack, effectiveDefense);
    target.currentHp = applyDamage(target.currentHp, damage);
    totalDamageDealt += damage;

    // Log the attack
    newLogEntries.push({
      timestamp: Date.now(),
      type: 'attack',
      source: heroDef.name,
      target: enemyDef?.name || target.id,
      value: damage,
      message: `${heroDef.name} attacks ${enemyDef?.name || target.id} for ${damage} damage!`,
    });

    // Check for enemy defeat
    if (target.currentHp <= 0) {
      target.isAlive = false;
      newLogEntries.push({
        timestamp: Date.now(),
        type: 'defeat',
        source: heroDef.name,
        target: enemyDef?.name || target.id,
        message: `${enemyDef?.name || target.id} has been defeated!`,
      });
    } else if (target.isBoss) {
      // Check for boss phase transition
      const bossDef = getBossById(target.id);
      if (bossDef) {
        const phaseResult = checkBossPhaseTransition(target, bossDef);
        if (phaseResult.phaseChanged && phaseResult.newPhase) {
          // Apply the phase transition
          const updatedBoss = applyBossPhaseTransition(target, phaseResult.newPhase, bossDef);
          // Update the target in place
          Object.assign(target, updatedBoss);

          if (phaseResult.logEntry) {
            newLogEntries.push(phaseResult.logEntry);
          }

          // Log the heal from phase transition
          newLogEntries.push({
            timestamp: Date.now(),
            type: 'heal',
            source: bossDef.name,
            target: bossDef.name,
            value: Math.floor(target.maxHp * 0.10),
            message: `${bossDef.name} regenerates some health as they enter phase ${phaseResult.newPhase}!`,
          });
        }
      }
    }

    // Reset hero ATB
    heroState.atbGauge = 0;
  }

  // 4. Process enemy actions (ATB at 100%)
  for (const enemy of updatedEnemies) {
    if (!enemy.isAlive || enemy.atbGauge < ATB_MAX) continue;

    const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
    if (!enemyDef) continue;

    // Find a target
    const target = selectHeroTarget(updatedHeroStates);
    if (!target) continue;

    // Get effective stats and skills (handles boss phase modifiers)
    let effectiveEnemyStats = enemyDef.stats;
    let availableSkills = enemyDef.skills;

    if (enemy.isBoss) {
      const bossDef = getBossById(enemy.id);
      if (bossDef) {
        effectiveEnemyStats = getBossEffectiveStats(enemy, bossDef);
        availableSkills = getBossCurrentSkills(enemy, bossDef);
      }
    }

    // Get first available skill (basic attack) or default
    // TODO: Could add smarter skill selection based on cooldowns
    const skill = availableSkills[0];
    const skillMultiplier = skill?.damage || 1.0;

    // Calculate damage with phase-adjusted stats
    const attackModifier = getStatModifierFromEffects(enemy.statusEffects, 'attack');
    const effectiveAttack = Math.max(1, effectiveEnemyStats.attack + attackModifier);

    const heroStats = partyStats[target.heroId];
    const defenseModifier = getStatModifierFromEffects(target.statusEffects, 'defense');
    const effectiveDefense = Math.max(0, (heroStats?.defense || 10) + defenseModifier);

    const damage = calculateDamage(effectiveAttack, effectiveDefense, skillMultiplier);
    target.currentHp = applyDamage(target.currentHp, damage);
    totalDamageTaken += damage;

    const heroDef = getHeroById(target.heroId);

    // Log the attack
    newLogEntries.push({
      timestamp: Date.now(),
      type: 'attack',
      source: enemyDef.name,
      target: heroDef?.name || target.heroId,
      value: damage,
      message: `${enemyDef.name} attacks ${heroDef?.name || target.heroId} for ${damage} damage!`,
    });

    // Check for hero defeat
    if (target.currentHp <= 0) {
      target.isAlive = false;
      newLogEntries.push({
        timestamp: Date.now(),
        type: 'defeat',
        source: enemyDef.name,
        target: heroDef?.name || target.heroId,
        message: `${heroDef?.name || target.heroId} has fallen!`,
      });
    }

    // Reset enemy ATB
    enemy.atbGauge = 0;
  }

  // 5. Process status effects for heroes
  for (const heroId of Object.keys(updatedHeroStates)) {
    const heroState = updatedHeroStates[heroId];
    if (!heroState.isAlive || heroState.statusEffects.length === 0) continue;

    const result = processStatusEffects(
      heroState.currentHp,
      heroState.maxHp,
      heroState.statusEffects
    );

    heroState.currentHp = result.newHp;
    heroState.statusEffects = removeExpiredEffects(heroState.statusEffects, result.expiredEffects);

    if (result.damage > 0) {
      totalDamageTaken += result.damage;
    }

    if (heroState.currentHp <= 0) {
      heroState.isAlive = false;
      const heroDef = getHeroById(heroId);
      newLogEntries.push({
        timestamp: Date.now(),
        type: 'defeat',
        source: 'status_effect',
        target: heroDef?.name || heroId,
        message: `${heroDef?.name || heroId} succumbed to status effects!`,
      });
    }
  }

  // 6. Process status effects for enemies
  for (const enemy of updatedEnemies) {
    if (!enemy.isAlive || enemy.statusEffects.length === 0) continue;

    const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
    const maxHp = enemyDef?.stats.hp || enemy.maxHp;

    const result = processStatusEffects(
      enemy.currentHp,
      maxHp,
      enemy.statusEffects
    );

    enemy.currentHp = result.newHp;
    enemy.statusEffects = removeExpiredEffects(enemy.statusEffects, result.expiredEffects);

    if (enemy.currentHp <= 0) {
      enemy.isAlive = false;
      newLogEntries.push({
        timestamp: Date.now(),
        type: 'defeat',
        source: 'status_effect',
        target: enemyDef?.name || enemy.id,
        message: `${enemyDef?.name || enemy.id} succumbed to status effects!`,
      });
    }
  }

  // 7. Update limit break gauge
  updatedLimitBreakGauge = updateLimitBreakGauge(
    updatedLimitBreakGauge,
    totalDamageDealt,
    totalDamageTaken
  );

  // 8. Check victory/defeat conditions
  const allEnemiesDead = updatedEnemies.every((e) => !e.isAlive);
  const allHeroesDead = Object.values(updatedHeroStates).every((h) => !h.isAlive);

  let battleResult: CombatState['battleResult'] = 'ongoing';

  if (allEnemiesDead) {
    battleResult = 'victory';
    newLogEntries.push({
      timestamp: Date.now(),
      type: 'victory',
      source: 'system',
      target: '',
      message: 'Victory! All enemies have been defeated!',
    });
  } else if (allHeroesDead) {
    battleResult = 'defeat';
    newLogEntries.push({
      timestamp: Date.now(),
      type: 'defeat',
      source: 'system',
      target: '',
      message: 'Defeat... All heroes have fallen.',
    });
  }

  // Decrement skill cooldowns
  for (const heroId of Object.keys(updatedHeroStates)) {
    const heroState = updatedHeroStates[heroId];
    for (const skillId of Object.keys(heroState.skillCooldowns)) {
      if (heroState.skillCooldowns[skillId] > 0) {
        heroState.skillCooldowns[skillId] -= 1;
      }
    }
  }

  for (const enemy of updatedEnemies) {
    for (const skillId of Object.keys(enemy.skillCooldowns)) {
      if (enemy.skillCooldowns[skillId] > 0) {
        enemy.skillCooldowns[skillId] -= 1;
      }
    }
  }

  return {
    stateUpdates: {
      heroStates: updatedHeroStates,
      enemies: updatedEnemies,
      limitBreakGauge: updatedLimitBreakGauge,
      battleResult,
    },
    newLogEntries,
  };
}

// ===== Combat Rewards =====

/**
 * Boss reward multipliers based on difficulty
 */
const BOSS_REWARD_MULTIPLIERS: Record<string, { curds: number; xp: number; wheyPercent: number }> = {
  bland_baron: { curds: 1.5, xp: 2.0, wheyPercent: 0.15 },      // Ontario - first boss, easier
  fromage_fantome: { curds: 1.8, xp: 2.5, wheyPercent: 0.20 },  // Quebec - harder, 4 phases
  oil_slick_sally: { curds: 1.7, xp: 2.3, wheyPercent: 0.18 },  // Alberta - mid difficulty
  wheat_witch: { curds: 1.6, xp: 2.2, wheyPercent: 0.17 },      // Saskatchewan - less phases
  pacific_rim_crab: { curds: 2.0, xp: 3.0, wheyPercent: 0.25 }, // BC - final boss, hardest
};

/**
 * Calculate rewards for completing a battle
 * Boss battles provide enhanced rewards including:
 * - Multiplied curds based on boss difficulty
 * - Bonus XP for party members
 * - Whey currency (boss-only)
 * - Guaranteed drops from boss loot tables
 */
export function calculateCombatRewards(
  enemies: CombatEnemy[],
  partyHeroIds: string[],
  isBoss: boolean
): CombatRewards {
  let totalCurds = new Decimal(0);
  let totalXp = 0;
  const drops: CombatDrop[] = [];
  let bossMultiplier = { curds: 1.0, xp: 1.0, wheyPercent: 0.1 };

  for (const enemy of enemies) {
    const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
    if (!enemyDef) continue;

    // Check if this enemy is a boss and get their multiplier
    if (enemy.isBoss && BOSS_REWARD_MULTIPLIERS[enemy.id]) {
      bossMultiplier = BOSS_REWARD_MULTIPLIERS[enemy.id];
    }

    // Add curd reward
    totalCurds = totalCurds.plus(enemyDef.curdReward);

    // Add XP reward
    totalXp += enemyDef.xpReward;

    // Roll for drops - bosses have guaranteed drops for items with chance >= 0.5
    for (const drop of enemyDef.drops) {
      const effectiveChance = enemy.isBoss && drop.chance >= 0.5 ? 1.0 : drop.chance;

      if (Math.random() < effectiveChance) {
        const quantity = drop.minQuantity && drop.maxQuantity
          ? Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity
          : 1;

        // Boss drops give bonus quantity
        const bonusQuantity = enemy.isBoss ? Math.ceil(quantity * 1.5) : quantity;

        drops.push({
          itemId: drop.itemId,
          quantity: bonusQuantity,
          itemType: 'material', // Default to material; could be equipment based on item ID
        });
      }
    }
  }

  // Apply boss multipliers
  if (isBoss) {
    totalCurds = totalCurds.mul(bossMultiplier.curds);
    totalXp = Math.floor(totalXp * bossMultiplier.xp);
  }

  // Distribute XP among party members
  const xpPerHero = Math.floor(totalXp / partyHeroIds.length);
  const xpDistribution: Record<string, number> = {};
  for (const heroId of partyHeroIds) {
    xpDistribution[heroId] = xpPerHero;
  }

  // Boss battles give whey as bonus (percentage of curds)
  const wheyReward = isBoss ? totalCurds.mul(bossMultiplier.wheyPercent) : new Decimal(0);

  return {
    curds: totalCurds,
    whey: wheyReward,
    xp: xpDistribution,
    drops,
  };
}

// ===== Combat End Utilities =====

/**
 * Create an empty/reset combat state
 */
export function createEmptyCombatState(): CombatState {
  return {
    isInCombat: false,
    currentZone: null,
    currentStage: 0,
    enemies: [],
    heroStates: {},
    combatLog: [],
    combatSpeed: 1,
    limitBreakGauge: 0,
    battleResult: null,
  };
}

/**
 * Check if the stage is a boss stage
 */
export function isBossStage(zoneId: string, stageNumber: number): boolean {
  const zone = getZoneById(zoneId);
  if (!zone) return false;
  return stageNumber === zone.bossStage.stageNumber;
}

// ===== Hero Ability System =====

export interface UseAbilityResult {
  success: boolean;
  logEntries: CombatLogEntry[];
  stateUpdates: {
    heroStates?: Record<string, HeroCombatState>;
    enemies?: CombatEnemy[];
    limitBreakGauge?: number;
  };
  error?: string;
}

/**
 * Check if a hero can use their ability
 */
export function canUseAbility(
  heroState: HeroCombatState,
  heroId: string
): { canUse: boolean; reason?: string } {
  // Check if hero is alive
  if (!heroState.isAlive) {
    return { canUse: false, reason: 'Hero is defeated' };
  }

  // Check if ability exists
  const ability = getHeroAbility(heroId);
  if (!ability) {
    return { canUse: false, reason: 'Hero has no ability' };
  }

  // Check cooldown
  const cooldownRemaining = heroState.skillCooldowns[ability.id] || 0;
  if (cooldownRemaining > 0) {
    return { canUse: false, reason: `Ability on cooldown (${cooldownRemaining} turns)` };
  }

  return { canUse: true };
}

/**
 * Apply a single ability effect
 */
function applyAbilityEffect(
  effect: AbilityEffect,
  source: { heroId: string; attack: number },
  targetHeroStates: Record<string, HeroCombatState>,
  targetEnemies: CombatEnemy[],
  targetType: HeroAbilityDefinition['targetType'],
  specificTargetId?: string
): { logEntries: CombatLogEntry[]; damageDealt: number; healingDone: number } {
  const logEntries: CombatLogEntry[] = [];
  let damageDealt = 0;
  let healingDone = 0;
  const heroDef = getHeroById(source.heroId);
  const heroName = heroDef?.name || source.heroId;

  switch (effect.type) {
    case 'damage': {
      // Apply damage to enemies
      const targets = targetType === 'all_enemies'
        ? targetEnemies.filter((e) => e.isAlive)
        : specificTargetId
          ? targetEnemies.filter((e) => e.instanceId === specificTargetId && e.isAlive)
          : [selectEnemyTarget(targetEnemies)].filter((e): e is CombatEnemy => e !== null);

      for (const enemy of targets) {
        const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
        const damage = calculateDamage(source.attack, enemyDef?.stats.defense || 10, effect.multiplier);
        enemy.currentHp = applyDamage(enemy.currentHp, damage);
        damageDealt += damage;

        logEntries.push({
          timestamp: Date.now(),
          type: 'skill',
          source: heroName,
          target: enemyDef?.name || enemy.id,
          value: damage,
          message: `${heroName}'s ability hits ${enemyDef?.name || enemy.id} for ${damage} damage!`,
        });

        if (enemy.currentHp <= 0) {
          enemy.isAlive = false;
          logEntries.push({
            timestamp: Date.now(),
            type: 'defeat',
            source: heroName,
            target: enemyDef?.name || enemy.id,
            message: `${enemyDef?.name || enemy.id} has been defeated!`,
          });
        }
      }
      break;
    }

    case 'heal': {
      // Apply healing to allies
      const allyTargets = targetType === 'all_allies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : specificTargetId && targetHeroStates[specificTargetId]?.isAlive
            ? [targetHeroStates[specificTargetId]]
            : [];

      for (const ally of allyTargets) {
        const healAmount = effect.isPercentage
          ? Math.floor(ally.maxHp * (effect.amount / 100))
          : effect.amount;
        const actualHeal = Math.min(healAmount, ally.maxHp - ally.currentHp);
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healAmount);
        healingDone += actualHeal;

        const allyDef = getHeroById(ally.heroId);
        logEntries.push({
          timestamp: Date.now(),
          type: 'heal',
          source: heroName,
          target: allyDef?.name || ally.heroId,
          value: actualHeal,
          message: `${heroName} heals ${allyDef?.name || ally.heroId} for ${actualHeal} HP!`,
        });
      }
      break;
    }

    case 'buff': {
      // Apply buff to allies
      const buffTargets = targetType === 'all_allies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of buffTargets) {
        const statusEffect: StatusEffect = {
          id: `${effect.stat}_buff_${Date.now()}`,
          type: 'buff',
          stat: effect.stat as StatusEffect['stat'],
          value: effect.value,
          duration: effect.duration,
          source: source.heroId,
        };
        ally.statusEffects.push(statusEffect);

        const allyDef = getHeroById(ally.heroId);
        logEntries.push({
          timestamp: Date.now(),
          type: 'status',
          source: heroName,
          target: allyDef?.name || ally.heroId,
          message: `${allyDef?.name || ally.heroId} gains ${effect.stat} +${effect.value} for ${effect.duration} turns!`,
        });
      }
      break;
    }

    case 'debuff': {
      // Apply debuff to enemies
      const debuffTargets = targetType === 'all_enemies'
        ? targetEnemies.filter((e) => e.isAlive)
        : specificTargetId
          ? targetEnemies.filter((e) => e.instanceId === specificTargetId && e.isAlive)
          : [selectEnemyTarget(targetEnemies)].filter((e): e is CombatEnemy => e !== null);

      for (const enemy of debuffTargets) {
        const statusEffect: StatusEffect = {
          id: `${effect.stat}_debuff_${Date.now()}`,
          type: 'debuff',
          stat: effect.stat as StatusEffect['stat'],
          value: effect.value,
          duration: effect.duration,
          source: source.heroId,
        };
        enemy.statusEffects.push(statusEffect);

        const enemyDef = getEnemyById(enemy.id) || getBossById(enemy.id);
        logEntries.push({
          timestamp: Date.now(),
          type: 'status',
          source: heroName,
          target: enemyDef?.name || enemy.id,
          message: `${enemyDef?.name || enemy.id} is affected by ${effect.stat} ${effect.value < 0 ? effect.value : '-' + effect.value}!`,
        });
      }
      break;
    }

    case 'taunt': {
      // Apply taunt (enemies prioritize this hero)
      const self = targetHeroStates[source.heroId];
      if (self) {
        const statusEffect: StatusEffect = {
          id: `taunt_${Date.now()}`,
          type: 'buff',
          stat: 'defense', // Taunt uses defense stat as placeholder
          value: 0, // No stat change, just marker
          duration: effect.duration,
          source: source.heroId,
        };
        self.statusEffects.push(statusEffect);

        logEntries.push({
          timestamp: Date.now(),
          type: 'status',
          source: heroName,
          target: heroName,
          message: `${heroName} taunts all enemies! "Sorry, but you'll have to go through me, eh!"`,
        });
      }
      break;
    }

    case 'immunity': {
      // Apply immunity to allies
      const immunityTargets = targetType === 'all_allies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of immunityTargets) {
        const statusEffect: StatusEffect = {
          id: `immunity_${effect.immunityType}_${Date.now()}`,
          type: 'buff',
          stat: 'defense', // Using defense as placeholder for immunity
          value: 999, // High value to indicate immunity
          duration: effect.duration,
          source: source.heroId,
        };
        ally.statusEffects.push(statusEffect);

        const allyDef = getHeroById(ally.heroId);
        logEntries.push({
          timestamp: Date.now(),
          type: 'status',
          source: heroName,
          target: allyDef?.name || ally.heroId,
          message: `${allyDef?.name || ally.heroId} gains immunity to ${effect.immunityType}!`,
        });
      }
      break;
    }

    case 'drop_rate_bonus': {
      // Drop rate bonus is handled at reward calculation time
      // Just log the effect
      logEntries.push({
        timestamp: Date.now(),
        type: 'status',
        source: heroName,
        target: 'Party',
        message: `Drop rates increased by ${effect.value}% for ${effect.duration} turns!`,
      });
      break;
    }

    case 'cleanse': {
      // Remove all debuffs from allies
      const cleanseTargets = targetType === 'all_allies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of cleanseTargets) {
        const debuffCount = ally.statusEffects.filter((e) => e.type === 'debuff').length;
        ally.statusEffects = ally.statusEffects.filter((e) => e.type !== 'debuff');

        if (debuffCount > 0) {
          const allyDef = getHeroById(ally.heroId);
          logEntries.push({
            timestamp: Date.now(),
            type: 'heal',
            source: heroName,
            target: allyDef?.name || ally.heroId,
            message: `${allyDef?.name || ally.heroId} is cleansed of ${debuffCount} debuff(s)!`,
          });
        }
      }
      break;
    }
  }

  return { logEntries, damageDealt, healingDone };
}

/**
 * Execute a hero's special ability
 */
export function executeHeroAbility(
  state: CombatState,
  heroId: string,
  partyStats: Record<string, HeroStats>,
  targetId?: string
): UseAbilityResult {
  const heroState = state.heroStates[heroId];
  if (!heroState) {
    return { success: false, logEntries: [], stateUpdates: {}, error: 'Hero not in combat' };
  }

  // Check if ability can be used
  const { canUse, reason } = canUseAbility(heroState, heroId);
  if (!canUse) {
    return { success: false, logEntries: [], stateUpdates: {}, error: reason };
  }

  const ability = getHeroAbility(heroId)!;
  const heroStats = partyStats[heroId];
  const heroDef = getHeroById(heroId);
  const heroName = heroDef?.name || heroId;

  // Create mutable copies
  const updatedHeroStates = { ...state.heroStates };
  for (const id of Object.keys(updatedHeroStates)) {
    updatedHeroStates[id] = { ...updatedHeroStates[id], statusEffects: [...updatedHeroStates[id].statusEffects] };
  }
  const updatedEnemies = state.enemies.map((e) => ({ ...e, statusEffects: [...e.statusEffects] }));

  const allLogEntries: CombatLogEntry[] = [];
  let totalDamageDealt = 0;

  // Log ability activation
  allLogEntries.push({
    timestamp: Date.now(),
    type: 'skill',
    source: heroName,
    target: '',
    message: `${heroName} uses ${ability.name}! "${ability.description.split('.')[0]}!"`,
  });

  // Apply each effect
  for (const effect of ability.effects) {
    const { logEntries, damageDealt } = applyAbilityEffect(
      effect,
      { heroId, attack: heroStats?.attack || 10 },
      updatedHeroStates,
      updatedEnemies,
      ability.targetType,
      targetId
    );
    allLogEntries.push(...logEntries);
    totalDamageDealt += damageDealt;
  }

  // Set cooldown
  updatedHeroStates[heroId] = {
    ...updatedHeroStates[heroId],
    skillCooldowns: {
      ...updatedHeroStates[heroId].skillCooldowns,
      [ability.id]: ability.cooldown,
    },
  };

  // Update limit break gauge from damage dealt
  const updatedLimitBreakGauge = updateLimitBreakGauge(state.limitBreakGauge, totalDamageDealt, 0);

  return {
    success: true,
    logEntries: allLogEntries,
    stateUpdates: {
      heroStates: updatedHeroStates,
      enemies: updatedEnemies,
      limitBreakGauge: updatedLimitBreakGauge,
    },
  };
}

// ===== Limit Break System =====

/**
 * Check if a limit break can be used
 */
export function canUseLimitBreak(
  state: CombatState,
  heroId: string
): { canUse: boolean; reason?: string } {
  // Check if limit gauge is full
  if (state.limitBreakGauge < LIMIT_BREAK_MAX) {
    return { canUse: false, reason: `Limit gauge not full (${Math.floor(state.limitBreakGauge)}%)` };
  }

  // Check if hero has a limit break
  if (!heroHasLimitBreak(heroId)) {
    return { canUse: false, reason: 'Hero has no limit break' };
  }

  // Check if hero is in combat and alive
  const heroState = state.heroStates[heroId];
  if (!heroState || !heroState.isAlive) {
    return { canUse: false, reason: 'Hero is not available' };
  }

  return { canUse: true };
}

/**
 * Execute a hero's limit break
 */
export function executeHeroLimitBreak(
  state: CombatState,
  heroId: string,
  partyStats: Record<string, HeroStats>
): UseAbilityResult {
  // Check if limit break can be used
  const { canUse, reason } = canUseLimitBreak(state, heroId);
  if (!canUse) {
    return { success: false, logEntries: [], stateUpdates: {}, error: reason };
  }

  const limitBreak = getHeroLimitBreak(heroId)!;
  const heroStats = partyStats[heroId];
  const heroDef = getHeroById(heroId);
  const heroName = heroDef?.name || heroId;

  // Create mutable copies
  const updatedHeroStates = { ...state.heroStates };
  for (const id of Object.keys(updatedHeroStates)) {
    updatedHeroStates[id] = { ...updatedHeroStates[id], statusEffects: [...updatedHeroStates[id].statusEffects] };
  }
  const updatedEnemies = state.enemies.map((e) => ({ ...e, statusEffects: [...e.statusEffects] }));

  const allLogEntries: CombatLogEntry[] = [];

  // Log limit break activation with dramatic message
  allLogEntries.push({
    timestamp: Date.now(),
    type: 'skill',
    source: heroName,
    target: '',
    message: `⚡ LIMIT BREAK! ${heroName} unleashes "${limitBreak.name}"! ⚡`,
  });

  // Apply each effect
  for (const effect of limitBreak.effects) {
    // For limit breaks, also apply healing effects to party
    if (effect.type === 'heal') {
      const { logEntries } = applyAbilityEffect(
        effect,
        { heroId, attack: heroStats?.attack || 10 },
        updatedHeroStates,
        updatedEnemies,
        'all_allies' // Heal always targets all allies for limit breaks
      );
      allLogEntries.push(...logEntries);
    } else {
      const { logEntries } = applyAbilityEffect(
        effect,
        { heroId, attack: (heroStats?.attack || 10) * 2 }, // Limit breaks deal extra damage
        updatedHeroStates,
        updatedEnemies,
        limitBreak.targetType
      );
      allLogEntries.push(...logEntries);
    }
  }

  // Reset limit break gauge to 0 after use
  const updatedLimitBreakGauge = 0;

  // Check for defeated enemies
  const allEnemiesDead = updatedEnemies.every((e) => !e.isAlive);
  if (allEnemiesDead) {
    allLogEntries.push({
      timestamp: Date.now(),
      type: 'victory',
      source: 'system',
      target: '',
      message: 'Victory! All enemies have been defeated!',
    });
  }

  return {
    success: true,
    logEntries: allLogEntries,
    stateUpdates: {
      heroStates: updatedHeroStates,
      enemies: updatedEnemies,
      limitBreakGauge: updatedLimitBreakGauge,
    },
  };
}

/**
 * Get ability cooldown remaining for a hero
 */
export function getAbilityCooldown(heroState: HeroCombatState, heroId: string): number {
  const ability = getHeroAbility(heroId);
  if (!ability) return 0;
  return heroState.skillCooldowns[ability.id] || 0;
}

/**
 * Check if hero has ability available (off cooldown and alive)
 */
export function isAbilityReady(heroState: HeroCombatState, heroId: string): boolean {
  const { canUse } = canUseAbility(heroState, heroId);
  return canUse;
}

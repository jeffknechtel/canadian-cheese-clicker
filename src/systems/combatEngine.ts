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
  DamageType,
} from '../types/game';
import { scaleEnemyStats } from '../data/enemies';
import { getHeroAbility, getHeroLimitBreak, heroHasLimitBreak } from '../data/heroes';
import { heroRegistry, zoneRegistry, getAnyEnemy, enemyRegistry, bossRegistry } from '../domain';
import { calculateHeroStats } from './productionEngine';
import {
  ATB_MAX,
  BASE_ATB_RATE,
  LIMIT_BREAK_MAX,
  LIMIT_BREAK_GAIN_FROM_DEALT,
  LIMIT_BREAK_GAIN_FROM_TAKEN,
  HP_LOW_THRESHOLD,
  HP_MEDIUM_THRESHOLD,
  DEFENSE_DIVISOR,
  DAMAGE_VARIANCE_MIN,
  DAMAGE_VARIANCE_MAX,
  INITIAL_ATB_VARIANCE,
  BOSS_PHASE_HEAL_PERCENT,
  BOSS_REWARD_MULTIPLIERS,
  WEAKNESS_DAMAGE_MULTIPLIER,
  RESISTANCE_DAMAGE_MULTIPLIER,
  DEFAULT_BOSS_REWARD_MULTIPLIER,
} from '../data/constants';
import { Stats } from '../domain/valueObjects';

// Re-export constants for UI components and Battle aggregate
export {
  ATB_MAX,
  LIMIT_BREAK_MAX,
  HP_LOW_THRESHOLD,
  HP_MEDIUM_THRESHOLD,
  BOSS_PHASE_HEAL_PERCENT,
};

// ===== ATB Calculations =====

/**
 * Calculate ATB fill rate based on speed stat and combat speed multiplier
 * Higher speed = faster ATB fill (internal helper)
 */
function calculateAtbFillRate(speed: number, combatSpeed: 1 | 2 | 4): number {
  // Base rate modified by speed stat and combat speed setting
  // At speed 0, fills at base rate. Higher speed = faster fill.
  return BASE_ATB_RATE * (1 + speed / 100) * combatSpeed;
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
 * - Element multiplier: 1.5x on weakness, 0.5x on resistance
 */
export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  skillMultiplier: number = 1.0,
  damageType?: DamageType,
  defenderWeakness?: DamageType,
  defenderResistance?: DamageType
): { damage: number; elementResult: 'weak' | 'resist' | 'normal' } {
  const baseDamage = attackerAttack * skillMultiplier;
  const defenseFactor = 1 - defenderDefense / (defenderDefense + DEFENSE_DIVISOR);
  const variance = DAMAGE_VARIANCE_MIN + Math.random() * (DAMAGE_VARIANCE_MAX - DAMAGE_VARIANCE_MIN);

  // Calculate elemental multiplier
  let elementMultiplier = 1;
  let elementResult: 'weak' | 'resist' | 'normal' = 'normal';

  if (damageType && defenderWeakness && damageType === defenderWeakness) {
    elementMultiplier = WEAKNESS_DAMAGE_MULTIPLIER;
    elementResult = 'weak';
  } else if (damageType && defenderResistance && damageType === defenderResistance) {
    elementMultiplier = RESISTANCE_DAMAGE_MULTIPLIER;
    elementResult = 'resist';
  }

  const damage = Math.max(1, Math.floor(baseDamage * defenseFactor * variance * elementMultiplier));
  return { damage, elementResult };
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
 * Heroes with active taunt effects are prioritized
 */
export function selectHeroTarget(
  heroStates: Record<string, HeroCombatState>,
  targetType: 'random' | 'lowest_hp' | 'highest_hp' = 'random'
): HeroCombatState | null {
  const aliveHeroes = Object.values(heroStates).filter((h) => h.isAlive);
  if (aliveHeroes.length === 0) return null;

  // Check for heroes with active taunt - they take priority
  const tauntingHeroes = aliveHeroes.filter((h) =>
    h.statusEffects.some((e) => e.stat === 'taunt' && e.value > 0)
  );

  if (tauntingHeroes.length > 0) {
    // If multiple heroes have taunt, pick randomly among them
    return tauntingHeroes[Math.floor(Math.random() * tauntingHeroes.length)];
  }

  // Fall back to normal targeting
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
 * Returns updated status effects with decremented durations (immutable - original array not modified)
 */
export function processStatusEffects(
  currentHp: number,
  maxHp: number,
  statusEffects: StatusEffect[]
): { newHp: number; damage: number; healing: number; expiredEffects: string[]; updatedEffects: StatusEffect[] } {
  let damage = 0;
  let healing = 0;
  const expiredEffects: string[] = [];
  const updatedEffects: StatusEffect[] = [];

  for (const effect of statusEffects) {
    if (effect.stat === 'damageOverTime') {
      damage += effect.value;
    } else if (effect.stat === 'healOverTime') {
      healing += effect.value;
    }

    // Create new object with decremented duration (immutable)
    const updated = { ...effect, duration: effect.duration - 1 };

    if (updated.duration <= 0) {
      expiredEffects.push(effect.id);
    } else {
      updatedEffects.push(updated);
    }
  }

  const newHp = Math.min(maxHp, Math.max(0, currentHp - damage + healing));
  return { newHp, damage, healing, expiredEffects, updatedEffects };
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
          type: 'phaseChange',
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
  let stats = Stats.of(bossDef.stats);

  for (const phase of bossDef.phases) {
    if (enemy.phaseTriggered?.[phase.phaseNumber] && phase.statModifiers) {
      stats = stats.add(phase.statModifiers);
    }
  }

  return stats.toHeroStats();
}

/**
 * Get all available abilities for a boss in their current phase
 */
export function getBossCurrentAbilities(
  enemy: CombatEnemy,
  bossDef: BossDefinition
): typeof bossDef.abilities {
  if (!enemy.isBoss || !enemy.currentPhase) {
    return bossDef.abilities;
  }

  // Start with base abilities
  const abilities = [...bossDef.abilities];

  // Add abilities from all triggered phases
  for (const phase of bossDef.phases) {
    if (enemy.phaseTriggered?.[phase.phaseNumber] && phase.newAbilities) {
      abilities.push(...phase.newAbilities);
    }
  }

  return abilities;
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

  // Boss heals a small amount on phase transition
  const healAmount = Math.floor(enemy.maxHp * BOSS_PHASE_HEAL_PERCENT);
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

// ===== Combat Initialization =====

/**
 * Create initial combat state for a hero (internal helper)
 */
function createHeroCombatState(
  heroId: string,
  heroState: HeroState,
  heroBuffTotals?: Partial<Record<keyof HeroStats, number>>
): HeroCombatState {
  const baseStats = calculateHeroStats(heroId, heroState);

  // Apply cheese heroBuffs as flat adds (party-wide)
  const hp = baseStats.hp + (heroBuffTotals?.hp ?? 0);

  return {
    heroId,
    currentHp: hp,
    maxHp: hp,
    atbGauge: 0,
    isAlive: true,
    statusEffects: [],
    abilityCooldowns: {},
  };
}

/**
 * Create initial combat state for an enemy (internal helper)
 */
function createCombatEnemy(
  enemy: EnemyDefinition,
  instanceIndex: number
): CombatEnemy {
  const isBoss = enemy.type === 'boss';

  return {
    id: enemy.id,
    instanceId: `${enemy.id}_${instanceIndex}_${Date.now()}`,
    currentHp: enemy.stats.hp,
    maxHp: enemy.stats.hp,
    atbGauge: Math.random() * INITIAL_ATB_VARIANCE, // Start with 0-20% ATB for variety
    isAlive: true,
    statusEffects: [],
    abilityCooldowns: {},
    // Boss-specific fields
    isBoss,
    currentPhase: isBoss ? 1 : undefined,
    phaseTriggered: isBoss ? { 1: true } : undefined,
    // Persist scaled stats at combat init (includes stage scaling)
    scaledStats: {
      attack: enemy.stats.attack,
      defense: enemy.stats.defense,
      speed: enemy.stats.speed,
    },
    scaledRewards: {
      xpReward: enemy.xpReward,
      curdReward: enemy.curdReward,
    },
    // Copy elemental affinities from enemy definition
    weakness: enemy.weakness,
    resistance: enemy.resistance,
  };
}

/**
 * Initialize combat for a zone and stage
 */
export function initializeCombat(
  zoneId: string,
  stageNumber: number,
  heroes: Record<string, HeroState>,
  party: PartyFormation,
  heroBuffTotals?: Partial<Record<keyof HeroStats, number>>
): CombatState | null {
  const zone = zoneRegistry.get(zoneId);
  if (!zone) return null;

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
      heroStates[heroId] = createHeroCombatState(heroId, heroState, heroBuffTotals);
    }
  }

  // Initialize enemies
  const enemies: CombatEnemy[] = [];
  const isBossStageNumber = stageNumber === zone.bossStage.stageNumber;

  if (isBossStageNumber) {
    const boss = bossRegistry.get(zone.bossStage.bossId);
    if (boss) {
      enemies.push(createCombatEnemy(boss, 0));
    }
  } else {
    const stage = zone.stages.find((s) => s.stageNumber === stageNumber);
    if (!stage) return null;
    stage.enemies.forEach((enemyId, index) => {
      const enemy = enemyRegistry.get(enemyId);
      if (enemy) {
        const enemyDef = enemy.toJSON();
        const scaledEnemy = scaleEnemyStats(enemyDef, stage.enemyLevelScale);
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
    // Filled by startCombat with the canonical getPartyStats() snapshot
    partyStats: {},
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
    feedback: {
      damageNumbers: [],
      comboCount: 0,
      maxCombo: 0,
      isFlashing: false,
      flashColor: null,
      shakeIntensity: null,
    },
  };
}

// ===== Combat Rewards =====

/**
 * Calculate rewards for completing a battle
 * Boss battles provide enhanced rewards including:
 * - Multiplied curds based on boss difficulty
 * - Bonus XP for party members
 * - Whey currency (boss-only)
 * - Guaranteed drops from boss loot tables
 *
 * @param heroStates - Optional hero states to check for drop rate bonuses
 * @param cpsFloor - Minimum curd reward (seconds of CPS) so battles always pay
 * @param legacyProvinceMultiplier - Bonus multiplier when the battle's province holds legacy points
 */
export function calculateCombatRewards(
  enemies: CombatEnemy[],
  partyHeroIds: string[],
  isBoss: boolean,
  heroStates?: Record<string, HeroCombatState>,
  cpsFloor: Decimal = new Decimal(0),
  legacyProvinceMultiplier: number = 1
): CombatRewards {
  let totalCurds = new Decimal(0);
  let totalXp = 0;
  const drops: CombatDrop[] = [];
  let bossMultiplier = DEFAULT_BOSS_REWARD_MULTIPLIER;

  // Calculate drop rate bonus from party status effects
  let dropRateBonus = 0;
  if (heroStates) {
    for (const hero of Object.values(heroStates)) {
      const dropBuff = hero.statusEffects.find(
        (e) => e.stat === 'dropRate' && e.duration > 0
      );
      if (dropBuff && typeof dropBuff.value === 'number') {
        dropRateBonus += dropBuff.value;
      }
    }
  }
  const dropMultiplier = 1 + dropRateBonus / 100;

  for (const enemy of enemies) {
    const enemyDef = getAnyEnemy(enemy.id);
    if (!enemyDef) continue;

    // Check if this enemy is a boss and get their multiplier
    if (enemy.isBoss && BOSS_REWARD_MULTIPLIERS[enemy.id]) {
      bossMultiplier = BOSS_REWARD_MULTIPLIERS[enemy.id];
    }

    // Use scaled rewards from enemy (includes stage scaling), not unscaled registry
    totalCurds = totalCurds.plus(enemy.scaledRewards.curdReward);
    totalXp += enemy.scaledRewards.xpReward;

    // Roll for drops - bosses have guaranteed drops for items with chance >= 0.5
    // Apply drop rate bonus to improve chances
    for (const drop of enemyDef.drops) {
      const baseChance = enemy.isBoss && drop.chance >= 0.5 ? 1.0 : drop.chance;
      const effectiveChance = Math.min(1.0, baseChance * dropMultiplier);

      if (Math.random() < effectiveChance) {
        const quantity = drop.minQuantity && drop.maxQuantity
          ? Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity
          : 1;

        // Boss drops give bonus quantity, drop rate bonus also adds quantity
        let bonusQuantity = enemy.isBoss ? Math.ceil(quantity * 1.5) : quantity;
        if (dropRateBonus > 0) {
          bonusQuantity = Math.ceil(bonusQuantity * dropMultiplier);
        }

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

  // Apply CPS floor so battles always pay proportionally to player's economy
  // Floor is applied AFTER boss multipliers so the boost is visible
  totalCurds = Decimal.max(totalCurds, cpsFloor);

  // Legacy province bonus multiplies the floored value (whey derives from it too)
  if (legacyProvinceMultiplier !== 1) {
    totalCurds = totalCurds.mul(legacyProvinceMultiplier);
  }

  // Distribute XP among party members
  const xpPerHero = Math.floor(totalXp / partyHeroIds.length);
  const xpDistribution: Record<string, number> = {};
  for (const heroId of partyHeroIds) {
    xpDistribution[heroId] = xpPerHero;
  }

  // Boss battles give whey as bonus (percentage of curds)
  // Whey derives from floored curds → boss whey scales with the economy too
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
 * Check if the stage is a boss stage
 */
export function isBossStage(zoneId: string, stageNumber: number): boolean {
  const zone = zoneRegistry.get(zoneId);
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
  const cooldownRemaining = heroState.abilityCooldowns[ability.id] || 0;
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
  const heroDef = heroRegistry.get(source.heroId);
  const heroName = heroDef?.name || source.heroId;

  switch (effect.type) {
    case 'damage': {
      // Apply damage to enemies
      const targets = targetType === 'allEnemies'
        ? targetEnemies.filter((e) => e.isAlive)
        : specificTargetId
          ? targetEnemies.filter((e) => e.instanceId === specificTargetId && e.isAlive)
          : [selectEnemyTarget(targetEnemies)].filter((e): e is CombatEnemy => e !== null);

      for (const enemy of targets) {
        const enemyDef = getAnyEnemy(enemy.id);
        // Get weakness/resistance from the enemy definition
        const { damage, elementResult } = calculateDamage(
          source.attack,
          enemy.scaledStats.defense,
          effect.multiplier,
          effect.damageType,
          enemyDef?.weakness,
          enemyDef?.resistance
        );
        enemy.currentHp = applyDamage(enemy.currentHp, damage);
        damageDealt += damage;

        const elementSuffix = elementResult === 'weak' ? ' (weak!)' : elementResult === 'resist' ? ' (resisted)' : '';
        logEntries.push({
          timestamp: Date.now(),
          type: 'ability',
          source: heroName,
          target: enemyDef?.name || enemy.id,
          value: damage,
          message: `${heroName}'s ability hits ${enemyDef?.name || enemy.id} for ${damage} damage${elementSuffix}!`,
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
      const allyTargets = targetType === 'allAllies'
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

        const allyDef = heroRegistry.get(ally.heroId);
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
      const buffTargets = targetType === 'allAllies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of buffTargets) {
        const statusEffect: StatusEffect = {
          // Include the target's identity — Date.now() alone collides for every
          // ally buffed in the same synchronous loop
          id: `${effect.stat}_buff_${Date.now()}_${ally.heroId}`,
          type: 'buff',
          stat: effect.stat as StatusEffect['stat'],
          value: effect.value,
          duration: effect.duration,
          source: source.heroId,
        };
        ally.statusEffects.push(statusEffect);

        const allyDef = heroRegistry.get(ally.heroId);
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
      const debuffTargets = targetType === 'allEnemies'
        ? targetEnemies.filter((e) => e.isAlive)
        : specificTargetId
          ? targetEnemies.filter((e) => e.instanceId === specificTargetId && e.isAlive)
          : [selectEnemyTarget(targetEnemies)].filter((e): e is CombatEnemy => e !== null);

      for (const enemy of debuffTargets) {
        const statusEffect: StatusEffect = {
          id: `${effect.stat}_debuff_${Date.now()}_${enemy.instanceId}`,
          type: 'debuff',
          stat: effect.stat as StatusEffect['stat'],
          value: effect.value,
          duration: effect.duration,
          source: source.heroId,
        };
        enemy.statusEffects.push(statusEffect);

        const enemyDef = getAnyEnemy(enemy.id);
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
          stat: 'taunt',
          value: 1, // Indicates active taunt
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
      if (!effect.immunityType) break;

      // Apply immunity to allies
      const immunityTargets = targetType === 'allAllies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of immunityTargets) {
        const statusEffect: StatusEffect = {
          id: `immunity_${effect.immunityType}_${Date.now()}_${ally.heroId}`,
          type: 'immunity',
          stat: effect.immunityType as StatusEffect['stat'], // The debuff type this grants immunity to
          value: 1, // Binary: immune or not
          duration: effect.duration,
          source: source.heroId,
        };
        ally.statusEffects.push(statusEffect);

        const allyDef = heroRegistry.get(ally.heroId);
        logEntries.push({
          timestamp: Date.now(),
          type: 'status',
          source: heroName,
          target: allyDef?.name || ally.heroId,
          message: `${allyDef?.name || ally.heroId} is immune to ${effect.immunityType} for ${effect.duration} turns!`,
        });
      }
      break;
    }

    case 'dropRateBonus': {
      // Store as a status effect on party members so calculateCombatRewards can find it
      const party = Object.values(targetHeroStates).filter((h) => h.isAlive);

      for (const hero of party) {
        const statusEffect: StatusEffect = {
          id: `droprate_${Date.now()}_${hero.heroId}`,
          type: 'buff',
          stat: 'dropRate',
          value: effect.value,
          duration: effect.duration,
          source: source.heroId,
        };
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

    case 'cleanse': {
      // Remove all debuffs from allies
      const cleanseTargets = targetType === 'allAllies'
        ? Object.values(targetHeroStates).filter((h) => h.isAlive)
        : targetType === 'self'
          ? [targetHeroStates[source.heroId]].filter((h) => h?.isAlive)
          : [];

      for (const ally of cleanseTargets) {
        const debuffCount = ally.statusEffects.filter((e) => e.type === 'debuff').length;
        ally.statusEffects = ally.statusEffects.filter((e) => e.type !== 'debuff');

        if (debuffCount > 0) {
          const allyDef = heroRegistry.get(ally.heroId);
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
  const heroDef = heroRegistry.get(heroId);
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
    type: 'ability',
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
    abilityCooldowns: {
      ...updatedHeroStates[heroId].abilityCooldowns,
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
  const heroDef = heroRegistry.get(heroId);
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
    type: 'ability',
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
        'allAllies' // Heal always targets all allies for limit breaks
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
  return heroState.abilityCooldowns[ability.id] || 0;
}

/**
 * Check if hero has ability available (off cooldown and alive)
 */
export function isAbilityReady(heroState: HeroCombatState, heroId: string): boolean {
  const { canUse } = canUseAbility(heroState, heroId);
  return canUse;
}

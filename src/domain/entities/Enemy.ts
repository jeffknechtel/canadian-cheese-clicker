import Decimal from 'decimal.js';
import type {
  EnemyDefinition,
  EnemyType,
  EnemySkill,
  EnemyDrop,
  HeroStats,
  DamageType,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Enemy.
 * Encapsulates combat behavior, skill selection, and drop calculation.
 */
export class Enemy extends BaseEntity<EnemyDefinition> implements EnemyDefinition {
  get name(): string {
    return this.data.name;
  }
  get type(): EnemyType {
    return this.data.type;
  }
  get description(): string {
    return this.data.description;
  }
  get stats(): HeroStats {
    return this.data.stats;
  }
  get weakness(): DamageType | undefined {
    return this.data.weakness;
  }
  get resistance(): DamageType | undefined {
    return this.data.resistance;
  }
  get skills(): EnemySkill[] {
    return this.data.skills;
  }
  get drops(): EnemyDrop[] {
    return this.data.drops;
  }
  get curdReward(): Decimal {
    return this.data.curdReward;
  }
  get xpReward(): number {
    return this.data.xpReward;
  }
  get icon(): string {
    return this.data.icon;
  }

  protected withData(updates: Partial<EnemyDefinition>): this {
    return new Enemy({ ...this.data, ...updates }) as this;
  }

  /**
   * Get scaled stats for a zone level.
   */
  getScaledStats(zoneLevel: number): HeroStats {
    const scaleFactor = 1 + (zoneLevel - 1) * 0.15;
    return {
      hp: Math.floor(this.stats.hp * scaleFactor),
      attack: Math.floor(this.stats.attack * scaleFactor),
      defense: Math.floor(this.stats.defense * scaleFactor),
      speed: this.stats.speed,
      cheeseAffinity: this.stats.cheeseAffinity,
    };
  }

  /**
   * Select a skill to use based on AI logic.
   * Returns the first available skill (can be extended for smarter AI).
   */
  selectSkill(cooldowns: Record<string, number>): EnemySkill | null {
    for (const skill of this.skills) {
      const cooldown = cooldowns[skill.id] ?? 0;
      if (cooldown <= 0) {
        return skill;
      }
    }
    return null;
  }

  /**
   * Calculate damage dealt to a target.
   */
  calculateDamage(targetDefense: number): number {
    const baseDamage = this.stats.attack;
    const mitigation = targetDefense / (targetDefense + 100);
    return Math.max(1, Math.floor(baseDamage * (1 - mitigation)));
  }

  /**
   * Get scaled rewards for a zone level.
   */
  getScaledRewards(zoneLevel: number): { curds: Decimal; xp: number } {
    const scaleFactor = 1 + (zoneLevel - 1) * 0.1;
    return {
      curds: this.curdReward.mul(scaleFactor).floor(),
      xp: Math.floor(this.xpReward * scaleFactor),
    };
  }

  /**
   * Check if this enemy is a boss type.
   */
  isBoss(): boolean {
    return this.type === 'boss';
  }

  static fromDefinition(data: EnemyDefinition): Enemy {
    return new Enemy(data);
  }
}

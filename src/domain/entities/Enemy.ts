import Decimal from 'decimal.js';
import type {
  EnemyDefinition,
  EnemyType,
  EnemyAbility,
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
  get abilities(): EnemyAbility[] {
    return this.data.abilities;
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

  static fromDefinition(data: EnemyDefinition): Enemy {
    return new Enemy(data);
  }
}

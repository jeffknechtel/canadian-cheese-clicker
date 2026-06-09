import Decimal from 'decimal.js';
import type {
  Equipment as EquipmentData,
  EquipmentSlot,
  EquipmentRarity,
  HeroStats,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Equipment.
 * Encapsulates stat bonuses and slot compatibility.
 */
export class Equipment extends BaseEntity<EquipmentData> implements EquipmentData {
  get name(): string {
    return this.data.name;
  }
  get description(): string {
    return this.data.description;
  }
  get slot(): EquipmentSlot {
    return this.data.slot;
  }
  get rarity(): EquipmentRarity {
    return this.data.rarity;
  }
  get stats(): Partial<HeroStats> {
    return this.data.stats;
  }
  get cost(): Decimal {
    return this.data.cost;
  }
  get icon(): string {
    return this.data.icon;
  }

  /**
   * Get stat bonus for a specific stat.
   */
  getStatBonus(stat: keyof HeroStats): number {
    return this.stats[stat] ?? 0;
  }

  /**
   * Apply this equipment's stats to base stats.
   */
  applyTo(baseStats: HeroStats): HeroStats {
    return {
      hp: baseStats.hp + this.getStatBonus('hp'),
      attack: baseStats.attack + this.getStatBonus('attack'),
      defense: baseStats.defense + this.getStatBonus('defense'),
      speed: baseStats.speed + this.getStatBonus('speed'),
      cheeseAffinity: baseStats.cheeseAffinity + this.getStatBonus('cheeseAffinity'),
    };
  }

  static fromDefinition(data: EquipmentData): Equipment {
    return new Equipment(data);
  }
}

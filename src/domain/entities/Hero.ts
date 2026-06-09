import Decimal from 'decimal.js';
import type {
  HeroDefinition,
  HeroStats,
  HeroState,
  HeroClass,
  Province,
} from '../../types/game';
import { BaseEntity } from './BaseEntity';
import { equipmentRegistry } from '../registry/equipment';

/**
 * Rich domain model for Hero definition.
 * Encapsulates stat calculation, XP progression, and ability logic.
 */
export class Hero extends BaseEntity<HeroDefinition> implements HeroDefinition {
  get name(): string {
    return this.data.name;
  }
  get title(): string {
    return this.data.title;
  }
  get class(): HeroClass {
    return this.data.class;
  }
  get province(): Province {
    return this.data.province;
  }
  get description(): string {
    return this.data.description;
  }
  get abilityFlavor(): { name: string; description: string } {
    return this.data.abilityFlavor;
  }
  get baseStats(): HeroStats {
    return this.data.baseStats;
  }
  get statGrowth(): HeroStats {
    return this.data.statGrowth;
  }
  get recruitCost(): Decimal {
    return this.data.recruitCost;
  }
  get icon(): string {
    return this.data.icon;
  }

  /**
   * Calculate stats at a given level (without equipment).
   */
  getStatsAtLevel(level: number): HeroStats {
    const levelBonus = Math.max(0, level - 1);
    return {
      hp: this.baseStats.hp + this.statGrowth.hp * levelBonus,
      attack: this.baseStats.attack + this.statGrowth.attack * levelBonus,
      defense: this.baseStats.defense + this.statGrowth.defense * levelBonus,
      speed: this.baseStats.speed + this.statGrowth.speed * levelBonus,
      cheeseAffinity: this.baseStats.cheeseAffinity + this.statGrowth.cheeseAffinity * levelBonus,
    };
  }

  /**
   * Calculate full stats including equipment.
   */
  getFullStats(heroState: HeroState): HeroStats {
    let stats = this.getStatsAtLevel(heroState.level);

    for (const equipmentId of Object.values(heroState.equipment)) {
      if (equipmentId) {
        const equipment = equipmentRegistry.get(equipmentId);
        if (equipment) {
          stats = equipment.applyTo(stats);
        }
      }
    }

    return stats;
  }

  static fromDefinition(data: HeroDefinition): Hero {
    return new Hero(data);
  }
}

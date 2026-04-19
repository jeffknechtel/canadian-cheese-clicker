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
import { HERO_XP_BASE, HERO_XP_MULTIPLIER, HERO_MAX_LEVEL } from '../../data/heroes';

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
  get specialAbility(): { name: string; description: string } {
    return this.data.specialAbility;
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

  protected withData(updates: Partial<HeroDefinition>): this {
    return new Hero({ ...this.data, ...updates }) as this;
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

  /**
   * Calculate XP required for next level.
   */
  static getXpForLevel(level: number): number {
    return Math.floor(HERO_XP_BASE * Math.pow(HERO_XP_MULTIPLIER, level - 1));
  }

  /**
   * Check if hero can level up with current XP.
   */
  canLevelUp(heroState: HeroState): boolean {
    if (heroState.level >= HERO_MAX_LEVEL) return false;
    return heroState.xp >= heroState.xpToNextLevel;
  }

  /**
   * Get CPS contribution from this hero's cheese affinity.
   */
  getCpsContribution(heroState: HeroState): number {
    const stats = this.getFullStats(heroState);
    return stats.cheeseAffinity / 100; // Convert to percentage
  }

  /**
   * Check if player can afford to recruit this hero.
   */
  canRecruit(curds: Decimal): boolean {
    return curds.gte(this.recruitCost);
  }

  /**
   * Get class role description for UI.
   */
  getRoleDescription(): string {
    switch (this.class) {
      case 'tank':
        return 'Absorbs damage and protects allies';
      case 'dps':
        return 'Deals high damage to enemies';
      case 'support':
        return 'Buffs allies and debuffs enemies';
      case 'healer':
        return 'Restores HP to allies';
    }
  }

  static fromDefinition(data: HeroDefinition): Hero {
    return new Hero(data);
  }
}

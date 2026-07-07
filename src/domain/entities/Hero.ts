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
import { Stats } from '../valueObjects';
import { getXpForLevel, HERO_MAX_LEVEL } from '../../data/heroes';

/**
 * Result of processing XP gain for a hero.
 */
export interface XpGainResult {
  /** New XP value (after subtracting level-up thresholds) */
  xp: number;
  /** New level */
  level: number;
  /** XP needed for next level (0 if max level) */
  xpToNextLevel: number;
  /** Levels gained during this XP application */
  levelsGained: number[];
}

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
    return Stats.of(this.baseStats).addScaled(this.statGrowth, levelBonus).toHeroStats();
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
   * Process XP gain for a hero state, handling level-ups.
   * Pure function - returns new state values without mutation.
   */
  static processXpGain(
    currentXp: number,
    currentLevel: number,
    currentXpToNextLevel: number,
    xpAmount: number
  ): XpGainResult {
    if (currentLevel >= HERO_MAX_LEVEL) {
      return {
        xp: 0,
        level: currentLevel,
        xpToNextLevel: 0,
        levelsGained: [],
      };
    }

    const levelsGained: number[] = [];
    let xp = currentXp + xpAmount;
    let level = currentLevel;
    let xpToNextLevel = currentXpToNextLevel;

    while (xp >= xpToNextLevel && level < HERO_MAX_LEVEL) {
      xp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = getXpForLevel(level);
      levelsGained.push(level);
    }

    if (level >= HERO_MAX_LEVEL) {
      xp = 0;
      xpToNextLevel = 0;
    }

    return { xp, level, xpToNextLevel, levelsGained };
  }

  static fromDefinition(data: HeroDefinition): Hero {
    return new Hero(data);
  }
}

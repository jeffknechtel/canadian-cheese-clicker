import type { HeroStats } from '../../types/game';

/**
 * Stats value object - immutable wrapper for HeroStats operations.
 * All operations return new Stats instances.
 */
export class Stats {
  readonly #data: Readonly<HeroStats>;

  private constructor(data: HeroStats) {
    this.#data = data;
  }

  /**
   * Create Stats from a HeroStats object.
   */
  static of(stats: HeroStats): Stats {
    return new Stats({ ...stats });
  }

  /**
   * Create zero stats (identity for addition).
   */
  static zero(): Stats {
    return new Stats({ hp: 0, attack: 0, defense: 0, speed: 0, cheeseAffinity: 0 });
  }

  /** Get the underlying HeroStats object (new copy). */
  toHeroStats(): HeroStats {
    return { ...this.#data };
  }

  /** Get a specific stat value. */
  get(stat: keyof HeroStats): number {
    return this.#data[stat];
  }

  /**
   * Add another Stats or partial HeroStats to this one.
   */
  add(other: Stats | Partial<HeroStats>): Stats {
    const otherData = other instanceof Stats ? other.#data : other;
    return new Stats({
      hp: this.#data.hp + (otherData.hp ?? 0),
      attack: this.#data.attack + (otherData.attack ?? 0),
      defense: this.#data.defense + (otherData.defense ?? 0),
      speed: this.#data.speed + (otherData.speed ?? 0),
      cheeseAffinity: this.#data.cheeseAffinity + (otherData.cheeseAffinity ?? 0),
    });
  }

  /**
   * Scale all stats by a factor.
   */
  scale(factor: number): Stats {
    return new Stats({
      hp: Math.floor(this.#data.hp * factor),
      attack: Math.floor(this.#data.attack * factor),
      defense: Math.floor(this.#data.defense * factor),
      speed: Math.floor(this.#data.speed * factor),
      cheeseAffinity: Math.floor(this.#data.cheeseAffinity * factor),
    });
  }

  /**
   * Add scaled stats: this + (other * scale).
   * Useful for level-up calculations: base + growth * levelBonus.
   */
  addScaled(other: Stats | HeroStats, scale: number): Stats {
    const otherData = other instanceof Stats ? other.#data : other;
    return new Stats({
      hp: this.#data.hp + otherData.hp * scale,
      attack: this.#data.attack + otherData.attack * scale,
      defense: this.#data.defense + otherData.defense * scale,
      speed: this.#data.speed + otherData.speed * scale,
      cheeseAffinity: this.#data.cheeseAffinity + otherData.cheeseAffinity * scale,
    });
  }

  /**
   * Apply a floor to all stats (e.g., after scaling).
   */
  floor(): Stats {
    return new Stats({
      hp: Math.floor(this.#data.hp),
      attack: Math.floor(this.#data.attack),
      defense: Math.floor(this.#data.defense),
      speed: Math.floor(this.#data.speed),
      cheeseAffinity: Math.floor(this.#data.cheeseAffinity),
    });
  }

  /**
   * Ensure all stats are at least a minimum value.
   */
  min(minValue: number): Stats {
    return new Stats({
      hp: Math.max(minValue, this.#data.hp),
      attack: Math.max(minValue, this.#data.attack),
      defense: Math.max(minValue, this.#data.defense),
      speed: Math.max(minValue, this.#data.speed),
      cheeseAffinity: Math.max(minValue, this.#data.cheeseAffinity),
    });
  }
}

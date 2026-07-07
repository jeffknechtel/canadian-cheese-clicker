import { HP_LOW_THRESHOLD, HP_MEDIUM_THRESHOLD } from '../../data/constants';

/**
 * Health tier for display and accessibility.
 */
export type HealthTier = 'critical' | 'low' | 'normal';

/**
 * HitPoints value object - encapsulates HP semantics.
 * Immutable. All operations return new HitPoints instances.
 */
export class HitPoints {
  readonly #current: number;
  readonly #max: number;

  private constructor(current: number, max: number) {
    this.#current = current;
    this.#max = max;
  }

  /**
   * Create HitPoints from current and max values.
   * Current is clamped to [0, max].
   */
  static of(current: number, max: number): HitPoints {
    return new HitPoints(Math.max(0, Math.min(max, current)), max);
  }

  /**
   * Create HitPoints at full health.
   */
  static full(max: number): HitPoints {
    return new HitPoints(max, max);
  }

  /** Current HP value */
  current(): number {
    return this.#current;
  }

  /** Maximum HP value */
  max(): number {
    return this.#max;
  }

  /**
   * Apply damage, returning new HitPoints.
   * HP cannot go below 0.
   */
  damage(amount: number): HitPoints {
    return new HitPoints(Math.max(0, this.#current - amount), this.#max);
  }

  /**
   * Apply healing, returning new HitPoints.
   * HP cannot exceed max.
   */
  heal(amount: number): HitPoints {
    return new HitPoints(Math.min(this.#max, this.#current + amount), this.#max);
  }

  /**
   * Heal by percentage of max HP.
   */
  healPercent(percent: number): HitPoints {
    const amount = Math.floor(this.#max * (percent / 100));
    return this.heal(amount);
  }

  /**
   * Check if still alive (HP > 0).
   */
  isAlive(): boolean {
    return this.#current > 0;
  }

  /**
   * Check if at full HP.
   */
  isFull(): boolean {
    return this.#current >= this.#max;
  }

  /**
   * HP as percentage (0-100).
   */
  percent(): number {
    if (this.#max === 0) return 0;
    return (this.#current / this.#max) * 100;
  }

  /**
   * Amount that can be healed before reaching max.
   */
  healableAmount(): number {
    return this.#max - this.#current;
  }

  /**
   * Health tier for display purposes.
   */
  tier(): HealthTier {
    const pct = this.percent();
    if (pct < HP_LOW_THRESHOLD) return 'critical';
    if (pct < HP_MEDIUM_THRESHOLD) return 'low';
    return 'normal';
  }

  /**
   * Serialize to plain object for storage/display.
   */
  toJSON(): { currentHp: number; maxHp: number } {
    return { currentHp: this.#current, maxHp: this.#max };
  }
}

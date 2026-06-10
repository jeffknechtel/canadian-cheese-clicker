import {
  CHEESE_SELL_QUALITY_BASE,
  CHEESE_SELL_QUALITY_SCALE,
  BUFF_QUALITY_BASE,
  BUFF_QUALITY_SCALE,
} from '../../data/constants';

/**
 * Quality value object - represents cheese quality bounded to [1, 100].
 * Immutable. All operations return new Quality instances.
 */
export class Quality {
  readonly #value: number;

  private constructor(value: number) {
    this.#value = value;
  }

  /**
   * Create a Quality from a raw number, clamping to [1, 100].
   */
  static of(raw: number): Quality {
    return new Quality(Math.max(1, Math.min(100, Math.round(raw))));
  }

  /**
   * Create a Quality that is already known to be valid (no clamping).
   * Use only when loading from validated storage.
   */
  static fromValid(value: number): Quality {
    return new Quality(value);
  }

  /** Raw numeric value (1-100) */
  toNumber(): number {
    return this.#value;
  }

  /**
   * Quality tier for display purposes.
   * Thresholds: 90+ exceptional, 70+ high, 50+ good, 30+ standard, <30 poor
   */
  toTier(): 'exceptional' | 'high' | 'good' | 'standard' | 'poor' {
    if (this.#value >= 90) return 'exceptional';
    if (this.#value >= 70) return 'high';
    if (this.#value >= 50) return 'good';
    if (this.#value >= 30) return 'standard';
    return 'poor';
  }

  /**
   * Tailwind color class for quality display.
   */
  toColorClass(): string {
    switch (this.toTier()) {
      case 'exceptional':
        return 'bg-purple-100 text-purple-700';
      case 'high':
        return 'bg-yellow-100 text-yellow-700';
      case 'good':
        return 'bg-green-100 text-green-700';
      case 'standard':
        return 'bg-blue-100 text-blue-700';
      case 'poor':
        return 'bg-gray-100 text-gray-700';
    }
  }

  /**
   * Sell value multiplier.
   * Range: ~0.515 (quality 1) to 2.0 (quality 100)
   */
  toSellMultiplier(): number {
    return CHEESE_SELL_QUALITY_BASE + (this.#value / 100) * CHEESE_SELL_QUALITY_SCALE;
  }

  /**
   * Buff effect scale.
   * Range: ~0.51 (quality 1) to 1.5 (quality 100)
   */
  toBuffScale(): number {
    return BUFF_QUALITY_BASE + (this.#value / 100) * BUFF_QUALITY_SCALE;
  }

  /**
   * Add a bonus to quality, returning a new clamped Quality.
   */
  addBonus(bonus: number): Quality {
    return Quality.of(this.#value + bonus);
  }
}

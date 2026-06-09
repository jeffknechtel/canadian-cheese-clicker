/**
 * Branded type for multiplicative modifiers.
 * Neutral element: 1.0 (no change)
 * Operation: base * multiplier
 */
export type Multiplier = number & { readonly __brand: 'Multiplier' };

/**
 * Branded type for additive bonuses.
 * Neutral element: 0 (no change)
 * Operation: base + bonus OR base * (1 + bonus)
 */
export type Bonus = number & { readonly __brand: 'Bonus' };

export const Multiplier = {
  /** Create a Multiplier from a raw number. */
  of(value: number): Multiplier {
    return value as Multiplier;
  },

  /** Neutral element (no change). */
  identity(): Multiplier {
    return 1 as Multiplier;
  },

  /** Combine multipliers: a * b */
  combine(a: Multiplier, b: Multiplier): Multiplier {
    return (a * b) as Multiplier;
  },

  /** Apply multiplier to a base value. */
  apply(base: number, multiplier: Multiplier): number {
    return base * multiplier;
  },
} as const;

export const Bonus = {
  /** Create a Bonus from a raw decimal (0.1 = 10%). */
  of(value: number): Bonus {
    return value as Bonus;
  },

  /** Create a Bonus from a percentage (10 = 10%). */
  ofPercent(percent: number): Bonus {
    return (percent / 100) as Bonus;
  },

  /** Neutral element (no change). */
  identity(): Bonus {
    return 0 as Bonus;
  },

  /** Combine bonuses: a + b */
  combine(a: Bonus, b: Bonus): Bonus {
    return (a + b) as Bonus;
  },

  /** Convert bonus to multiplier: 1 + bonus */
  toMultiplier(bonus: Bonus): Multiplier {
    return (1 + bonus) as Multiplier;
  },

  /** Apply bonus additively to a base value. */
  applyAdditive(base: number, bonus: Bonus): number {
    return base + bonus;
  },

  /** Apply bonus as a multiplier: base * (1 + bonus) */
  applyMultiplicative(base: number, bonus: Bonus): number {
    return base * (1 + bonus);
  },
} as const;

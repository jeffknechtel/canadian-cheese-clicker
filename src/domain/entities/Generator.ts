import Decimal from 'decimal.js';
import type { Generator as GeneratorData } from '../../types/game';
import { BaseEntity } from './BaseEntity';

/**
 * Rich domain model for Generator.
 * Encapsulates cost calculation and CPS contribution logic.
 */
export class Generator extends BaseEntity<GeneratorData> implements GeneratorData {
  get name(): string {
    return this.data.name;
  }
  get description(): string {
    return this.data.description;
  }
  get baseCost(): Decimal {
    return this.data.baseCost;
  }
  get baseCps(): Decimal {
    return this.data.baseCps;
  }
  get costMultiplier(): number {
    return this.data.costMultiplier;
  }
  get icon(): string | undefined {
    return this.data.icon;
  }

  protected withData(updates: Partial<GeneratorData>): this {
    return new Generator({ ...this.data, ...updates }) as this;
  }

  /**
   * Calculate cost to buy `count` generators when `owned` are already owned.
   * Geometric series: baseCost * m^owned * (m^count - 1) / (m - 1)
   */
  getCost(owned: number, count: number = 1): Decimal {
    const m = this.costMultiplier;
    const mPowOwned = new Decimal(m).pow(owned);
    const mPowCount = new Decimal(m).pow(count);
    const numerator = mPowCount.minus(1);
    const denominator = new Decimal(m).minus(1);

    if (denominator.isZero()) {
      return this.baseCost.mul(count).floor();
    }

    return this.baseCost.mul(mPowOwned).mul(numerator.div(denominator)).floor();
  }

  /**
   * Calculate CPS contribution from this generator type.
   */
  getCps(owned: number, multiplier: number = 1): Decimal {
    if (owned <= 0) return new Decimal(0);
    return this.baseCps.mul(owned).mul(multiplier);
  }

  /**
   * Calculate maximum affordable count given available curds.
   */
  getMaxAffordable(owned: number, curds: Decimal): number {
    let low = 0;
    let high = 100000;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (curds.gte(this.getCost(owned, mid))) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  /**
   * Factory method to create from plain data
   */
  static fromDefinition(data: GeneratorData): Generator {
    return new Generator(data);
  }
}
